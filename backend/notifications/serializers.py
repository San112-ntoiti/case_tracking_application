from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    case_number = serializers.SerializerMethodField()
    class Meta:
        model  = Notification
        fields = ["id", "channel", "subject", "message", "status", "sent_at", "created_at", "case_number"]

    def get_case_number(self, obj) -> str | None:
        return obj.case.case_number if obj.case else None
