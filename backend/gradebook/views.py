from rest_framework import viewsets

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound, PermissionDenied

from tests_app.permissions import IsTeacherOrAdmin

from .models import GradebookEntry
from .serializers import GradebookEntrySerializer


class GradebookEntryViewSet(viewsets.ModelViewSet):
    """
    Read: barcha role (authenticated). Student faqat o'z yozuvlarini ko'radi.
    Write: teacher/admin.
    """
    queryset = GradebookEntry.objects.all()
    serializer_class = GradebookEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsTeacherOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        role = getattr(user, "role", None)
        if role == "student":
            qs = qs.filter(student=user)
        return qs


class RecalculateGradebookView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, entry_id):
        if getattr(request.user, "role", None) not in ["teacher", "admin"] and not request.user.is_superuser:
            raise PermissionDenied("Faqat teacher yoki admin qayta hisoblay oladi.")

        try:
            entry = GradebookEntry.objects.get(id=entry_id)
        except GradebookEntry.DoesNotExist:
            raise NotFound("GradebookEntry topilmadi.")

        entry.total_score = entry.calculate_total()
        entry.save(update_fields=["total_score"])

        return Response(
            {
                "entry_id": entry.id,
                "total_score": entry.total_score,
            },
            status=status.HTTP_200_OK,
        )
