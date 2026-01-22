from rest_framework import serializers

from directions.models import Direction

from .models import Subject


class SubjectSerializer(serializers.ModelSerializer):
    direction = serializers.PrimaryKeyRelatedField(
        queryset=Direction.objects.all(),
        write_only=True,
        required=False,
    )
    directions = serializers.PrimaryKeyRelatedField(
        queryset=Direction.objects.all(),
        many=True,
    )
    direction_names = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = ["id", "name", "direction", "directions", "direction_names"]

    def get_direction_names(self, obj: Subject):
        return list(obj.directions.values_list("name", flat=True))

    def validate(self, attrs):
        directions = list(attrs.get("directions") or [])
        single = attrs.get("direction")
        if single and single not in directions:
            directions.append(single)
            attrs["directions"] = directions
        if self.instance is None and not directions:
            raise serializers.ValidationError({"directions": "Kamida bitta yo'nalish tanlang."})
        return attrs
