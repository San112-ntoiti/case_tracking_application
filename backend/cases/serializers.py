"""
Cases Serializers
Handles representation of court, case, party, advocate, event,
document, and tracked-case data for API responses.
"""
from rest_framework import serializers
from django.conf import settings
from .models import Court, Case, CaseParty, CaseAdvocate, CaseEvent, Document, TrackedCase


class CourtSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Court
        fields = ["id", "name", "station", "county", "level"]


class CasePartySerializer(serializers.ModelSerializer):
    class Meta:
        model  = CaseParty
        fields = ["id", "party_name", "party_role"]


class CaseAdvocateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CaseAdvocate
        fields = ["id", "advocate_name", "law_firm", "email", "phone"]


class CaseEventSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = CaseEvent
        fields = ["id", "event_date", "event_type", "notes", "created_by_name", "created_at"]

    def get_created_by_name(self, obj) -> str:
        return obj.created_by.full_name if obj.created_by else "System"


class DocumentSerializer(serializers.ModelSerializer):
    """
    Documents are filtered based on user subscription.
    PREMIUM documents return 'file_url: null' for non-subscribers
    so the frontend can show a lock icon without a separate API call.
    """
    file_url    = serializers.SerializerMethodField()
    is_locked   = serializers.SerializerMethodField()

    class Meta:
        model  = Document
        fields = ["id", "title", "access_level", "file_url", "is_locked", "file_size_kb", "created_at"]

    def get_file_url(self, obj) -> str | None:
        request = self.context.get("request")
        user    = request.user if request else None
        if obj.is_accessible_to(user):
            if request and obj.file:
                return request.build_absolute_uri(obj.file.url)
        return None

    def get_is_locked(self, obj) -> bool:
        request = self.context.get("request")
        user    = request.user if request else None
        return not obj.is_accessible_to(user)


class DocumentUploadSerializer(serializers.ModelSerializer):
    """Used by Court Admins when uploading documents. `case` is injected by
    the view from the URL path (see AdminDocumentUploadView.perform_create),
    so it must not be required on the incoming request body."""
    class Meta:
        model  = Document
        fields = ["id", "case", "title", "file", "access_level"]
        extra_kwargs = {"case": {"required": False}}

    def validate_file(self, value):
        max_size_bytes = settings.MAX_DOCUMENT_SIZE_MB * 1024 * 1024
        if value.size > max_size_bytes:
            raise serializers.ValidationError(
                f"File size must not exceed {settings.MAX_DOCUMENT_SIZE_MB} MB."
            )
        return value

    def create(self, validated_data):
        file = validated_data.get("file")
        if file:
            validated_data["file_size_kb"] = file.size // 1024
        validated_data["uploaded_by"] = self.context["request"].user
        return super().create(validated_data)


class CaseListSerializer(serializers.ModelSerializer):
    """Compact representation for search results list."""
    court_name = serializers.CharField(source="court.name", read_only=True)

    class Meta:
        model  = Case
        fields = [
            "id", "case_number", "case_type", "court_name",
            "judge_name", "status", "next_mention_date", "next_hearing_date",
        ]


class CaseDetailSerializer(serializers.ModelSerializer):
    """Full case detail including nested parties, advocates, and documents."""
    court      = CourtSerializer(read_only=True)
    parties    = CasePartySerializer(many=True, read_only=True)
    advocates  = CaseAdvocateSerializer(many=True, read_only=True)
    documents  = serializers.SerializerMethodField()
    is_tracked = serializers.SerializerMethodField()

    verified = serializers.BooleanField(read_only=True)
    verified_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = Case
        fields = [
            "id", "case_number", "case_type", "court", "judge_name",
            "status", "verified", "verified_by_name", "verified_at",
            "next_mention_date", "next_hearing_date",
            "public_summary", "data_source", "created_at", "updated_at",
            "parties", "advocates", "documents", "is_tracked",
        ]

    def get_documents(self, obj) -> list:
        request = self.context.get("request")
        docs    = obj.documents.all()
        return DocumentSerializer(docs, many=True, context={"request": request}).data

    def get_is_tracked(self, obj) -> bool:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return TrackedCase.objects.filter(user=request.user, case=obj).exists()

    def get_verified_by_name(self, obj) -> str | None:
        return obj.verified_by.full_name if obj.verified_by else None


class CaseWriteSerializer(serializers.ModelSerializer):
    """
    Used by Court Admins to create or update cases.
    Parties and advocates are handled via separate nested write endpoints
    to keep this serializer simple and avoid complex nested-write logic.
    """
    parties   = CasePartySerializer(many=True, required=False)
    advocates = CaseAdvocateSerializer(many=True, required=False)

    class Meta:
        model  = Case
        fields = [
            "case_number", "case_type", "court", "judge_name",
            "status", "verified", "next_mention_date", "next_hearing_date",
            "public_summary", "parties", "advocates",
        ]

    def validate(self, attrs):
        mention = attrs.get("next_mention_date")
        hearing = attrs.get("next_hearing_date")
        if mention and hearing and hearing < mention:
            raise serializers.ValidationError(
                {"next_hearing_date": "Hearing date cannot be earlier than mention date."}
            )
        return attrs

    def create(self, validated_data):
        parties_data   = validated_data.pop("parties", [])
        advocates_data = validated_data.pop("advocates", [])
        case = Case.objects.create(**validated_data)
        for p in parties_data:
            CaseParty.objects.create(case=case, **p)
        for a in advocates_data:
            CaseAdvocate.objects.create(case=case, **a)
        return case

    def update(self, instance, validated_data):
        # Parties and advocates are not updated inline — use dedicated endpoints
        validated_data.pop("parties", None)
        validated_data.pop("advocates", None)
        return super().update(instance, validated_data)


class CaseEventWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CaseEvent
        fields = ["event_date", "event_type", "notes"]

    def validate_event_date(self, value):
        from django.utils import timezone
        event_type = self.initial_data.get("event_type")
        if event_type in ("RULING", "CLOSED") and value > timezone.now().date():
            raise serializers.ValidationError(
                "RULING and CLOSED events cannot have a future date."
            )
        return value

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class TrackedCaseSerializer(serializers.ModelSerializer):
    case_detail = CaseListSerializer(source="case", read_only=True)

    class Meta:
        model  = TrackedCase
        fields = ["id", "case", "case_detail", "created_at"]
        extra_kwargs = {"case": {"write_only": True}}
