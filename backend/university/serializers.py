from rest_framework import serializers

from .models import Campus, Faculty, Department, Degree, StudyMode


class CampusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campus
        fields = "__all__"


class FacultySerializer(serializers.ModelSerializer):
    class Meta:
        model = Faculty
        fields = "__all__"


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = "__all__"


class DegreeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Degree
        fields = "__all__"


class StudyModeSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyMode
        fields = "__all__"
