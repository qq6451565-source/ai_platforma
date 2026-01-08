from rest_framework import serializers

from .models import Assignment, Submission


class AssignmentSerializer(serializers.ModelSerializer):
    subject = serializers.CharField(source="teacher_subject.subject.name", read_only=True)
    group_names = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            "id",
            "teacher_subject",
            "subject",
            "group_names",
            "title",
            "description",
            "file",
            "deadline",
            "created_at",
        ]
        extra_kwargs = {
            "file": {"required": False, "allow_null": True},
        }

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        teacher_subject = attrs.get("teacher_subject") or getattr(self.instance, "teacher_subject", None)
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


class SubmissionSerializer(serializers.ModelSerializer):
    file = serializers.FileField(required=False, allow_null=True, allow_empty_file=True)
    assignment_title = serializers.CharField(source="assignment.title", read_only=True)

    class Meta:
        model = Submission
        fields = [
            "id",
            "assignment",
            "assignment_title",
            "student",
            "file",
            "comment",
            "submitted_at",
            "grade",
            "teacher_comment",
        ]
        read_only_fields = ("student", "submitted_at", "grade", "teacher_comment")
