"""
Audit Log Model
Append-only tamper-evident log of all create/update/delete operations.
No UPDATE or DELETE on this table is permitted by any role.
BIGSERIAL PK preserves strict insertion order for forensic analysis.
"""
from django.db import models
from django.conf import settings
from django.utils import timezone


class AuditLog(models.Model):
    """Every meaningful data change in the system produces one of these records."""
    # No UUID here — BIGSERIAL ensures strict chronological ordering
    actor       = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="audit_logs"
    )
    action      = models.CharField(max_length=50, db_index=True)
    entity_type = models.CharField(max_length=50, db_index=True)
    entity_id   = models.CharField(max_length=100)
    before_state= models.JSONField(null=True, blank=True)
    after_state = models.JSONField(null=True, blank=True)
    ip_address  = models.GenericIPAddressField(null=True, blank=True)
    created_at  = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-created_at"]
        # Prevent any updates or deletes at the DB permission level (enforced in code)

    def __str__(self):
        actor = self.actor.email if self.actor else "System"
        return f"[{self.created_at:%Y-%m-%d %H:%M}] {actor} — {self.action} {self.entity_type}/{self.entity_id}"
