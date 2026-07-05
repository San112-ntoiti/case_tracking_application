"""
Case search filters.
django-filter provides clean, declarative query parameter filtering.
Each filter maps to a URL query param: ?case_number=&party=&court=&status=
"""
import django_filters
from .models import Case, CaseParty, CaseAdvocate


class CaseFilter(django_filters.FilterSet):
    # Text search filters — case-insensitive partial match
    case_number = django_filters.CharFilter(field_name="case_number", lookup_expr="icontains")
    court       = django_filters.CharFilter(field_name="court__name",  lookup_expr="icontains")
    judge       = django_filters.CharFilter(field_name="judge_name",   lookup_expr="icontains")
    case_type   = django_filters.CharFilter(field_name="case_type",    lookup_expr="icontains")
    status      = django_filters.ChoiceFilter(choices=Case.Status.choices)

    # Cross-table filters — search party name and advocate name via JOINs
    party       = django_filters.CharFilter(method="filter_party")
    advocate    = django_filters.CharFilter(method="filter_advocate")

    # Date range filters
    hearing_after  = django_filters.DateFilter(field_name="next_hearing_date", lookup_expr="gte")
    hearing_before = django_filters.DateFilter(field_name="next_hearing_date", lookup_expr="lte")

    class Meta:
        model  = Case
        fields = ["status"]

    def filter_party(self, queryset, name, value):
        """
        Filter cases where any CaseParty.party_name matches the value.
        Uses __in with a subquery rather than a JOIN to avoid duplicate rows
        when a case has multiple matching parties.
        """
        case_ids = CaseParty.objects.filter(
            party_name__icontains=value
        ).values_list("case_id", flat=True)
        return queryset.filter(id__in=case_ids)

    def filter_advocate(self, queryset, name, value):
        case_ids = CaseAdvocate.objects.filter(
            advocate_name__icontains=value
        ).values_list("case_id", flat=True)
        return queryset.filter(id__in=case_ids)
