"""
Kenya Court Case Tracker — Root URL Configuration
All app URLs are namespaced under /api/v1/ for clean versioning.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/v1/auth/",          include("accounts.urls",      namespace="accounts")),
    path("api/v1/cases/",         include("cases.urls",         namespace="cases")),
    path("api/v1/billing/",       include("billing.urls",       namespace="billing")),
    path("api/v1/notifications/", include("notifications.urls", namespace="notifications")),
    path("api/v1/admin-panel/",   include("audit.urls",         namespace="audit")),
    path("api/schema/",           SpectacularAPIView.as_view(),           name="schema"),
    path("api/docs/",             SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
