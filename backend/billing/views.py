"""
Billing Views
Products, orders, STK Push initiation, callback handling, mock payment,
and subscription status.
"""
import logging
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from accounts.permissions import IsSystemAdmin
from .models import Product, Order, Subscription
from .serializers import (
    ProductSerializer, OrderSerializer,
    OrderCreateSerializer, SubscriptionSerializer,
    RevenueReportSerializer,
)
from .daraja import DarajaService

logger = logging.getLogger(__name__)


class ProductListView(generics.ListAPIView):
    """GET /api/v1/billing/products/ — Public pricing page data."""
    serializer_class   = ProductSerializer
    permission_classes = [permissions.AllowAny]
    queryset           = Product.objects.filter(is_active=True)
    pagination_class   = None


class OrderCreateView(generics.CreateAPIView):
    """
    POST /api/v1/billing/orders/
    Creates a PENDING order. The frontend then calls either
    /mpesa/stk-push/ or /mock/confirm/ to complete payment.
    """
    serializer_class   = OrderCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MpesaSTKPushView(APIView):
    """
    POST /api/v1/billing/mpesa/stk-push/
    Initiates STK Push for a pending order.
    Body: { order_id, phone_number }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order_id     = request.data.get("order_id")
        phone_number = request.data.get("phone_number", "").replace("+", "").replace(" ", "")

        # Validate phone
        if not phone_number or not phone_number.startswith("254") or len(phone_number) != 12:
            return Response(
                {"error": True, "message": "Provide a valid Kenyan phone number starting with 254."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            order = Order.objects.get(id=order_id, user=request.user, status=Order.Status.PENDING)
        except Order.DoesNotExist:
            return Response({"error": True, "message": "Pending order not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            daraja  = DarajaService()
            result  = daraja.initiate_stk_push(
                phone_number     = phone_number,
                amount           = order.total_amount,
                account_reference= f"ORD{str(order.id)[:8].upper()}",
                description      = "CourtTracker Premium",
            )
            # Store the CheckoutRequestID so we can match the callback
            order.provider_reference = result.get("CheckoutRequestID", "")
            order.provider           = Order.Provider.MPESA
            order.save(update_fields=["provider_reference", "provider", "updated_at"])

            return Response({
                "message":           "STK Push sent. Check your phone and enter your M-Pesa PIN.",
                "checkout_request_id": result.get("CheckoutRequestID"),
                "order_id":          str(order.id),
            }, status=status.HTTP_202_ACCEPTED)

        except Exception as e:
            logger.error(f"STK Push failed for order {order_id}: {e}")
            return Response(
                {"error": True, "message": "Payment initiation failed. Please try again."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


@method_decorator(csrf_exempt, name="dispatch")
class MpesaCallbackView(APIView):
    """
    POST /api/v1/billing/mpesa/callback/
    Safaricom sends this after the user completes or cancels the STK Push.
    This endpoint must be publicly accessible (no auth header from Safaricom).
    Always return HTTP 200 — Safaricom retries on non-200 responses.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # Bypass JWT for Safaricom callback

    def post(self, request):
        daraja  = DarajaService()
        success, checkout_id, metadata = daraja.parse_callback(request.data)

        if not checkout_id:
            logger.warning("Received malformed M-Pesa callback.")
            return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

        try:
            order = Order.objects.get(provider_reference=checkout_id)
            if success:
                order.mark_paid(
                    reference=metadata.get("MpesaReceiptNumber", ""),
                    metadata={"callback": request.data, "metadata": metadata},
                )
                logger.info(f"Order {order.id} marked PAID via M-Pesa.")
            else:
                order.mark_failed(metadata={"callback": request.data})
                logger.info(f"Order {order.id} marked FAILED via M-Pesa callback.")
        except Order.DoesNotExist:
            logger.error(f"Callback for unknown CheckoutRequestID: {checkout_id}")

        # Always return 200 to prevent Safaricom retries
        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})


class MockPaymentConfirmView(APIView):
    """
    POST /api/v1/billing/mock/confirm/
    DEMO ONLY — Instantly confirms a pending order without real payment.
    This endpoint should be disabled in production via environment flag.
    Body: { order_id }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from django.conf import settings as django_settings
        if not django_settings.DEBUG:
            return Response(
                {"error": True, "message": "Mock payment is only available in development mode."},
                status=status.HTTP_403_FORBIDDEN,
            )

        order_id = request.data.get("order_id")
        try:
            order = Order.objects.get(id=order_id, user=request.user, status=Order.Status.PENDING)
        except Order.DoesNotExist:
            return Response({"error": True, "message": "Pending order not found."}, status=status.HTTP_404_NOT_FOUND)

        order.provider = Order.Provider.MOCK
        order.save(update_fields=["provider"])
        order.mark_paid(reference="MOCK-DEMO-REF", metadata={"provider": "mock", "demo": True})

        return Response({
            "message":     "Payment confirmed (mock).",
            "order_id":    str(order.id),
            "status":      "PAID",
            "subscription": SubscriptionSerializer(order.subscription).data,
        })


class SubscriptionStatusView(generics.RetrieveAPIView):
    """GET /api/v1/billing/subscription/ — Current user's active subscription."""
    serializer_class   = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        from django.utils import timezone
        sub = Subscription.objects.filter(
            user=self.request.user,
            status=Subscription.Status.ACTIVE,
            ends_at__gt=timezone.now(),
        ).select_related("product").first()
        if not sub:
            return None
        return sub

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance is None:
            return Response({"active": False, "subscription": None})
        serializer = self.get_serializer(instance)
        return Response({"active": True, "subscription": serializer.data})


class RevenueReportView(APIView):
    """
    GET /api/v1/billing/revenue/
    System Admin — revenue summary with date range filtering.
    """
    permission_classes = [IsSystemAdmin]

    def get(self, request):
        from django.db.models import Sum, Count, Q
        from django.utils import timezone
        import datetime

        date_from = request.query_params.get("date_from")
        date_to   = request.query_params.get("date_to")

        orders = Order.objects.all()
        if date_from:
            orders = orders.filter(created_at__date__gte=date_from)
        if date_to:
            orders = orders.filter(created_at__date__lte=date_to)

        summary = orders.aggregate(
            total_orders    = Count("id"),
            paid_count      = Count("id", filter=Q(status="PAID")),
            failed_count    = Count("id", filter=Q(status="FAILED")),
            total_revenue   = Sum("total_amount", filter=Q(status="PAID")),
        )

        return Response({
            "date_from":     date_from,
            "date_to":       date_to,
            "total_orders":  summary["total_orders"],
            "paid_orders":   summary["paid_count"],
            "failed_orders": summary["failed_count"],
            "total_revenue": summary["total_revenue"] or 0,
            "currency":      "KES",
        })


class CancelSubscriptionView(APIView):
    """POST /api/v1/billing/subscription/cancel/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from django.utils import timezone
        sub = Subscription.objects.filter(
            user=request.user, status=Subscription.Status.ACTIVE,
            ends_at__gt=timezone.now()
        ).first()
        if not sub:
            return Response({"error": True, "message": "No active subscription found."}, status=status.HTTP_404_NOT_FOUND)
        sub.cancel()
        return Response({"message": "Subscription cancelled. Access continues until expiry.", "ends_at": sub.ends_at})


class AdminSubscriptionListView(generics.ListAPIView):
    """GET /api/v1/billing/admin/subscriptions/ — SysAdmin subscription management."""
    permission_classes = [IsSystemAdmin]
    queryset = Subscription.objects.select_related("user", "product").order_by("-created_at")
    filterset_fields = ["status"]

    def get_serializer_class(self):
        from .serializers import AdminSubscriptionSerializer
        return AdminSubscriptionSerializer


class AdminOrderListView(generics.ListAPIView):
    """GET /api/v1/billing/admin/orders/ — SysAdmin order history with filtering."""
    permission_classes = [IsSystemAdmin]
    filterset_fields = ["status", "provider"]

    def get_queryset(self):
        return Order.objects.select_related("user", "product").order_by("-created_at")

    def get_serializer_class(self):
        from .serializers import AdminOrderSerializer
        return AdminOrderSerializer
