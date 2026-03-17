from rest_framework import serializers

from accounts.admin_registry import upsert_teacher_workload
from groups.models import Group

from .models import TeacherSubject

class TeacherSubjectSerializer(serializers.ModelSerializer):
    groups = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Group.objects.all(),
        required=False,
    )

    def validate(self, attrs):
        teacher = attrs.get("teacher", getattr(self.instance, "teacher", None))
        subject = attrs.get("subject", getattr(self.instance, "subject", None))
        groups = attrs.get("groups")

        if subject is not None:
            effective_groups = list(groups) if groups is not None else (
                list(self.instance.groups.all()) if self.instance else []
            )
            allowed_direction_ids = set(subject.directions.values_list("id", flat=True))
            invalid_groups = [group.name for group in effective_groups if group.direction_id not in allowed_direction_ids]
            if invalid_groups:
                raise serializers.ValidationError(
                    {"groups": f"Tanlangan guruhlar fan yo'nalishiga mos emas: {', '.join(invalid_groups)}."}
                )

        if self.instance and teacher and subject:
            duplicate_exists = (
                TeacherSubject.objects.filter(teacher=teacher, subject=subject)
                .exclude(id=self.instance.id)
                .exists()
            )
            if duplicate_exists:
                raise serializers.ValidationError(
                    {"non_field_errors": ["Bu o'qituvchi ushbu fanga allaqachon biriktirilgan."]}
                )
        return attrs

    def create(self, validated_data):
        mapping, _ = upsert_teacher_workload(
            validated_data["teacher"],
            subject=validated_data["subject"],
            groups=validated_data.get("groups") or [],
        )
        return mapping

    def update(self, instance, validated_data):
        mapping, _ = upsert_teacher_workload(
            validated_data.get("teacher", instance.teacher),
            subject=validated_data.get("subject", instance.subject),
            groups=validated_data.get("groups", instance.groups.all()),
            instance=instance,
        )
        return mapping

    class Meta:
        model = TeacherSubject
        fields = ['id', 'teacher', 'subject', 'groups']
