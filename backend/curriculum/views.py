from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from tests_app.permissions import IsAdmin

from .models import Curriculum
from .serializers import CurriculumSerializer


class CurriculumViewSet(viewsets.ModelViewSet):
    queryset = Curriculum.objects.all()
    serializer_class = CurriculumSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]
