"""Notification list for authenticated users."""
from rest_framework import generics, permissions
from .models import Notification
from .serializers import NotificationSerializer

class NotificationListView(generics.ListAPIView):
    serializer_class   = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Notification.objects.none()
        return Notification.objects.filter(user=self.request.user).select_related("case")


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone


class NotificationPreferencesView(APIView):
    """GET/PATCH /api/v1/notifications/preferences/ — user's channel opt-in settings."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "notify_email":    user.notify_email,
            "notify_sms":      user.notify_sms,
            "notify_whatsapp": user.notify_whatsapp,
        })

    def patch(self, request):
        user = request.user
        allowed = {"notify_email", "notify_sms", "notify_whatsapp"}
        for field in allowed:
            if field in request.data:
                setattr(user, field, bool(request.data[field]))
        user.save(update_fields=list(allowed))
        return Response({
            "notify_email":    user.notify_email,
            "notify_sms":      user.notify_sms,
            "notify_whatsapp": user.notify_whatsapp,
        })


class MarkNotificationReadView(APIView):
    """POST /api/v1/notifications/{id}/mark-sent/ — mark a queued notif as sent (demo trigger)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, user=request.user)
            notif.status = Notification.Status.SENT
            notif.sent_at = timezone.now()
            notif.save(update_fields=["status", "sent_at"])
            return Response({"message": "Notification marked sent."})
        except Notification.DoesNotExist:
            return Response({"error": True, "message": "Not found."}, status=status.HTTP_404_NOT_FOUND)


class TriggerTestNotificationView(APIView):
    """
    POST /api/v1/notifications/test/
    Creates a test notification for the current user — lets the demo
    show the full notification pipeline without waiting for Celery.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from notifications.services import queue_case_update_notification
        from cases.models import TrackedCase
        tracked = TrackedCase.objects.filter(user=request.user).select_related("case").first()
        if not tracked:
            return Response({"error": True, "message": "Track a case first to send a test notification."}, status=400)
        queue_case_update_notification(
            request.user, tracked.case,
            f"Test notification: case {tracked.case.case_number} is being monitored."
        )
        # In demo mode, immediately mark as SENT so it shows up visually
        notif = Notification.objects.filter(user=request.user).order_by("-created_at").first()
        if notif:
            notif.status = Notification.Status.SENT
            notif.sent_at = timezone.now()
            notif.save(update_fields=["status", "sent_at"])
        return Response({"message": "Test notification sent and visible in your notification center."})
