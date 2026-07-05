from django.contrib import admin
from .models import Product, Order, Subscription


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "price", "currency", "billing_type", "is_active")
    list_filter  = ("billing_type", "is_active")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display  = ("id", "user", "product", "total_amount", "status", "provider", "created_at")
    list_filter   = ("status", "provider")
    search_fields = ("user__email", "provider_reference")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display  = ("user", "product", "status", "starts_at", "ends_at")
    list_filter   = ("status",)
    search_fields = ("user__email",)
