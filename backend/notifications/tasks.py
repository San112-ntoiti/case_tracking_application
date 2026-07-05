"""
Notification dispatch Celery tasks.
Each task fetches QUEUED notifications and dispatches them.
On failure, increments attempt_count. After 3 attempts marks PERMANENTLY_FAILED.
"""
import logging
from celery import shared_task
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)
MAX_RETRIES = 3


@shared_task
def send_hearing_reminders():
    """
    Hourly task: find cases with hearings in the next 24h or 7 days
    and queue notifications for premium users tracking them.
    """
    import datetime
    from cases.models import Case, TrackedCase

    now = timezone.now().date()
    for hours in settings.HEARING_REMINDER_HOURS_BEFORE:
        target_date = now + datetime.timedelta(hours=hours)
        cases = Case.objects.filter(next_hearing_date=target_date)
        for case in cases:
            trackers = TrackedCase.objects.filter(case=case).select_related("user")
            for tracker in trackers:
                user = tracker.user
                if user.has_active_subscription():
                    from notifications.services import queue_hearing_reminder
                    queue_hearing_reminder(user, case, hours)


@shared_task
def dispatch_pending_notifications():
    """
    Processes QUEUED notifications, dispatching each via its channel.
    Called on a schedule or triggered immediately after queuing.
    """
    from .models import Notification
    pending = Notification.objects.filter(
        status=Notification.Status.QUEUED,
        scheduled_for__lte=timezone.now(),
    ).select_related("user", "case")[:100]

    for notif in pending:
        try:
            if notif.channel == Notification.Channel.EMAIL:
                _send_email(notif)
            elif notif.channel == Notification.Channel.SMS:
                _send_sms(notif)
            elif notif.channel == Notification.Channel.WHATSAPP:
                _send_whatsapp(notif)

            notif.status  = Notification.Status.SENT
            notif.sent_at = timezone.now()
            notif.save(update_fields=["status", "sent_at", "attempt_count"])

        except Exception as e:
            logger.error(f"Notification {notif.id} dispatch error: {e}")
            notif.attempt_count += 1
            if notif.attempt_count >= MAX_RETRIES:
                notif.status = Notification.Status.PERMANENTLY_FAILED
            else:
                notif.status = Notification.Status.FAILED
            notif.save(update_fields=["status", "attempt_count"])


def _send_email(notif):
    send_mail(
        subject      = notif.subject or "Court Case Update",
        message      = notif.message,
        from_email   = settings.DEFAULT_FROM_EMAIL,
        recipient_list=[notif.user.email],
        fail_silently=False,
    )
    logger.info(f"Email sent to {notif.user.email}")


def _send_sms(notif):
    """Africa's Talking SMS dispatch."""
    import africastalking
    africastalking.initialize(
        username=settings.AFRICASTALKING_USERNAME,
        api_key=settings.AFRICASTALKING_API_KEY,
    )
    sms = africastalking.SMS
    response = sms.send(
        message=notif.message,
        recipients=[notif.user.phone],
        sender_id=settings.AFRICASTALKING_SENDER_ID,
    )
    logger.info(f"SMS sent: {response}")


def _send_whatsapp(notif):
    """Twilio WhatsApp dispatch."""
    from twilio.rest import Client
    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    client.messages.create(
        body=notif.message,
        from_=settings.TWILIO_WHATSAPP_FROM,
        to=f"whatsapp:{notif.user.phone}",
    )
    logger.info(f"WhatsApp sent to {notif.user.phone}")
