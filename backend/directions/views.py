from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated

from tests_app.permissions import IsAdmin

from .models import Direction
from .serializers import DirectionSerializer


class DirectionViewSet(viewsets.ModelViewSet):
    queryset = Direction.objects.all()
    serializer_class = DirectionSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        role = getattr(user, "role", None)
        if role == "student" and getattr(user, "group_id", None):
            return qs.filter(id=user.group.direction_id)
        if role == "teacher":
            return qs.filter(group__teachersubject__teacher=user).distinct()
        return qs
