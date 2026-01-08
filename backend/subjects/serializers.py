from rest_framework import serializers
from .models import Subject

class SubjectSerializer(serializers.ModelSerializer):
    semester_number = serializers.IntegerField(source="semester.number", read_only=True)

    class Meta:
        model = Subject
        fields = ['id', 'name', 'code', 'directions', 'semester', 'semester_number', 'subject_type']
