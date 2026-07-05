from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ("user", "channel", "status", "attempt_count", "sent_at", "created_at")
    list_filter   = ("channel", "status")
    search_fields = ("user__email",)
    readonly_fields = ("id", "created_at")
