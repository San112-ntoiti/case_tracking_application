from rest_framework import serializers
from .models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.SerializerMethodField()
    class Meta:
        model  = AuditLog
        fields = ["id","actor_email","action","entity_type","entity_id","before_state","after_state","ip_address","created_at"]
    def get_actor_email(self, obj) -> str:
        return obj.actor.email if obj.actor else "System"
