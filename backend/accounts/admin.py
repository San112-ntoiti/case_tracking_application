from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin config for custom User model — used for manual data inspection/seeding."""
    list_display  = ("email", "full_name", "role", "is_active", "created_at")
    list_filter   = ("role", "is_active", "email_verified")
    search_fields = ("email", "full_name", "phone")
    ordering      = ("-created_at",)
    readonly_fields = ("id", "created_at", "updated_at", "last_login_ip")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal Info", {"fields": ("full_name", "phone", "role")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "email_verified")}),
        ("Notification Preferences", {"fields": ("notify_email", "notify_sms", "notify_whatsapp")}),
        ("Important dates", {"fields": ("created_at", "updated_at", "last_login_ip")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "full_name", "password1", "password2", "role"),
        }),
    )
