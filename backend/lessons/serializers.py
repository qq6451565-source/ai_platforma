from rest_framework import serializers
from .models import Lesson


class LessonSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="teacher_subject.subject.name", read_only=True)
    group_name = serializers.CharField(source="group.name", read_only=True)

    class Meta:
        model = Lesson
        fields = [
            'id', 'teacher_subject', 'group', 'group_name', 'subject_name', 
            'topic', 'start_time', 'end_time', 'lesson_type', 'video_material'
        ]

    def validate(self, attrs):
        teacher_subject = attrs.get("teacher_subject") or getattr(self.instance, "teacher_subject", None)
        group = attrs.get("group") or getattr(self.instance, "group", None)
        if teacher_subject and group:
            if not teacher_subject.groups.filter(id=group.id).exists():
                raise serializers.ValidationError(
                    {"group": "Bu guruh tanlangan o'qituvchi-fan biriktirishida mavjud emas."}
                )
        return attrs
