from django.contrib import admin
from .models import LiveRoom, LiveParticipant

@admin.register(LiveRoom)
class LiveRoomAdmin(admin.ModelAdmin):
    list_display = ('id', 'lesson', 'room_name', 'is_active', 'started_at', 'ended_at')
    search_fields = ('room_name',)

@admin.register(LiveParticipant)
class LiveParticipantAdmin(admin.ModelAdmin):
    list_display = ('id', 'room', 'user', 'is_teacher', 'joined_at', 'left_at')
    search_fields = ('user__username', 'room__room_name')
