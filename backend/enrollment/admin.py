from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.urls import reverse, path
from django.http import HttpResponseRedirect
from django.contrib import messages
import json

from .models import RegistrationWindow, Applicant, ApplicantDocument, VerificationResult


# ── Registration Window ───────────────────────────────────────────────────────
@admin.register(RegistrationWindow)
class RegistrationWindowAdmin(admin.ModelAdmin):
    list_display = ("id", "is_active")
    list_filter = ("is_active",)
    list_editable = ("is_active",)


# ── Applicant Document ────────────────────────────────────────────────────────
class ApplicantDocumentInline(admin.StackedInline):
    model = ApplicantDocument
    extra = 0
    readonly_fields = ("passport_front_preview", "selfie_preview")
    fields = ("passport_front", "passport_front_preview", "face_image", "selfie_preview")

    def passport_front_preview(self, obj):
        if obj.passport_front:
            return format_html('<img src="{}" style="max-height:120px;border-radius:6px"/>', obj.passport_front.url)
        return "—"
    passport_front_preview.short_description = "Passport"

    def selfie_preview(self, obj):
        if obj.face_image:
            return format_html('<img src="{}" style="max-height:120px;border-radius:6px"/>', obj.face_image.url)
        return "—"
    selfie_preview.short_description = "Selfie"


# ── Verification Result Inline ────────────────────────────────────────────────
class VerificationResultInline(admin.TabularInline):
    model = VerificationResult
    extra = 0
    readonly_fields = ("created_at", "verified", "confidence", "events_formatted")
    fields = ("created_at", "verified", "confidence", "events_formatted")

    def events_formatted(self, obj):
        if not obj.events_json:
            return "—"
        try:
            events = obj.events_json if isinstance(obj.events_json, list) else json.loads(obj.events_json)
            rows = []
            for e in events:
                etype = e.get("type", "?")
                estatus = e.get("status", "?")
                passed = e.get("passed")
                color = "#27ae60" if passed or estatus == "ok" else ("#e67e22" if estatus == "skipped" else "#e74c3c")
                rows.append(f'<span style="color:{color};font-weight:600">[{etype}]</span> {estatus}')
            return mark_safe("<br>".join(rows))
        except Exception:
            return str(obj.events_json)[:200]
    events_formatted.short_description = "AI Natijalar"

    def has_add_permission(self, request, obj=None):
        return False


# ── Applicant ─────────────────────────────────────────────────────────────────
@admin.register(Applicant)
class ApplicantAdmin(admin.ModelAdmin):
    list_display = (
        "id", "full_name", "email", "phone",
        "status_badge", "ai_status_badge", "direction_choice",
        "created_at",
    )
    list_filter = ("status",)
    search_fields = ("full_name", "email", "phone", "card_number", "passport_id")
    readonly_fields = (
        "created_at", "user",
        "passport_id", "card_number", "birth_date",
        "surname", "name", "patronymic",
        "sex", "citizenship", "birth_place",
        "ai_gateway_status_detail",
    )
    inlines = [ApplicantDocumentInline, VerificationResultInline]
    actions = ["run_ai_verification", "mark_verified"]

    fieldsets = (
        ("Asosiy", {
            "fields": ("full_name", "email", "phone", "status", "direction_choice", "user")
        }),
        ("Passport ma'lumotlari (ixtiyoriy)", {
            "fields": (
                "passport_id", "card_number", "birth_date",
                "surname", "name", "patronymic",
                "sex", "citizenship", "birth_place",
            ),
            "classes": ("collapse",),
        }),
        ("AI Gateway Holati", {
            "fields": ("ai_gateway_status_detail",),
        }),
        ("Meta", {
            "fields": ("created_at",),
        }),
    )

    def status_badge(self, obj):
        colors = {
            "pending":   ("#e67e22", "⏳ Kutilmoqda"),
            "verified":  ("#27ae60", "✅ Verified"),
            "approved":  ("#2ecc71", "✔ Tasdiqlandi"),
            "rejected":  ("#e74c3c", "✖ Rad etildi"),
        }
        color, label = colors.get(obj.status, ("#95a5a6", obj.status))
        return format_html(
            '<span style="color:{};font-weight:700">{}</span>', color, label
        )
    status_badge.short_description = "Status"

    def ai_status_badge(self, obj):
        result = obj.verification_results.order_by("-created_at").first()
        if not result:
            return format_html('<span style="color:#95a5a6">— AI yo\'q</span>')
        if result.verified:
            return format_html('<span style="color:#27ae60;font-weight:700">✅ {:.0%}</span>', result.confidence)
        # AI o'chirilganmi yoki ulanmadimi?
        events = result.events_json or []
        ai_event = next((e for e in events if e.get("type") == "ai"), None)
        if ai_event and ai_event.get("status") in ("disabled", "unavailable"):
            reason = ai_event.get("reason", "")
            return format_html('<span style="color:#e67e22">⚠ AI: {}</span>', reason)
        return format_html('<span style="color:#e74c3c;font-weight:700">✖ {:.0%}</span>', result.confidence)
    ai_status_badge.short_description = "AI"

    def ai_gateway_status_detail(self, obj):
        """Admin panelida AI Gateway ulanish holatini ko'rsatadi."""
        from ai.clients import health_check
        from ai.models import AISettings
        ai_settings = AISettings.get_active()

        lines = []
        yoqilgan_ha = "✅ Ha"
        yoqilgan_yoq = "❌ Yoq"
        lines.append(f"<b>AI Gateway URL:</b> {ai_settings.api_base_url or '—'}")
        lines.append(f"<b>AI yoqilgan:</b> {yoqilgan_ha if ai_settings.ai_enabled else yoqilgan_yoq}")
        lines.append(f"<b>Face Match:</b> {yoqilgan_ha if ai_settings.enable_face_match else yoqilgan_yoq} "
                     f"(threshold: {ai_settings.face_match_threshold})")
        lines.append(f"<b>Presence:</b> {yoqilgan_ha if ai_settings.enable_presence else yoqilgan_yoq} "
                     f"(threshold: {ai_settings.presence_threshold})")

        if ai_settings.ai_enabled and ai_settings.api_base_url:
            try:
                result = health_check()
                if result and result.get("ok"):
                    lines.append('<b>Ulanish:</b> <span style="color:#27ae60;font-weight:700">✅ Gateway ishlayapti</span>')
                else:
                    reason = (result or {}).get("reason", "noma'lum")
                    lines.append(f'<b>Ulanish:</b> <span style="color:#e74c3c">❌ Xato: {reason}</span>')
            except Exception as exc:
                lines.append(f'<b>Ulanish:</b> <span style="color:#e74c3c">❌ {exc}</span>')
        else:
            lines.append('<b>Ulanish:</b> <span style="color:#95a5a6">— AI o\'chirilgan</span>')

        return mark_safe("<br>".join(lines))
    ai_gateway_status_detail.short_description = "AI Gateway Holati"

    @admin.action(description="🔁 Tanlangan ariza(lar) uchun AI qayta tekshirish")
    def run_ai_verification(self, request, queryset):
        from enrollment.views import _run_ai_verification
        success, failed = 0, 0
        for applicant in queryset:
            document = getattr(applicant, "documents", None)
            if not document:
                failed += 1
                continue
            try:
                _run_ai_verification(document)
                success += 1
            except Exception as exc:
                self.message_user(request, f"Applicant #{applicant.id}: {exc}", messages.WARNING)
                failed += 1
        self.message_user(request, f"✅ {success} ta muvaffaqiyatli, ❌ {failed} ta xato.", messages.SUCCESS if not failed else messages.WARNING)

    @admin.action(description="✅ Tanlangan arizalarni 'verified' deb belgilash")
    def mark_verified(self, request, queryset):
        updated = queryset.exclude(status__in=["approved", "rejected"]).update(status="verified")
        self.message_user(request, f"{updated} ta ariza verified ga o'zgartirildi.")


# ── Verification Result ───────────────────────────────────────────────────────
@admin.register(VerificationResult)
class VerificationResultAdmin(admin.ModelAdmin):
    list_display = ("id", "applicant", "verified", "confidence", "ai_events_summary", "created_at")
    list_filter = ("verified",)
    readonly_fields = ("created_at", "verified", "confidence", "events_pretty", "applicant")
    search_fields = ("applicant__full_name", "applicant__email")

    def ai_events_summary(self, obj):
        events = obj.events_json or []
        parts = []
        for e in events:
            etype = e.get("type", "?")
            estatus = e.get("status", "?")
            passed = e.get("passed")
            if passed is True:
                icon = "✅"
            elif passed is False:
                icon = "❌"
            elif estatus == "skipped":
                icon = "⏭"
            elif estatus == "unavailable":
                icon = "⚠"
            else:
                icon = "•"
            parts.append(f"{icon}{etype}")
        return " | ".join(parts) if parts else "—"
    ai_events_summary.short_description = "AI Tekshiruvlar"

    def events_pretty(self, obj):
        if not obj.events_json:
            return "—"
        try:
            data = obj.events_json if isinstance(obj.events_json, list) else json.loads(obj.events_json)
            formatted = json.dumps(data, indent=2, ensure_ascii=False)
            return format_html('<pre style="font-size:12px;max-height:400px;overflow:auto">{}</pre>', formatted)
        except Exception:
            return str(obj.events_json)
    events_pretty.short_description = "Batafsil natijalar"

    def has_add_permission(self, request):
        return False


# ── Applicant Document (alohida ham) ─────────────────────────────────────────
@admin.register(ApplicantDocument)
class ApplicantDocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "applicant", "passport_thumb", "selfie_thumb")
    readonly_fields = ("passport_preview", "selfie_preview")
    search_fields = ("applicant__full_name",)

    def passport_thumb(self, obj):
        if obj.passport_front:
            return format_html('<img src="{}" style="height:40px;border-radius:4px"/>', obj.passport_front.url)
        return "—"
    passport_thumb.short_description = "Passport"

    def selfie_thumb(self, obj):
        if obj.face_image:
            return format_html('<img src="{}" style="height:40px;border-radius:4px"/>', obj.face_image.url)
        return "—"
    selfie_thumb.short_description = "Selfie"

    def passport_preview(self, obj):
        if obj.passport_front:
            return format_html('<img src="{}" style="max-height:200px;border-radius:8px"/>', obj.passport_front.url)
        return "—"
    passport_preview.short_description = "Passport (katta)"

    def selfie_preview(self, obj):
        if obj.face_image:
            return format_html('<img src="{}" style="max-height:200px;border-radius:8px"/>', obj.face_image.url)
        return "—"
    selfie_preview.short_description = "Selfie (katta)"
