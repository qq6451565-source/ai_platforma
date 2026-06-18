from rest_framework import serializers
from accounts.models import User
from lessons.models import Lesson
from .models import Attendance, AttendanceOverrideLog, LessonActivityLog


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


class LessonActivityLogSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    lesson_topic = serializers.SerializerMethodField()

    class Meta:
        model = LessonActivityLog
        fields = [
            "id",
            "lesson",
            "lesson_topic",
            "student",
            "student_name",
            "lesson_opened",
            "lesson_opened_at",
            "material_viewed",
            "material_viewed_at",
            "video_watch_seconds",
            "video_duration_seconds",
            "video_progress_ratio",
            "video_completed",
            "video_completed_at",
            "test_attended",
            "test_score",
            "assignment_submitted",
            "assignment_submitted_at",
            "total_score",
            "status",
            "status_display",
            "computed_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_student_name(self, obj):
        u = obj.student
        return u.get_full_name() or u.username

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_lesson_topic(self, obj):
        return getattr(obj.lesson, "topic", None)
