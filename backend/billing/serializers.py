"""Billing serializers."""
from rest_framework import serializers
from .models import Product, Order, Subscription


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Product
        fields = ["id", "name", "description", "price", "currency", "billing_type", "duration_days"]


class OrderCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Order
        fields = ["id", "product", "provider"]

    def create(self, validated_data):
        product = validated_data["product"]
        validated_data["total_amount"] = product.price
        validated_data["currency"]     = product.currency
        validated_data["status"]       = Order.Status.PENDING
        return super().create(validated_data)


class OrderSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model  = Order
        fields = ["id", "product_name", "total_amount", "currency", "status", "provider", "created_at"]


class SubscriptionSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model  = Subscription
        fields = ["id", "product_name", "status", "starts_at", "ends_at", "days_remaining"]

    def get_days_remaining(self, obj) -> int:
        from django.utils import timezone
        delta = obj.ends_at - timezone.now()
        return max(0, delta.days)


class RevenueReportSerializer(serializers.Serializer):
    total_orders  = serializers.IntegerField()
    paid_orders   = serializers.IntegerField()
    failed_orders = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency      = serializers.CharField()


class AdminSubscriptionSerializer(serializers.ModelSerializer):
    """Extended subscription serializer for system admin view — includes user email."""
    product_name   = serializers.CharField(source="product.name", read_only=True)
    days_remaining = serializers.SerializerMethodField()
    user           = serializers.SerializerMethodField()

    class Meta:
        model  = Subscription
        fields = ["id", "user", "product_name", "status", "starts_at", "ends_at", "days_remaining"]

    def get_days_remaining(self, obj) -> int:
        from django.utils import timezone
        delta = obj.ends_at - timezone.now()
        return max(0, delta.days)

    def get_user(self, obj) -> dict:
        return {"id": str(obj.user.id), "email": obj.user.email, "full_name": obj.user.full_name}


class AdminOrderSerializer(serializers.ModelSerializer):
    """Extended order serializer for system admin view — includes user email."""
    product_name = serializers.CharField(source="product.name", read_only=True)
    user         = serializers.SerializerMethodField()

    class Meta:
        model  = Order
        fields = ["id", "user", "product_name", "total_amount", "currency",
                  "status", "provider", "provider_reference", "created_at"]

    def get_user(self, obj) -> dict:
        return {"id": str(obj.user.id), "email": obj.user.email}
