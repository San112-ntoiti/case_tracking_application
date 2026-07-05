"""
Case signals — automatically write audit log entries whenever
a Case, CaseEvent, or Document is created/updated.
This keeps audit logging out of view logic (Single Responsibility Principle).
"""
import json
import uuid
import datetime
import decimal

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.forms.models import model_to_dict

from .models import Case, CaseEvent, Document
from audit.services import log_action
from audit.middleware import get_current_request

# In-memory cache of pre-save state, keyed by pk, to compute before/after diffs
_pre_save_cache = {}


def _json_safe(data):
    """
    Recursively converts model_to_dict() output into JSON-serialisable types.
    Handles date, datetime, UUID, and Decimal — the common offenders when
    dumping Django model fields straight into a JSONField.
    """
    if data is None:
        return None
    return json.loads(json.dumps(data, default=_json_default))


def _json_default(obj):
    if isinstance(obj, (datetime.date, datetime.datetime)):
        return obj.isoformat()
    if isinstance(obj, uuid.UUID):
        return str(obj)
    if isinstance(obj, decimal.Decimal):
        return float(obj)
    return str(obj)  # Fallback: never let serialization crash the request


@receiver(pre_save, sender=Case)
def cache_case_before_state(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = Case.objects.get(pk=instance.pk)
            _pre_save_cache[instance.pk] = _json_safe(
                model_to_dict(old, exclude=["id", "court", "parties", "advocates", "documents"])
            )
        except Case.DoesNotExist:
            _pre_save_cache[instance.pk] = None


@receiver(post_save, sender=Case)
def audit_case_save(sender, instance, created, **kwargs):
    request = get_current_request()
    actor   = getattr(request, "user", None) if request else None
    actor   = actor if actor and actor.is_authenticated else None

    after_state = _json_safe(
        model_to_dict(instance, exclude=["id", "court", "parties", "advocates", "documents"])
    )

    if created:
        log_action(actor, "CREATE_CASE", "Case", instance.id, before=None, after=after_state)
    else:
        before_state = _pre_save_cache.pop(instance.pk, None)
        log_action(actor, "UPDATE_CASE", "Case", instance.id, before=before_state, after=after_state)


@receiver(post_save, sender=CaseEvent)
def audit_case_event(sender, instance, created, **kwargs):
    if created:
        request = get_current_request()
        actor   = getattr(request, "user", None) if request else instance.created_by
        log_action(
            actor, "CREATE_CASE_EVENT", "CaseEvent", instance.id,
            after={"case": str(instance.case_id), "event_type": instance.event_type, "event_date": str(instance.event_date)},
        )


@receiver(post_save, sender=Document)
def audit_document_upload(sender, instance, created, **kwargs):
    if created:
        log_action(
            instance.uploaded_by, "UPLOAD_DOCUMENT", "Document", instance.id,
            after={"case": str(instance.case_id), "title": instance.title, "access_level": instance.access_level},
        )
