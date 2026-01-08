from rest_framework import serializers

from teacher_subject.models import TeacherSubject

from .models import Material


class MaterialSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    teacher_name = serializers.CharField(source="teacher.username", read_only=True)
    group_name = serializers.CharField(source="group.name", read_only=True)

    class Meta:
        model = Material
        fields = [
            'id', 'title', 'description', 'subject', 'subject_name',
            'teacher', 'teacher_name', 'group', 'group_name',
            'material_type', 'file', 'created_at'
        ]

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and getattr(user, "role", None) == "teacher":
            if "teacher" in attrs and attrs["teacher"] != user:
                raise serializers.ValidationError({"teacher": "O'qituvchi faqat o'zi uchun material qo'sha oladi."})
        teacher = attrs.get("teacher") or getattr(self.instance, "teacher", None) or (
            user if user and getattr(user, "role", None) == "teacher" else None
        )
        subject = attrs.get("subject") or getattr(self.instance, "subject", None)
        group = attrs.get("group") or getattr(self.instance, "group", None)
        if teacher and subject and group:
            has_map = TeacherSubject.objects.filter(
                teacher=teacher,
                subject=subject,
                groups=group,
            ).exists()
            if not has_map:
                raise serializers.ValidationError(
                    {"group": "O'qituvchi bu fan va guruhga biriktirilmagan."}
                )
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and getattr(user, "role", None) == "teacher":
            validated_data["teacher"] = user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and getattr(user, "role", None) == "teacher":
            validated_data["teacher"] = user
        return super().update(instance, validated_data)
