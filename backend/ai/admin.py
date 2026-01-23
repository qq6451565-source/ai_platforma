from django.contrib import admin

from .models import AISettings


@admin.register(AISettings)
class AISettingsAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "ai_enabled",
        "api_base_url",
        "enable_face_match",
        "face_match_threshold",
        "enable_presence",
        "presence_threshold",
        "proctor_strict",
        "proctor_missing_seconds",
        "updated_at",
    )
    readonly_fields = ("id", "updated_at")

    fieldsets = (
        ("Ulanish", {
            "fields": (
                "ai_enabled",
                "api_base_url",
                "api_key",
                "timeout_seconds",
                "retry_count",
            )
        }),
        ("OCR", {
            "fields": (
                "ocr_confidence_threshold",
                "max_image_size_mb",
            )
        }),
        ("Face match", {
            "fields": (
                "enable_face_match",
                "face_match_threshold",
                "face_model",
                "detection_backend",
                "enforce_detection",
            )
        }),
        ("Presence", {
            "fields": (
                "enable_presence",
                "presence_threshold",
            )
        }),
        ("Proctoring", {
            "fields": (
                "proctor_strict",
                "proctor_missing_seconds",
            )
        }),
        ("Meta", {
            "fields": (
                "updated_at",
            )
        }),
    )

    def has_add_permission(self, request):
        # Faqat bitta yozuvga ruxsat beramiz.
        return not AISettings.objects.exists()
