from django.urls import path
from .views import (
    NotificationListView, NotificationPreferencesView,
    MarkNotificationReadView, TriggerTestNotificationView,
)
app_name = "notifications"
urlpatterns = [
    path("",               NotificationListView.as_view(),       name="notification-list"),
    path("preferences/",   NotificationPreferencesView.as_view(), name="notification-prefs"),
    path("test/",          TriggerTestNotificationView.as_view(),  name="notification-test"),
    path("<uuid:pk>/mark-sent/", MarkNotificationReadView.as_view(), name="notification-mark-sent"),
]
