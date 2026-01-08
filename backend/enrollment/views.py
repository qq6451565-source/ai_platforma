from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.exceptions import NotFound, ValidationError, PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from groups.models import Group
from profiles.models import StudentProfile
from tests_app.permissions import IsAdmin

from .models import RegistrationWindow, Applicant, ApplicantDocument, VerificationResult
from .serializers import (
    RegistrationWindowSerializer,
    ApplicantSerializer,
    ApplicantDocumentSerializer,
    VerificationResultSerializer,
)


class RegistrationWindowViewSet(viewsets.ModelViewSet):
    queryset = RegistrationWindow.objects.all()
    serializer_class = RegistrationWindowSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]


class ApplicantViewSet(viewsets.ModelViewSet):
    queryset = Applicant.objects.all()
    serializer_class = ApplicantSerializer

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]


class ApplicantDocumentViewSet(viewsets.ModelViewSet):
    queryset = ApplicantDocument.objects.all()
    serializer_class = ApplicantDocumentSerializer

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]


class VerificationResultViewSet(viewsets.ModelViewSet):
    queryset = VerificationResult.objects.all()
    serializer_class = VerificationResultSerializer

    def get_permissions(self):
        return [IsAuthenticated(), IsAdmin()]


class ApproveApplicantView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, applicant_id):
        if not (request.user.is_superuser or getattr(request.user, "role", None) == "admin"):
            raise PermissionDenied("Faqat admin tasdiqlay oladi.")

        try:
            applicant = Applicant.objects.select_related("direction_choice").get(id=applicant_id)
        except Applicant.DoesNotExist:
            raise NotFound("Applicant topilmadi.")

        if applicant.status == "approved":
            return Response({"detail": "Applicant allaqachon tasdiqlangan."}, status=status.HTTP_200_OK)

        if not applicant.verifications.filter(verified=True).exists():
            raise ValidationError({"detail": "Verification tasdiqlanmagan (verified=True topilmadi)."})

        group_id = request.data.get("group_id")
        if not group_id:
            raise ValidationError({"group_id": "group_id required"})

        try:
            group = Group.objects.get(id=group_id)
        except Group.DoesNotExist:
            raise NotFound("Group topilmadi.")

        direction = applicant.direction_choice or group.direction

        username = applicant.passport_id
        if User.objects.filter(username=username).exists():
            raise ValidationError({"username": "Bu passport_id bilan user mavjud."})

        full_name = applicant.full_name.strip() if applicant.full_name else ""
        parts = full_name.split()
        first_name = parts[0] if parts else ""
        last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

        admission_year = request.data.get("admission_year")
        if admission_year is None:
            admission_year = group.year
        try:
            admission_year = int(admission_year)
        except (TypeError, ValueError):
            raise ValidationError({"admission_year": "admission_year integer bo'lishi kerak."})

        user = User.objects.create_user(
            username=username,
            password=username,
            first_name=first_name,
            last_name=last_name,
            email=applicant.email or "",
            role="student",
            phone=applicant.phone or "",
        )
        user.group = group
        user.save(update_fields=["group"])

        StudentProfile.objects.create(
            user=user,
            direction=direction,
            group=group,
            admission_year=admission_year,
            status="active",
        )

        applicant.status = "approved"
        applicant.approved_by = request.user
        applicant.approved_at = timezone.now()
        applicant.save(update_fields=["status", "approved_by", "approved_at"])

        return Response(
            {
                "student_id": user.id,
                "username": user.username,
                "password": username,
                "group_id": group.id,
                "direction_id": direction.id if direction else None,
            },
            status=status.HTTP_201_CREATED,
        )


class RejectApplicantView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, applicant_id):
        if not (request.user.is_superuser or getattr(request.user, "role", None) == "admin"):
            raise PermissionDenied("Faqat admin rad eta oladi.")

        try:
            applicant = Applicant.objects.get(id=applicant_id)
        except Applicant.DoesNotExist:
            raise NotFound("Applicant topilmadi.")

        if applicant.status == "rejected":
            return Response({"detail": "Applicant allaqachon rad etilgan."}, status=status.HTTP_200_OK)

        applicant.status = "rejected"
        applicant.approved_by = request.user
        applicant.approved_at = timezone.now()
        applicant.save(update_fields=["status", "approved_by", "approved_at"])

        return Response({"detail": "Applicant rad etildi."}, status=status.HTTP_200_OK)
