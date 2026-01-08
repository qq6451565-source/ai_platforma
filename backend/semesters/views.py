from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from tests_app.permissions import IsAdmin

from .models import Semester, SemesterSettings
from .serializers import SemesterSerializer, SemesterSettingsSerializer


class SemesterViewSet(viewsets.ModelViewSet):
    queryset = Semester.objects.all()
    serializer_class = SemesterSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        role = getattr(user, "role", None)
        if role == "student" and getattr(user, "group_id", None):
            return qs.filter(id=user.group.semester_id)
        if role == "teacher":
            return qs.filter(group__teachersubject__teacher=user).distinct()
        return qs


class SemesterSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method in ["PUT", "PATCH"]:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get(self, request):
        settings = SemesterSettings.get_solo()
        if not settings.active_semester_id:
            SemesterSettings.get_active_semester()
            settings.refresh_from_db()
        serializer = SemesterSettingsSerializer(settings)
        return Response(serializer.data)

    def patch(self, request):
        settings = SemesterSettings.get_solo()
        serializer = SemesterSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
