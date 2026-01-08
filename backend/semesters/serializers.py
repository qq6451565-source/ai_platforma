from rest_framework import serializers
from .models import Semester, SemesterSettings

class SemesterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Semester
        fields = ['id', 'number']


class SemesterSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SemesterSettings
        fields = ["id", "active_semester", "updated_at"]
