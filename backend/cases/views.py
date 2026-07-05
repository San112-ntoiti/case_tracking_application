"""
Cases Views
Search, detail, tracking, and Court Admin management of case records.
"""
from django.conf import settings
from django.db.models import Prefetch
from django.utils import timezone
from rest_framework import generics, status, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from accounts.permissions import IsCourtAdmin
from .models import Case, Court, CaseEvent, Document, TrackedCase
from .serializers import (
    CaseListSerializer, CaseDetailSerializer, CaseWriteSerializer,
    CaseEventSerializer, CaseEventWriteSerializer,
    DocumentSerializer, DocumentUploadSerializer,
    TrackedCaseSerializer, CourtSerializer,
)
from .filters import CaseFilter


# ─── Public Case Endpoints ────────────────────────────────────────────────────

class CaseListView(generics.ListAPIView):
    """
    GET /api/v1/cases/
    Public search endpoint. No authentication required.
    Supports filtering via CaseFilter and full-text search via SearchFilter.
    Uses select_related to avoid N+1 queries on court data.
    """
    serializer_class   = CaseListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class    = CaseFilter
    ordering_fields    = ["case_number", "status", "next_hearing_date", "created_at"]
    ordering           = ["-created_at"]

    def get_queryset(self):
        return Case.objects.select_related("court").all()


class CaseDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/cases/{id}/
    Returns full case detail including parties, advocates, and documents.
    Uses prefetch_related to batch-load all related data in 4 queries total
    instead of N+1 queries for N documents.
    """
    serializer_class   = CaseDetailSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Case.objects.select_related("court").prefetch_related(
            "parties", "advocates", "documents"
        )


class CaseEventListView(generics.ListAPIView):
    """GET /api/v1/cases/{case_id}/events/ — Chronological event history."""
    serializer_class   = CaseEventSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return CaseEvent.objects.none()
        return CaseEvent.objects.filter(
            case_id=self.kwargs["case_id"]
        ).select_related("created_by").order_by("-event_date", "-created_at")


# ─── Tracked Cases ────────────────────────────────────────────────────────────

class TrackedCaseListView(generics.ListCreateAPIView):
    """
    GET  /api/v1/cases/tracked/    — List user's tracked cases
    POST /api/v1/cases/tracked/    — Track a new case

    Business Rule BR-03 enforced here:
    Free users are limited to FREE_TIER_TRACKED_CASE_LIMIT tracked cases.
    """
    serializer_class   = TrackedCaseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return TrackedCase.objects.none()
        return (
            TrackedCase.objects
            .filter(user=self.request.user)
            .select_related("case__court")
            .order_by("-created_at")
        )

    def create(self, request, *args, **kwargs):
        user     = request.user
        case_id  = request.data.get("case")

        # Prevent duplicate tracking
        if TrackedCase.objects.filter(user=user, case_id=case_id).exists():
            return Response(
                {"error": True, "message": "You are already tracking this case."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Enforce free-tier limit (BR-03)
        limit = settings.FREE_TIER_TRACKED_CASE_LIMIT
        if not user.has_active_subscription() and user.tracked_case_count() >= limit:
            return Response(
                {
                    "error": True,
                    "message": f"Free users can track up to {limit} case(s). Subscribe for unlimited tracking.",
                    "upgrade_required": True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TrackedCaseDeleteView(generics.DestroyAPIView):
    """DELETE /api/v1/cases/tracked/{id}/"""
    serializer_class   = TrackedCaseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return TrackedCase.objects.none()
        return TrackedCase.objects.filter(user=self.request.user)


# ─── Court Admin Case Management ─────────────────────────────────────────────

class AdminCaseListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/cases/admin/       — List all cases (admin view)
    POST /api/v1/cases/admin/       — Create a new case
    """
    permission_classes = [IsCourtAdmin]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class    = CaseFilter

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CaseWriteSerializer
        return CaseDetailSerializer

    def get_queryset(self):
        return Case.objects.select_related("court").prefetch_related(
            "parties", "advocates"
        ).order_by("-created_at")


class AdminCaseDetailView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/v1/cases/admin/{id}/   — Retrieve case for editing
    PATCH /api/v1/cases/admin/{id}/   — Update case fields
    On successful update, triggers notifications to premium trackers.
    """
    permission_classes = [IsCourtAdmin]
    queryset = Case.objects.all()

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return CaseWriteSerializer
        return CaseDetailSerializer

    def perform_update(self, serializer):
        case = self.get_object()
        old_values = {
            "status": case.status,
            "verified": case.verified,
            "next_hearing_date": case.next_hearing_date,
            "next_mention_date": case.next_mention_date,
            "judge_name": case.judge_name,
            "public_summary": case.public_summary,
        }
        instance = serializer.save()

        if "verified" in serializer.validated_data:
            if serializer.validated_data["verified"]:
                instance.verified_by = self.request.user
                instance.verified_at = timezone.now()
            else:
                instance.verified_by = None
                instance.verified_at = None
            instance.save(update_fields=["verified", "verified_by", "verified_at"])

        changed_fields = []
        for field, old_value in old_values.items():
            new_value = getattr(instance, field)
            if old_value != new_value:
                changed_fields.append((field, old_value, new_value))

        if changed_fields:
            changes = []
            for field, old_value, new_value in changed_fields:
                changes.append(
                    f"{field.replace('_', ' ').capitalize()} changed from '{old_value or '—'}' to '{new_value or '—'}'"
                )
            description = "Case updated: " + "; ".join(changes)
            instance.notify_trackers(description)


class AdminCaseEventCreateView(generics.CreateAPIView):
    """POST /api/v1/cases/admin/{case_id}/events/"""
    serializer_class   = CaseEventWriteSerializer
    permission_classes = [IsCourtAdmin]

    def perform_create(self, serializer):
        case = Case.objects.get(pk=self.kwargs["case_id"])
        event = serializer.save(case=case)
        # Notify trackers of the new event
        description = f"New event recorded: {event.event_type} on {event.event_date}."
        case.notify_trackers(description)


class AdminDocumentUploadView(generics.CreateAPIView):
    """POST /api/v1/cases/admin/{case_id}/documents/"""
    serializer_class   = DocumentUploadSerializer
    permission_classes = [IsCourtAdmin]

    def perform_create(self, serializer):
        case = Case.objects.get(pk=self.kwargs["case_id"])
        document = serializer.save(case=case, uploaded_by=self.request.user)
        description = f"Document uploaded: {document.title}."
        case.notify_trackers(description)


class CourtListView(generics.ListAPIView):
    """GET /api/v1/cases/courts/ — List all courts for dropdown menus."""
    serializer_class   = CourtSerializer
    permission_classes = [permissions.AllowAny]
    queryset           = Court.objects.all().order_by("name")
    pagination_class   = None   # Return all courts unpaginated for dropdowns
