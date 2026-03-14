from rest_framework import serializers

from .models import RegistrationWindow, Applicant, ApplicantDocument, VerificationResult


AI_REASON_MESSAGES = {
    "timeout": "AI xizmatidan javob kelmadi.",
    "gateway_unreachable": "AI gateway ulanmayapti.",
    "connection_error": "AI gateway bilan aloqa o'rnatilmadi.",
    "dns_error": "AI gateway manzili topilmadi.",
    "ssl_error": "AI gateway SSL sertifikatida muammo bor.",
    "auth_error": "AI gateway ruxsat xatosi qaytardi.",
    "rate_limited": "AI gateway vaqtincha band.",
    "gateway_error": "AI gateway ichki xatolik qaytardi.",
}


def _verification_sort_key(verification: VerificationResult) -> float:
    return verification.created_at.timestamp() if verification.created_at else 0.0


def _verification_events(verification: VerificationResult) -> list[dict]:
    events = verification.events_json
    return events if isinstance(events, list) else []


def _find_event(events: list[dict], event_type: str) -> dict | None:
    return next((event for event in events if isinstance(event, dict) and event.get("type") == event_type), None)


def _event_summary(events: list[dict]) -> list[str]:
    lines: list[str] = []
    for event in events:
        if not isinstance(event, dict):
            continue
        event_type = event.get("type") or "unknown"
        status = event.get("status") or "n/a"

        if event_type == "face_match":
            threshold = event.get("threshold")
            passed = event.get("passed")
            detail = f"face_match: {status}"
            if threshold is not None:
                detail += f", threshold={threshold}"
            if isinstance(passed, bool):
                detail += ", passed" if passed else ", failed"
            lines.append(detail)
            continue

        if event_type == "face_embedding":
            embedding_length = event.get("embedding_length") or 0
            lines.append(f"face_embedding: {status}, len={embedding_length}")
            continue

        if event_type == "ai" and status == "unavailable":
            reason = event.get("reason") or "connection_error"
            detail = event.get("detail") or AI_REASON_MESSAGES.get(reason) or "AI xizmati mavjud emas."
            lines.append(f"ai: unavailable, {detail}")
            continue

        detail = event.get("detail")
        lines.append(f"{event_type}: {status}" + (f", {detail}" if detail else ""))

    return lines


def _build_verification_summary(verification: VerificationResult | None) -> dict:
    if verification is None:
        return {
            "status": "not_run",
            "label": "Tekshirilmagan",
            "color": "default",
            "message": "AI tekshiruv hali ishga tushmagan.",
            "confidence": None,
            "threshold": None,
            "checked_at": None,
            "reason": None,
            "manual_review_required": True,
            "face_embedding_ready": False,
            "event_summary": [],
        }

    events = _verification_events(verification)
    unavailable = next(
        (
            event
            for event in events
            if isinstance(event, dict) and event.get("type") == "ai" and event.get("status") == "unavailable"
        ),
        None,
    )
    face_match_event = _find_event(events, "face_match") or {}
    face_embedding_event = _find_event(events, "face_embedding") or {}
    threshold = face_match_event.get("threshold")
    face_embedding_ready = face_embedding_event.get("status") == "ok"

    if unavailable:
        reason = unavailable.get("reason") or "connection_error"
        message = unavailable.get("detail") or AI_REASON_MESSAGES.get(reason) or "AI xizmati mavjud emas."
        return {
            "status": "unavailable",
            "label": "AI mavjud emas",
            "color": "orange",
            "message": message,
            "confidence": float(verification.confidence or 0.0),
            "threshold": threshold if isinstance(threshold, (float, int)) else None,
            "checked_at": verification.created_at,
            "reason": reason,
            "manual_review_required": True,
            "face_embedding_ready": face_embedding_ready,
            "event_summary": _event_summary(events),
        }

    if verification.verified:
        return {
            "status": "verified",
            "label": "Tasdiqlandi",
            "color": "green",
            "message": "Passport va selfie yuzlari AI tomonidan mos deb topildi.",
            "confidence": float(verification.confidence or 0.0),
            "threshold": threshold if isinstance(threshold, (float, int)) else None,
            "checked_at": verification.created_at,
            "reason": None,
            "manual_review_required": False,
            "face_embedding_ready": face_embedding_ready,
            "event_summary": _event_summary(events),
        }

    return {
        "status": "not_verified",
        "label": "Tasdiqlanmadi",
        "color": "red",
        "message": "Passport va selfie yuzlari yetarli ishonch bilan mos kelmadi.",
        "confidence": float(verification.confidence or 0.0),
        "threshold": threshold if isinstance(threshold, (float, int)) else None,
        "checked_at": verification.created_at,
        "reason": None,
        "manual_review_required": True,
        "face_embedding_ready": face_embedding_ready,
        "event_summary": _event_summary(events),
    }


def _build_allowed_actions(applicant: Applicant) -> dict[str, bool]:
    is_final = applicant.status in {"approved", "rejected"}
    has_documents = bool(getattr(applicant, "documents", None))
    return {
        "can_edit": not is_final,
        "can_delete": not is_final,
        "can_approve": applicant.status in {"pending", "verified"},
        "can_reject": applicant.status in {"pending", "verified"},
        "can_reopen": applicant.status == "rejected",
        "can_reverify": applicant.status in {"pending", "verified"} and has_documents,
    }


class RegistrationWindowSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistrationWindow
        fields = "__all__"


class ApplicantDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicantDocument
        fields = "__all__"


class ApplicantDocumentPreviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicantDocument
        fields = ("passport_front", "face_image")


class VerificationResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = VerificationResult
        fields = "__all__"


class VerificationResultAdminSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    label = serializers.SerializerMethodField()
    color = serializers.SerializerMethodField()
    message = serializers.SerializerMethodField()
    threshold = serializers.SerializerMethodField()
    checked_at = serializers.DateTimeField(source="created_at", read_only=True)
    reason = serializers.SerializerMethodField()
    manual_review_required = serializers.SerializerMethodField()
    face_embedding_ready = serializers.SerializerMethodField()
    event_summary = serializers.SerializerMethodField()

    class Meta:
        model = VerificationResult
        fields = (
            "verified",
            "confidence",
            "created_at",
            "checked_at",
            "status",
            "label",
            "color",
            "message",
            "threshold",
            "reason",
            "manual_review_required",
            "face_embedding_ready",
            "event_summary",
            "events_json",
        )

    def _summary(self, obj: VerificationResult) -> dict:
        return _build_verification_summary(obj)

    def get_status(self, obj: VerificationResult) -> str:
        return self._summary(obj)["status"]

    def get_label(self, obj: VerificationResult) -> str:
        return self._summary(obj)["label"]

    def get_color(self, obj: VerificationResult) -> str:
        return self._summary(obj)["color"]

    def get_message(self, obj: VerificationResult) -> str:
        return self._summary(obj)["message"]

    def get_threshold(self, obj: VerificationResult) -> float | None:
        return self._summary(obj)["threshold"]

    def get_reason(self, obj: VerificationResult) -> str | None:
        return self._summary(obj)["reason"]

    def get_manual_review_required(self, obj: VerificationResult) -> bool:
        return self._summary(obj)["manual_review_required"]

    def get_face_embedding_ready(self, obj: VerificationResult) -> bool:
        return self._summary(obj)["face_embedding_ready"]

    def get_event_summary(self, obj: VerificationResult) -> list[str]:
        return self._summary(obj)["event_summary"]


class ApplicantSerializer(serializers.ModelSerializer):
    documents = ApplicantDocumentSerializer(read_only=True)
    verifications = VerificationResultSerializer(many=True, read_only=True)

    class Meta:
        model = Applicant
        fields = "__all__"


class ApplicantAdminListSerializer(serializers.ModelSerializer):
    direction_name = serializers.CharField(source="direction_choice.name", read_only=True)
    latest_verification = serializers.SerializerMethodField()
    ai_summary = serializers.SerializerMethodField()
    allowed_actions = serializers.SerializerMethodField()

    class Meta:
        model = Applicant
        fields = (
            "id",
            "full_name",
            "phone",
            "email",
            "direction_choice",
            "direction_name",
            "status",
            "created_at",
            "latest_verification",
            "ai_summary",
            "allowed_actions",
        )

    def _sorted_verifications(self, obj: Applicant) -> list[VerificationResult]:
        return sorted(list(obj.verifications.all()), key=_verification_sort_key, reverse=True)

    def get_latest_verification(self, obj: Applicant) -> dict | None:
        latest = next(iter(self._sorted_verifications(obj)), None)
        if not latest:
            return None
        return VerificationResultAdminSerializer(latest).data

    def get_ai_summary(self, obj: Applicant) -> dict:
        latest = next(iter(self._sorted_verifications(obj)), None)
        return _build_verification_summary(latest)

    def get_allowed_actions(self, obj: Applicant) -> dict[str, bool]:
        return _build_allowed_actions(obj)


class ApplicantAdminDetailSerializer(ApplicantAdminListSerializer):
    documents = ApplicantDocumentPreviewSerializer(read_only=True)
    verification_history = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    has_user = serializers.SerializerMethodField()

    class Meta(ApplicantAdminListSerializer.Meta):
        fields = ApplicantAdminListSerializer.Meta.fields + (
            "documents",
            "verification_history",
            "approved_at",
            "approved_by_name",
            "has_user",
        )

    def get_verification_history(self, obj: Applicant) -> list[dict]:
        return VerificationResultAdminSerializer(self._sorted_verifications(obj), many=True).data

    def get_approved_by_name(self, obj: Applicant) -> str | None:
        if not obj.approved_by_id:
            return None
        full_name = f"{obj.approved_by.first_name} {obj.approved_by.last_name}".strip()
        return full_name or obj.approved_by.username

    def get_has_user(self, obj: Applicant) -> bool:
        return bool(obj.user_id)


class ApplicantAdminWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Applicant
        fields = ("full_name", "phone", "email", "direction_choice")
        extra_kwargs = {
            "full_name": {"required": False},
            "phone": {"required": False},
            "email": {"required": False},
            "direction_choice": {"required": False, "allow_null": True},
        }
