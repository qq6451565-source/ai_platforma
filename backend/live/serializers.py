"""
Serializers for live room and face verification models.
"""
from rest_framework import serializers
from .models import (
    LiveRoom,
    LiveParticipant,
    LiveFaceSession,
    LiveFaceEvent,
    FaceVerificationSettings,
)
from accounts.models import User


class LiveRoomSerializer(serializers.ModelSerializer):
    """Serializer for LiveRoom model."""
    
    lesson_topic = serializers.CharField(source="lesson.topic", read_only=True)
    stage_user_id = serializers.IntegerField(source="stage_user_id", read_only=True)
    stage_user_name = serializers.CharField(source="stage_user.username", read_only=True)
    
    class Meta:
        model = LiveRoom
        fields = [
            "id",
            "lesson",
            "lesson_topic",
            "room_name",
            "jitsi_url",
            "is_active",
            "stage_user_id",
            "stage_user_name",
            "allow_ptt",
            "started_at",
            "ended_at",
        ]


class LiveParticipantSerializer(serializers.ModelSerializer):
    """Serializer for LiveParticipant model."""
    
    user_name = serializers.CharField(source="user.username", read_only=True)
    user_full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_role = serializers.CharField(source="user.role", read_only=True)
    
    class Meta:
        model = LiveParticipant
        fields = [
            "id",
            "room",
            "user",
            "user_name",
            "user_full_name",
            "user_role",
            "is_teacher",
            "hand_raised",
            "joined_at",
            "left_at",
        ]


class FaceVerificationSettingsSerializer(serializers.ModelSerializer):
    """Serializer for face verification settings."""
    
    class Meta:
        model = FaceVerificationSettings
        fields = [
            'id',
            'verification_enabled',
            'verification_interval',
            'confidence_threshold',
            'max_faces_allowed',
            'auto_attendance',
            'alert_on_multiple_faces',
            'alert_on_no_face',
            'alert_on_verification_fail',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class LiveFaceEventSerializer(serializers.ModelSerializer):
    """Serializer for individual face verification events."""
    
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = LiveFaceEvent
        fields = [
            'id',
            'session',
            'room',
            'user',
            'user_username',
            'user_full_name',
            'event_type',
            'faces_detected',
            'confidence',
            'is_verified',
            'alert_sent',
            'metadata',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_user_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class LiveFaceSessionSerializer(serializers.ModelSerializer):
    """Serializer for face verification sessions."""
    
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_full_name = serializers.SerializerMethodField()
    success_rate = serializers.FloatField(read_only=True)
    recent_events = serializers.SerializerMethodField()
    
    class Meta:
        model = LiveFaceSession
        fields = [
            'id',
            'participant',
            'room',
            'user',
            'user_username',
            'user_full_name',
            'status',
            'last_verification_at',
            'verification_count',
            'success_count',
            'fail_count',
            'success_rate',
            'started_at',
            'ended_at',
            'recent_events',
        ]
        read_only_fields = [
            'id',
            'started_at',
            'ended_at',
            'last_verification_at',
            'verification_count',
            'success_count',
            'fail_count',
        ]
    
    def get_user_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username
    
    def get_recent_events(self, obj):
        """Get last 5 events for this session."""
        events = obj.events.all()[:5]
        return LiveFaceEventSerializer(events, many=True).data


class LiveFaceSessionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for session lists."""
    
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_full_name = serializers.SerializerMethodField()
    success_rate = serializers.FloatField(read_only=True)
    
    class Meta:
        model = LiveFaceSession
        fields = [
            'id',
            'user',
            'user_username',
            'user_full_name',
            'status',
            'last_verification_at',
            'verification_count',
            'success_count',
            'fail_count',
            'success_rate',
            'started_at',
        ]
    
    def get_user_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class LiveMonitoringSerializer(serializers.Serializer):
    """Serializer for live monitoring dashboard data."""
    
    room_name = serializers.CharField()
    room_id = serializers.IntegerField()
    lesson_topic = serializers.CharField()
    is_active = serializers.BooleanField()
    total_participants = serializers.IntegerField()
    verified_participants = serializers.IntegerField()
    sessions = LiveFaceSessionListSerializer(many=True)
    recent_alerts = LiveFaceEventSerializer(many=True)
