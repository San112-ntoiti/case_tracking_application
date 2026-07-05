"""
Cases Models
The core domain of the system. Every other module (billing, notifications,
audit) exists to serve these models.
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class Court(models.Model):
    """Represents a Kenyan court station."""

    class Level(models.TextChoices):
        SUPREME     = "SUPREME",     "Supreme Court"
        APPEAL      = "APPEAL",      "Court of Appeal"
        HIGH        = "HIGH",        "High Court"
        EMPLOYMENT  = "EMPLOYMENT",  "Employment & Labour Relations Court"
        ENVIRONMENT = "ENVIRONMENT", "Environment & Land Court"
        MAGISTRATE  = "MAGISTRATE",  "Magistrate Court"
        KADHIS      = "KADHIS",      "Kadhis Court"

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name       = models.CharField(max_length=255, unique=True)
    station    = models.CharField(max_length=255, blank=True)
    county     = models.CharField(max_length=100, blank=True)
    level      = models.CharField(max_length=20, choices=Level.choices, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table  = "courts"
        ordering  = ["name"]

    def __str__(self):
        return self.name


class Case(models.Model):
    """
    Core case record.
    data_source tracks how the record was created:
    - MANUAL: entered by a Court Administrator via the admin portal
    - API: imported via an external judiciary data connector (future)
    - CSV: bulk-imported from a spreadsheet
    This design allows the import mechanism to change without schema changes.
    """

    class Status(models.TextChoices):
        FILED   = "FILED",   "Filed"
        MENTION = "MENTION", "Mention"
        HEARING = "HEARING", "Hearing"
        RULING  = "RULING",  "Ruling"
        CLOSED  = "CLOSED",  "Closed"
        STAYED  = "STAYED",  "Stayed"

    class DataSource(models.TextChoices):
        MANUAL = "MANUAL", "Manual Entry"
        API    = "API",    "Judiciary API"
        CSV    = "CSV",    "CSV Import"

    id                = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_number       = models.CharField(max_length=100, unique=True, db_index=True)
    case_type         = models.CharField(max_length=100)
    court             = models.ForeignKey(Court, on_delete=models.PROTECT, related_name="cases")
    judge_name        = models.CharField(max_length=255, blank=True)
    status            = models.CharField(max_length=20, choices=Status.choices, default=Status.FILED, db_index=True)
    next_mention_date = models.DateField(null=True, blank=True, db_index=True)
    next_hearing_date = models.DateField(null=True, blank=True, db_index=True)
    public_summary    = models.TextField(blank=True)
    data_source       = models.CharField(max_length=10, choices=DataSource.choices, default=DataSource.MANUAL)
    created_at        = models.DateTimeField(default=timezone.now)
    updated_at        = models.DateTimeField(auto_now=True)
    verified          = models.BooleanField(default=False, db_index=True)
    verified_by       = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="verified_cases",
    )
    verified_at       = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "cases"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.case_number} ({self.court})"

    def notify_trackers(self, event_description):
        """
        Queues notifications for all premium users tracking this case.
        Called by the signal after a case update is saved.
        This method does NOT send directly — it queues to the
        notifications table for Celery to pick up asynchronously.
        """
        from notifications.services import queue_case_update_notification
        trackers = self.tracked_by.select_related("user").filter(
            user__is_active=True
        )
        for tracker in trackers:
            user = tracker.user
            if user.has_active_subscription():
                queue_case_update_notification(user, self, event_description)


class CaseParty(models.Model):
    """A party (plaintiff, defendant, etc.) in a case."""

    class Role(models.TextChoices):
        PLAINTIFF        = "PLAINTIFF",        "Plaintiff"
        DEFENDANT        = "DEFENDANT",        "Defendant"
        ACCUSED          = "ACCUSED",          "Accused"
        APPLICANT        = "APPLICANT",        "Applicant"
        RESPONDENT       = "RESPONDENT",       "Respondent"
        PETITIONER       = "PETITIONER",       "Petitioner"
        INTERESTED_PARTY = "INTERESTED_PARTY", "Interested Party"

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case       = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="parties")
    party_name = models.CharField(max_length=255, db_index=True)
    party_role = models.CharField(max_length=20, choices=Role.choices)

    class Meta:
        db_table = "case_parties"

    def __str__(self):
        return f"{self.party_name} ({self.party_role}) in {self.case.case_number}"


class CaseAdvocate(models.Model):
    """An advocate appearing in a case."""
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case          = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="advocates")
    advocate_name = models.CharField(max_length=255, db_index=True)
    law_firm      = models.CharField(max_length=255, blank=True)
    email         = models.EmailField(blank=True)
    phone         = models.CharField(max_length=20, blank=True)

    class Meta:
        db_table = "case_advocates"

    def __str__(self):
        return f"{self.advocate_name} in {self.case.case_number}"


class CaseEvent(models.Model):
    """
    A recorded event in a case's history.
    This is the audit trail of everything that happened:
    hearings, adjournments, rulings, filings.
    Immutable once created — Court Admins add new events, never edit old ones.
    """

    class EventType(models.TextChoices):
        MENTION     = "MENTION",     "Mention"
        HEARING     = "HEARING",     "Hearing"
        RULING      = "RULING",      "Ruling"
        ADJOURNMENT = "ADJOURNMENT", "Adjournment"
        UPDATE      = "UPDATE",      "Case Update"
        FILING      = "FILING",      "Document Filing"
        CLOSED      = "CLOSED",      "Case Closed"

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case       = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="events")
    event_date = models.DateField()
    event_type = models.CharField(max_length=20, choices=EventType.choices, db_index=True)
    notes      = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="case_events_created"
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "case_events"
        ordering = ["-event_date", "-created_at"]

    def __str__(self):
        return f"{self.event_type} on {self.event_date} for {self.case.case_number}"


class Document(models.Model):
    """
    A document attached to a case.
    access_level = PREMIUM means only subscribed users can download it.
    File is stored in MEDIA_ROOT/documents/case_id/.
    """

    class AccessLevel(models.TextChoices):
        PUBLIC  = "PUBLIC",  "Public"
        PREMIUM = "PREMIUM", "Premium Only"

    def _upload_path(instance, filename):
        return f"documents/{instance.case.id}/{filename}"

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case         = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="documents")
    title        = models.CharField(max_length=255)
    file         = models.FileField(upload_to=_upload_path)
    file_size_kb = models.PositiveIntegerField(null=True, blank=True)
    access_level = models.CharField(max_length=10, choices=AccessLevel.choices, default=AccessLevel.PUBLIC)
    uploaded_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="documents_uploaded"
    )
    created_at   = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "documents"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} [{self.access_level}] for {self.case.case_number}"

    def is_accessible_to(self, user):
        """Returns True if the user can download this document."""
        if self.access_level == self.AccessLevel.PUBLIC:
            return True
        return user and user.is_authenticated and user.has_active_subscription()


class TrackedCase(models.Model):
    """
    Junction table: a user tracking a case.
    UNIQUE(user, case) enforced at both DB and application layer.
    """
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user       = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tracked_cases"
    )
    case       = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="tracked_by")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table    = "tracked_cases"
        unique_together = [("user", "case")]
        ordering    = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} tracking {self.case.case_number}"
