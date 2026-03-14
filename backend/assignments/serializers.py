from rest_framework import serializers
from datetime import timedelta

from attendance.services import get_lesson_access_snapshot

from .models import Assignment, Submission


class AssignmentSerializer(serializers.ModelSerializer):
    lesson_topic = serializers.CharField(source="lesson.topic", read_only=True)
    subject = serializers.CharField(source="teacher_subject.subject.name", read_only=True)
    group_names = serializers.SerializerMethodField()
    access = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            "id",
            "lesson",
            "lesson_topic",
            "teacher_subject",
            "subject",
            "group_names",
            "title",
            "description",
            "file",
            "deadline",
            "created_at",
            "access",
        ]
        extra_kwargs = {
            "file": {"required": False, "allow_null": True},
            "deadline": {"required": False},
            "teacher_subject": {"required": False},
        }

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        lesson = attrs.get("lesson") or getattr(self.instance, "lesson", None)
        if lesson:
            attrs["teacher_subject"] = lesson.teacher_subject
            attrs["deadline"] = lesson.start_time + timedelta(days=3)
            if user and getattr(user, "role", None) == "teacher":
                if lesson.teacher_subject.teacher_id != user.id:
                    raise serializers.ValidationError({"lesson": "Bu dars sizga tegishli emas."})
        teacher_subject = attrs.get("teacher_subject") or getattr(self.instance, "teacher_subject", None)
        if not lesson:
            raise serializers.ValidationError({"lesson": "Dars majburiy."})
        if teacher_subject:
            if not teacher_subject.groups.exists():
                raise serializers.ValidationError(
                    {"teacher_subject": "O'qituvchi-fan biriktirishida guruhlar mavjud emas."}
                )
            if user and getattr(user, "role", None) == "teacher" and teacher_subject.teacher_id != user.id:
                raise serializers.ValidationError(
                    {"teacher_subject": "Bu biriktirish sizga tegishli emas."}
                )
        return attrs

    def get_group_names(self, obj):
        return list(obj.teacher_subject.groups.values_list("name", flat=True))

    def get_access(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if getattr(user, "role", None) != "student":
            return None

        access_map = self.context.get("lesson_access_snapshots") or {}
        if obj.lesson_id:
            return dict(access_map.get(obj.lesson_id) or get_lesson_access_snapshot(user, obj.lesson_id))
        return get_lesson_access_snapshot(user, None)


class SubmissionSerializer(serializers.ModelSerializer):
    file = serializers.FileField(required=True, allow_null=False)
    assignment_title = serializers.CharField(source="assignment.title", read_only=True)
    lesson_topic = serializers.CharField(source="assignment.lesson.topic", read_only=True)
    subject_name = serializers.CharField(source="assignment.lesson.teacher_subject.subject.name", read_only=True)
    group_name = serializers.CharField(source="assignment.lesson.group.name", read_only=True)
    teacher_name = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()
    student_username = serializers.CharField(source="student.username", read_only=True)
    student_group_name = serializers.CharField(source="student.group.name", read_only=True)

    class Meta:
        model = Submission
        fields = [
            "id",
            "assignment",
            "assignment_title",
            "lesson_topic",
            "subject_name",
            "group_name",
            "student",
            "student_name",
            "student_username",
            "student_group_name",
            "file",
            "comment",
            "submitted_at",
            "grade",
            "teacher_comment",
            "teacher_name",
        ]
        read_only_fields = ("student", "submitted_at", "grade", "teacher_comment")

    def get_teacher_name(self, obj):
        teacher = getattr(getattr(getattr(obj.assignment, "lesson", None), "teacher_subject", None), "teacher", None)
        if not teacher:
            return None
        full_name = teacher.get_full_name()
        return full_name or teacher.username

    def get_student_name(self, obj):
        student = getattr(obj, "student", None)
        if not student:
            return None
        full_name = student.get_full_name()
        return full_name or student.username
