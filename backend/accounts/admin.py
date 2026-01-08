from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User, PassportData, AuditLog


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    # List ko'rinishida roleni ham ko'rsatamiz va tahrirlashga ruxsat beramiz
    list_display = ("username", "email", "first_name", "last_name", "role", "is_staff", "is_active")
    list_filter = ("role", "is_staff", "is_superuser", "is_active")
    search_fields = ("username", "email", "first_name", "last_name")
    ordering = ("id",)
    list_editable = ("role",)

    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Qo'shimcha ma'lumot", {"fields": ("role", "phone", "face_image", "group")}),
    )
    add_fieldsets = DjangoUserAdmin.add_fieldsets + (
        ("Qo'shimcha ma'lumot", {"fields": ("role", "phone", "face_image", "group")}),
    )


@admin.register(PassportData)
class PassportDataAdmin(admin.ModelAdmin):
    list_display = ("user", "passport_series", "passport_number")
    search_fields = ("passport_series", "passport_number", "user__username")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "user", "role", "ip_address", "created_at")
    list_filter = ("action", "role", "created_at")
    search_fields = ("user__username", "ip_address", "user_agent")
