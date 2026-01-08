from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from tests_app.permissions import IsAdmin

from .models import Campus, Faculty, Department, Degree, StudyMode
from .serializers import (
    CampusSerializer,
    FacultySerializer,
    DepartmentSerializer,
    DegreeSerializer,
    StudyModeSerializer,
)


class AdminWriteViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]


class CampusViewSet(AdminWriteViewSet):
    queryset = Campus.objects.all()
    serializer_class = CampusSerializer


class FacultyViewSet(AdminWriteViewSet):
    queryset = Faculty.objects.all()
    serializer_class = FacultySerializer


class DepartmentViewSet(AdminWriteViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer


class DegreeViewSet(AdminWriteViewSet):
    queryset = Degree.objects.all()
    serializer_class = DegreeSerializer


class StudyModeViewSet(AdminWriteViewSet):
    queryset = StudyMode.objects.all()
    serializer_class = StudyModeSerializer


