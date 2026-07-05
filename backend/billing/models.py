"""
Billing Models
Handles products, orders, and subscriptions.
The Order record is created BEFORE payment is attempted, then
updated via the M-Pesa callback or mock confirmation endpoint.
This ensures we never lose a payment record even if the callback fails.
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class Product(models.Model):
    """A purchasable subscription plan."""

    class BillingType(models.TextChoices):
        SUBSCRIPTION = "SUBSCRIPTION", "Recurring Subscription"
        ONE_TIME     = "ONE_TIME",     "One-Time Purchase"

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name          = models.CharField(max_length=100, unique=True)
    description   = models.TextField(blank=True)
    price         = models.DecimalField(max_digits=10, decimal_places=2)
    currency      = models.CharField(max_length=3, default="KES")
    billing_type  = models.CharField(max_length=20, choices=BillingType.choices)
    duration_days = models.PositiveIntegerField(null=True, blank=True)
    is_active     = models.BooleanField(default=True)
    created_at    = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "products"
        ordering = ["price"]

    def __str__(self):
        return f"{self.name} — {self.currency} {self.price}"


class Order(models.Model):
    """
    Payment order record.
    Created as PENDING, then updated to PAID or FAILED via callback.
    provider_metadata stores the raw JSON from Safaricom for audit purposes.
    """

    class Status(models.TextChoices):
        PENDING  = "PENDING",  "Pending"
        PAID     = "PAID",     "Paid"
        FAILED   = "FAILED",   "Failed"
        REFUNDED = "REFUNDED", "Refunded"

    class Provider(models.TextChoices):
        MPESA  = "MPESA",  "M-Pesa Daraja"
        STRIPE = "STRIPE", "Stripe"
        MOCK   = "MOCK",   "Mock (Demo)"

    id                 = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user               = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders")
    product            = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="orders")
    total_amount       = models.DecimalField(max_digits=10, decimal_places=2)
    currency           = models.CharField(max_length=3, default="KES")
    status             = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    provider           = models.CharField(max_length=20, choices=Provider.choices)
    provider_reference = models.CharField(max_length=255, blank=True)  # CheckoutRequestID / Stripe PaymentIntent ID
    provider_metadata  = models.JSONField(null=True, blank=True)        # Full raw callback JSON
    created_at         = models.DateTimeField(default=timezone.now)
    updated_at         = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order {self.id} — {self.provider} {self.status}"

    def mark_paid(self, reference="", metadata=None):
        self.status             = self.Status.PAID
        self.provider_reference = reference or self.provider_reference
        self.provider_metadata  = metadata or self.provider_metadata
        self.save(update_fields=["status", "provider_reference", "provider_metadata", "updated_at"])
        self._activate_subscription()

    def mark_failed(self, metadata=None):
        self.status            = self.Status.FAILED
        self.provider_metadata = metadata or self.provider_metadata
        self.save(update_fields=["status", "provider_metadata", "updated_at"])

    def _activate_subscription(self):
        """Creates or re-activates subscription upon successful payment."""
        from datetime import timedelta
        duration = self.product.duration_days or 30
        Subscription.objects.create(
            user       = self.user,
            product    = self.product,
            order      = self,
            status     = Subscription.Status.ACTIVE,
            starts_at  = timezone.now(),
            ends_at    = timezone.now() + timedelta(days=duration),
        )


class Subscription(models.Model):
    """
    Active subscription record.
    A user should have at most one ACTIVE subscription at a time.
    The nightly Celery task marks subscriptions EXPIRED when ends_at is past.
    """

    class Status(models.TextChoices):
        ACTIVE    = "ACTIVE",    "Active"
        EXPIRED   = "EXPIRED",   "Expired"
        CANCELLED = "CANCELLED", "Cancelled"

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subscriptions")
    product    = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="subscriptions")
    order      = models.OneToOneField(Order, on_delete=models.PROTECT, related_name="subscription")
    status     = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    starts_at  = models.DateTimeField()
    ends_at    = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "subscriptions"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} — {self.product.name} [{self.status}]"

    def is_active(self):
        return self.status == self.Status.ACTIVE and self.ends_at > timezone.now()

    def cancel(self):
        self.status = self.Status.CANCELLED
        self.save(update_fields=["status"])
