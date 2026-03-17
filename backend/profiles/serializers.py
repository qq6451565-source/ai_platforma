from rest_framework import serializers

from accounts.admin_registry import upsert_student_placement

from .models import StudentProfile, TeacherProfile


class StudentProfileSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        direction = attrs.get("direction", getattr(self.instance, "direction", None))
        group = attrs.get("group", getattr(self.instance, "group", None))
        if group and direction and group.direction_id != direction.id:
            raise serializers.ValidationError(
                {"group": "Tanlangan guruh tanlangan yo'nalishga tegishli emas."}
            )
        return attrs

    def create(self, validated_data):
        return upsert_student_placement(
            validated_data["user"],
            group=validated_data.get("group"),
            direction=validated_data.get("direction"),
            admission_year=validated_data.get("admission_year"),
            status=validated_data.get("status"),
        )

    def update(self, instance, validated_data):
        return upsert_student_placement(
            instance.user,
            group=validated_data.get("group", instance.group),
            direction=validated_data.get("direction", instance.direction),
            admission_year=validated_data.get("admission_year", instance.admission_year),
            status=validated_data.get("status", instance.status),
        )

    class Meta:
        model = StudentProfile
        fields = "__all__"


class TeacherProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherProfile
        fields = "__all__"
