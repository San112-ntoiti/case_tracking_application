"""
Notification service functions.
queue_* functions create Notification records (QUEUED).
Celery tasks dispatch them asynchronously.
"""
from django.conf import settings
from django.utils import timezone
from .models import Notification


def _maybe_dispatch_notifications():
    if settings.DEBUG:
        try:
            from .tasks import dispatch_pending_notifications
            dispatch_pending_notifications.delay()
        except Exception:
            pass


def queue_case_update_notification(user, case, message):
    """Creates QUEUED notification records for all enabled channels."""
    subject = f"Case Update: {case.case_number}"
    channels = []
    if user.notify_email:    channels.append(Notification.Channel.EMAIL)
    if user.notify_sms:      channels.append(Notification.Channel.SMS)
    if user.notify_whatsapp: channels.append(Notification.Channel.WHATSAPP)

    for channel in channels:
        # Business Rule BR-19: Suppress duplicates
        existing = Notification.objects.filter(
            user=user, case=case, channel=channel,
            status=Notification.Status.SENT,
            message=message,
        ).exists()
        if not existing:
            Notification.objects.create(
                user=user, case=case, channel=channel,
                subject=subject, message=message,
            )
    _maybe_dispatch_notifications()


def queue_hearing_reminder(user, case, hours_before):
    """Creates a hearing reminder notification."""
    message = (
        f"Reminder: Case {case.case_number} has a hearing scheduled for "
        f"{case.next_hearing_date}. Court: {case.court.name}."
    )
    queue_case_update_notification(user, case, message)
