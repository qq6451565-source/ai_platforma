from rest_framework import serializers
from accounts.models import User
from lessons.models import Lesson
from .models import Attendance, AttendanceOverrideLog


class AttendanceSerializer(serializers.ModelSerializer):
    overridden_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = [
            'id',
            'lesson',
            'student',
            'status',
            'timestamp',
            'face_check_count',
            'face_success_count',
            'face_verified_ratio',
            'joined_seconds',
            'joined_ratio',
            'finalized',
            'finalized_at',
            'manual_override',
            'override_reason',
            'overridden_by',
            'overridden_by_name',
            'overridden_at',
        ]

    def get_overridden_by_name(self, obj):
        user = getattr(obj, "overridden_by", None)
        if not user:
            return None
        return user.get_full_name() or user.username


class MarkAttendanceSerializer(serializers.Serializer):
    lesson = serializers.PrimaryKeyRelatedField(queryset=Lesson.objects.all())
    student = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(role="student"))
    status = serializers.ChoiceField(choices=Attendance.ATTEND_CHOICES)
    reason = serializers.CharField(trim_whitespace=True, min_length=5, max_length=500)


class AttendanceOverrideLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceOverrideLog
        fields = [
            "id",
            "attendance",
            "lesson",
            "student",
            "previous_status",
            "new_status",
            "previous_finalized",
            "new_finalized",
            "reason",
            "changed_by",
            "changed_by_name",
            "created_at",
        ]

    def get_changed_by_name(self, obj):
        user = getattr(obj, "changed_by", None)
        if not user:
            return None
        return user.get_full_name() or user.username
