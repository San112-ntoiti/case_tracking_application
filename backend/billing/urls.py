from django.urls import path
from .views import (
    ProductListView, OrderCreateView,
    MpesaSTKPushView, MpesaCallbackView,
    MockPaymentConfirmView, SubscriptionStatusView,
    RevenueReportView, CancelSubscriptionView,
    AdminSubscriptionListView, AdminOrderListView,
)

app_name = "billing"

urlpatterns = [
    path("products/",                   ProductListView.as_view(),          name="products"),
    path("orders/",                     OrderCreateView.as_view(),           name="order-create"),
    path("mpesa/stk-push/",            MpesaSTKPushView.as_view(),          name="stk-push"),
    path("mpesa/callback/",            MpesaCallbackView.as_view(),         name="mpesa-callback"),
    path("mock/confirm/",              MockPaymentConfirmView.as_view(),     name="mock-confirm"),
    path("subscription/",              SubscriptionStatusView.as_view(),     name="subscription-status"),
    path("subscription/cancel/",       CancelSubscriptionView.as_view(),     name="subscription-cancel"),
    path("revenue/",                   RevenueReportView.as_view(),          name="revenue-report"),
    path("admin/subscriptions/",       AdminSubscriptionListView.as_view(),  name="admin-subscriptions"),
    path("admin/orders/",              AdminOrderListView.as_view(),         name="admin-orders"),
]
