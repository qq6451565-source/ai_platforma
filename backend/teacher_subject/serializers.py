from rest_framework import serializers
from .models import TeacherSubject

class TeacherSubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherSubject
        fields = ['id', 'teacher', 'subject', 'groups']
