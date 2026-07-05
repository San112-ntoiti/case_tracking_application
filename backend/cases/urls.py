from django.urls import path
from .views import (
    CaseListView, CaseDetailView, CaseEventListView,
    TrackedCaseListView, TrackedCaseDeleteView,
    AdminCaseListCreateView, AdminCaseDetailView,
    AdminCaseEventCreateView, AdminDocumentUploadView,
    CourtListView,
)
from .reports import TrackedCasesReportView, CaseActivityReportView

app_name = "cases"

urlpatterns = [
    # Public
    path("",                                CaseListView.as_view(),              name="case-list"),
    path("courts/",                         CourtListView.as_view(),             name="court-list"),
    path("<uuid:pk>/",                      CaseDetailView.as_view(),            name="case-detail"),
    path("<uuid:case_id>/events/",          CaseEventListView.as_view(),         name="case-events"),

    # Authenticated — tracked cases
    path("tracked/",                        TrackedCaseListView.as_view(),       name="tracked-list"),
    path("tracked/<uuid:pk>/",             TrackedCaseDeleteView.as_view(),      name="tracked-delete"),

    # Reports
    path("reports/tracked/",               TrackedCasesReportView.as_view(),    name="report-tracked"),
    path("reports/activity/",              CaseActivityReportView.as_view(),    name="report-activity"),

    # Court Admin
    path("admin/",                          AdminCaseListCreateView.as_view(),   name="admin-case-list"),
    path("admin/<uuid:pk>/",               AdminCaseDetailView.as_view(),        name="admin-case-detail"),
    path("admin/<uuid:case_id>/events/",   AdminCaseEventCreateView.as_view(),  name="admin-event-create"),
    path("admin/<uuid:case_id>/documents/",AdminDocumentUploadView.as_view(),   name="admin-doc-upload"),
]
