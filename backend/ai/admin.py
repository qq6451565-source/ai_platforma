from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.contrib import messages

from .models import AISettings


@admin.register(AISettings)
class AISettingsAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "ai_enabled",
        "gateway_url_short",
        "gateway_live_status",
        "enable_face_match",
        "face_match_threshold",
        "enable_presence",
        "presence_threshold",
        "proctor_strict",
        "updated_at",
    )
    readonly_fields = ("id", "updated_at", "gateway_health_detail")

    fieldsets = (
        ("🔗 AI Gateway Ulanish", {
            "fields": (
                "ai_enabled",
                "api_base_url",
                "api_key",
                "timeout_seconds",
                "retry_count",
                "gateway_health_detail",
            ),
            "description": (
                "AI Gateway URL — HuggingFace Space manzili. "
                "Format: https://USERNAME-SPACENAME.hf.space<br>"
                "API key gateway .env dagi AI_API_KEY bilan bir xil bo'lishi shart!"
            ),
        }),
        ("Rasm Sozlamalari", {
            "fields": (
                "max_image_size_mb",
            )
        }),
        ("👤 Yuz Solishtirish (Face Match)", {
            "fields": (
                "enable_face_match",
                "face_match_threshold",
                "face_model",
                "detection_backend",
                "enforce_detection",
            ),
            "description": "Ro'yxatdan o'tishda passport va selfie ni solishtirish",
        }),
        ("👁 Yuz Aniqlash (Presence)", {
            "fields": (
                "enable_presence",
                "presence_threshold",
            ),
            "description": "Live dars va test proctoring uchun yuz bor-yo'qligini tekshirish",
        }),
        ("🛡 Proctoring", {
            "fields": (
                "proctor_strict",
                "proctor_missing_seconds",
            ),
            "description": "Test jarayonida yuz yo'q bo'lganda qoidalar",
        }),
        ("ℹ Meta", {
            "fields": ("id", "updated_at"),
        }),
    )

    def gateway_url_short(self, obj):
        if not obj.api_base_url:
            return format_html('<span style="color:#95a5a6">— Sozlanmagan</span>')
        short = obj.api_base_url[:40] + "..." if len(obj.api_base_url) > 40 else obj.api_base_url
        return format_html(
            '<a href="{}" target="_blank" style="font-size:11px">{}</a>',
            obj.api_base_url, short
        )
    gateway_url_short.short_description = "Gateway URL"

    def gateway_live_status(self, obj):
        """List viewda real-time holat ko'rsatadi."""
        if not obj.ai_enabled or not obj.api_base_url:
            return format_html('<span style="color:#95a5a6">— O\'chirilgan</span>')
        try:
            from ai.clients import health_check
            result = health_check()
            if result and result.get("ok"):
                return format_html('<span style="color:#27ae60;font-weight:700">✅ Ishlamoqda</span>')
            reason = (result or {}).get("reason", "xato")
            return format_html('<span style="color:#e74c3c">❌ {}</span>', reason)
        except Exception as exc:
            return format_html('<span style="color:#e74c3c">❌ {}</span>', str(exc)[:50])
    gateway_live_status.short_description = "Holat"

    def gateway_health_detail(self, obj):
        """Detail viewda to'liq health ma'lumot."""
        if not obj.ai_enabled or not obj.api_base_url:
            return mark_safe('<span style="color:#95a5a6">AI o\'chirilgan yoki URL sozlanmagan.</span>')

        try:
            from ai.clients import health_check
            result = health_check()
        except Exception as exc:
            return format_html(
                '<span style="color:#e74c3c">❌ Ulanib bo\'lmadi: {}</span>', exc
            )

        if not result or not result.get("ok"):
            reason = (result or {}).get("reason", "noma'lum")
            messages_map = {
                "timeout":             "⏱ Timeout — Gateway juda sekin yoki o'chirilgan",
                "auth_error":          "🔑 API key noto'g'ri — HF Secret bilan tekshiring",
                "dns_error":           "🌐 URL topilmadi — HF Space manzilini tekshiring",
                "ssl_error":           "🔒 SSL xatoligi",
                "gateway_unreachable": "📡 Gateway yetib bo'lmaydi",
                "connection_error":    "🔌 Ulanib bo'lmadi",
            }
            msg = messages_map.get(reason, f"❌ Xato: {reason}")
            return format_html(
                '<div style="color:#e74c3c;font-weight:600">{}</div>'
                '<small style="color:#777">URL: {}</small>',
                msg, obj.api_base_url
            )

        data = result.get("data") or {}
        lines = [
            '<div style="background:#eafaf1;border:1px solid #27ae60;border-radius:8px;padding:12px">',
            '<b style="color:#27ae60">✅ AI Gateway muvaffaqiyatli ulandi!</b><br><br>',
        ]
        if data.get("version"):
            lines.append(f"<b>Versiya:</b> {data['version']}<br>")
        if data.get("uptime_seconds"):
            uptime = int(data["uptime_seconds"])
            lines.append(f"<b>Ishlash vaqti:</b> {uptime//60} daqiqa {uptime%60} soniya<br>")
        if data.get("face_match_threshold"):
            lines.append(f"<b>Gateway face threshold:</b> {data['face_match_threshold']}<br>")
        if data.get("presence_threshold"):
            lines.append(f"<b>Gateway presence threshold:</b> {data['presence_threshold']}<br>")
        lines.append(f'<small style="color:#777">URL: {obj.api_base_url}</small>')
        lines.append("</div>")
        return mark_safe("".join(lines))
    gateway_health_detail.short_description = "Gateway Ulanish Tekshiruvi"

    def has_add_permission(self, request):
        return not AISettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        # Saqlangandan keyin ulanishni tekshiramiz
        if obj.ai_enabled and obj.api_base_url:
            try:
                from ai.clients import health_check
                result = health_check()
                if result and result.get("ok"):
                    self.message_user(request, "✅ AI Gateway muvaffaqiyatli ulandi!", messages.SUCCESS)
                else:
                    reason = (result or {}).get("reason", "noma'lum")
                    self.message_user(
                        request,
                        f"⚠ AI Gateway sozlamalar saqlandi, lekin ulanmadi: {reason}. URL va API key ni tekshiring.",
                        messages.WARNING,
                    )
            except Exception as exc:
                self.message_user(request, f"⚠ Gateway tekshirishda xato: {exc}", messages.WARNING)
