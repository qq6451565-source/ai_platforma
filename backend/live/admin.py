from django.contrib import admin
from .models import (
    LiveRoom,
    LiveParticipant,
    FaceVerificationSettings,
    LiveFaceSession,
    LiveFaceEvent,
)

@admin.register(LiveRoom)
class LiveRoomAdmin(admin.ModelAdmin):
    list_display = ('id', 'lesson', 'room_name', 'is_active', 'started_at', 'ended_at')
    search_fields = ('room_name',)

@admin.register(LiveParticipant)
class LiveParticipantAdmin(admin.ModelAdmin):
    list_display = ('id', 'room', 'user', 'is_teacher', 'joined_at', 'left_at')
    search_fields = ('user__username', 'room__room_name')

@admin.register(FaceVerificationSettings)
class FaceVerificationSettingsAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'verification_enabled',
        'verification_interval',
        'confidence_threshold',
        'max_faces_allowed',
        'auto_attendance',
    )
    
    def has_add_permission(self, request):
        # Only one instance allowed
        return not FaceVerificationSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Don't allow deletion
        return False

@admin.register(LiveFaceSession)
class LiveFaceSessionAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'room',
        'status',
        'verification_count',
        'success_count',
        'fail_count',
        'success_rate',
        'started_at',
    )
    list_filter = ('status', 'room')
    search_fields = ('user__username', 'room__room_name')
    readonly_fields = (
        'verification_count',
        'success_count',
        'fail_count',
        'started_at',
        'ended_at',
    )

@admin.register(LiveFaceEvent)
class LiveFaceEventAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'room',
        'event_type',
        'faces_detected',
        'confidence',
        'is_verified',
        'alert_sent',
        'created_at',
    )
    list_filter = ('event_type', 'is_verified', 'alert_sent', 'room')
    search_fields = ('user__username', 'room__room_name')
    readonly_fields = ('created_at',)
    
    def has_add_permission(self, request):
        # Events are created automatically
        return False
