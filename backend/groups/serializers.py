from rest_framework import serializers
from .models import Group

class GroupSerializer(serializers.ModelSerializer):
    semester_number = serializers.IntegerField(source="semester.number", read_only=True)

    class Meta:
        model = Group
        fields = ['id', 'name', 'direction', 'semester', 'semester_number', 'language', 'year']
        extra_kwargs = {
            "name": {"required": False, "allow_blank": True},
            "language": {"required": False, "allow_blank": True},
            "semester": {"required": False},
        }
