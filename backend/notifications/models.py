"""Notification queue model."""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class Notification(models.Model):
    class Channel(models.TextChoices):
        EMAIL    = "EMAIL",    "Email"
        SMS      = "SMS",      "SMS"
        WHATSAPP = "WHATSAPP", "WhatsApp"

    class Status(models.TextChoices):
        QUEUED             = "QUEUED",             "Queued"
        SENT               = "SENT",               "Sent"
        FAILED             = "FAILED",             "Failed"
        PERMANENTLY_FAILED = "PERMANENTLY_FAILED", "Permanently Failed"

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user          = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    case          = models.ForeignKey("cases.Case", on_delete=models.SET_NULL, null=True, blank=True, related_name="notifications")
    channel       = models.CharField(max_length=20, choices=Channel.choices, db_index=True)
    subject       = models.CharField(max_length=255, blank=True)
    message       = models.TextField()
    status        = models.CharField(max_length=30, choices=Status.choices, default=Status.QUEUED, db_index=True)
    attempt_count = models.PositiveSmallIntegerField(default=0)
    scheduled_for = models.DateTimeField(default=timezone.now)
    sent_at       = models.DateTimeField(null=True, blank=True)
    created_at    = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.channel}] {self.status} → {self.user.email}"
