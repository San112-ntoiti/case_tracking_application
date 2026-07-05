from rest_framework import generics
from accounts.permissions import IsSystemAdmin
from .models import AuditLog
from .serializers import AuditLogSerializer

class AuditLogListView(generics.ListAPIView):
    """GET /api/v1/admin-panel/audit-logs/ — System Admin only."""
    serializer_class   = AuditLogSerializer
    permission_classes = [IsSystemAdmin]
    filterset_fields   = ["action", "entity_type"]
    search_fields      = ["actor__email", "entity_id"]
    ordering_fields    = ["created_at"]
    ordering           = ["-created_at"]

    def get_queryset(self):
        qs = AuditLog.objects.select_related("actor").all()
        date_from = self.request.query_params.get("date_from")
        date_to   = self.request.query_params.get("date_to")
        if date_from: qs = qs.filter(created_at__date__gte=date_from)
        if date_to:   qs = qs.filter(created_at__date__lte=date_to)
        return qs
