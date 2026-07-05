"""Billing background tasks."""
from celery import shared_task
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@shared_task
def expire_subscriptions():
    """
    Nightly task: mark ACTIVE subscriptions as EXPIRED when ends_at has passed.
    Runs every 24 hours via Celery Beat (configured in settings.base).
    """
    from .models import Subscription
    expired = Subscription.objects.filter(
        status=Subscription.Status.ACTIVE,
        ends_at__lte=timezone.now(),
    )
    count = expired.update(status=Subscription.Status.EXPIRED)
    logger.info(f"Expired {count} subscriptions.")
    return count
