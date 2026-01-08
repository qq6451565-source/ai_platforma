from django.contrib import admin

from .models import AISettings


@admin.register(AISettings)
class AISettingsAdmin(admin.ModelAdmin):
    list_display = ("id", "enable_presence", "enable_face_match", "presence_threshold", "face_match_threshold", "updated_at")
    readonly_fields = ("id", "updated_at")

    def has_add_permission(self, request):
        # Faqat bitta yozuvga ruxsat beramiz.
        return not AISettings.objects.exists()
