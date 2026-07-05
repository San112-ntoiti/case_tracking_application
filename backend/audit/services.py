"""
Audit service — call log_action() anywhere to create an audit record.
"""
import logging
from .models import AuditLog
from .middleware import get_current_request

logger = logging.getLogger(__name__)


def log_action(actor, action, entity_type, entity_id, before=None, after=None):
    """
    Creates an AuditLog record.
    Usage:
        log_action(request.user, "UPDATE_CASE", "Case", str(case.id),
                   before=old_data, after=new_data)
    """
    request    = get_current_request()
    ip_address = None
    if request:
        x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        ip_address  = x_forwarded.split(",")[0] if x_forwarded else request.META.get("REMOTE_ADDR")

    try:
        AuditLog.objects.create(
            actor       = actor,
            action      = action,
            entity_type = entity_type,
            entity_id   = str(entity_id),
            before_state= before,
            after_state = after,
            ip_address  = ip_address,
        )
    except Exception as e:
        # Never let audit logging crash the main request
        logger.error(f"Audit log write failed: {e}")
