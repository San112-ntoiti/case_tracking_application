from django.contrib import admin
from .models import Court, Case, CaseParty, CaseAdvocate, CaseEvent, Document, TrackedCase


class CasePartyInline(admin.TabularInline):
    model = CaseParty
    extra = 1


class CaseAdvocateInline(admin.TabularInline):
    model = CaseAdvocate
    extra = 1


class CaseEventInline(admin.TabularInline):
    model = CaseEvent
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(Court)
class CourtAdmin(admin.ModelAdmin):
    list_display  = ("name", "station", "county", "level")
    search_fields = ("name", "station", "county")
    list_filter   = ("level", "county")


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display  = ("case_number", "case_type", "court", "status", "verified", "next_hearing_date")
    list_filter   = ("status", "case_type", "court", "data_source", "verified")
    search_fields = ("case_number", "judge_name", "public_summary")
    inlines       = [CasePartyInline, CaseAdvocateInline, CaseEventInline]
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display  = ("title", "case", "access_level", "uploaded_by", "created_at")
    list_filter   = ("access_level",)
    search_fields = ("title", "case__case_number")


@admin.register(TrackedCase)
class TrackedCaseAdmin(admin.ModelAdmin):
    list_display  = ("user", "case", "created_at")
    search_fields = ("user__email", "case__case_number")
