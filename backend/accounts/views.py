from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status, viewsets, mixins
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.contrib.auth.models import Group, Permission
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken
from tests_app.permissions import IsAdmin
import requests
from datetime import timedelta

from ai.clients import face_analyze, face_match

from .serializers import (
    UserSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    AdminUserSerializer,
    AdminUserWriteSerializer,
    PassportDataSerializer,
    AuditLogSerializer,
    AuthGroupSerializer,
    PermissionSerializer,
    AuthTokenSerializer,
    OutstandingTokenSerializer,
    BlacklistedTokenSerializer,
)
from .models import User, PassportData, AuditLog, EmailVerificationCode
from .audit import log_audit
from teacher_subject.models import TeacherSubject


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        return Response(
            {"detail": "Ro'yxatdan o'tish enrollment orqali amalga oshiriladi."},
            status=status.HTTP_400_BAD_REQUEST,
        )


def _build_tokens(user: User) -> dict:
    refresh = RefreshToken.for_user(user)
    refresh["role"] = getattr(user, "role", None)
    refresh["token_version"] = getattr(user, "token_version", 1)
    refresh["is_staff"] = user.is_staff
    refresh["is_superuser"] = user.is_superuser
    access = refresh.access_token
    return {
        "access": str(access),
        "refresh": str(refresh),
        "role": getattr(user, "role", None),
        "user_id": user.id,
        "token_version": getattr(user, "token_version", 1),
    }


def _fetch_google_profile(token: str) -> dict:
    if not token:
        raise ValidationError({"token": "Token talab qilinadi."})

    tokeninfo_url = "https://oauth2.googleapis.com/tokeninfo"
    try:
        response = requests.get(tokeninfo_url, params={"id_token": token}, timeout=8)
        if response.ok:
            data = response.json()
            if data.get("email"):
                return data

        response = requests.get(tokeninfo_url, params={"access_token": token}, timeout=8)
        if response.ok:
            data = response.json()
            if data.get("email"):
                return data

        userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
        response = requests.get(userinfo_url, headers={"Authorization": f"Bearer {token}"}, timeout=8)
        if response.ok:
            data = response.json()
            if data.get("email"):
                return data
    except requests.RequestException as exc:
        raise ValidationError({"token": "Google bilan ulanishda xatolik."}) from exc

    raise ValidationError({"token": "Google tokeni yaroqsiz."})


def _read_field_bytes(field_file):
    if not field_file:
        return None
    try:
        field_file.open("rb")
        return field_file.read()
    finally:
        try:
            field_file.close()
        except Exception:
            pass


class GoogleOAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token") or request.data.get("credential")
        profile = _fetch_google_profile(token)

        expected_aud = getattr(settings, "GOOGLE_CLIENT_ID", None)
        aud = profile.get("aud")
        if expected_aud and aud and aud != expected_aud:
            raise ValidationError({"token": "Google tokeni noto'g'ri."})

        email = profile.get("email")
        if not email:
            raise ValidationError({"email": "Email topilmadi."})

        user = User.objects.filter(email__iexact=email).first()
        created = False
        if not user:
            base_username = email.split("@")[0]
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=profile.get("given_name") or profile.get("first_name") or "",
                last_name=profile.get("family_name") or profile.get("last_name") or "",
            )
            user.set_unusable_password()
            created = True

        if profile.get("sub") and not user.google_sub:
            user.google_sub = profile.get("sub")

        if profile.get("given_name") and not user.first_name:
            user.first_name = profile.get("given_name")
        if profile.get("family_name") and not user.last_name:
            user.last_name = profile.get("family_name")

        if created:
            user.email_verified = bool(profile.get("email_verified"))
        user.save()

        tokens = _build_tokens(user)
        return Response(
            {
                **tokens,
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class RegistrationProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PassportUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        passport_front = request.FILES.get("passport_front") or request.FILES.get("passport_front_image")
        if not passport_front:
            raise ValidationError({"passport_front": "Passport old tomoni talab qilinadi."})

        request.user.passport_front_image = passport_front
        request.user.save(update_fields=["passport_front_image"])
        return Response({"detail": "Passport yuklandi."}, status=status.HTTP_200_OK)


class FaceVerificationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        selfie = request.FILES.get("selfie") or request.FILES.get("selfie_image")
        if not selfie:
            raise ValidationError({"selfie": "Selfie rasmi talab qilinadi."})

        selfie_bytes = selfie.read()
        analysis = face_analyze(selfie_bytes)
        embedding = None
        faces_detected = 0

        if analysis and isinstance(analysis, dict):
            faces = analysis.get("faces") or []
            faces_detected = len(faces)
            if faces:
                embedding = faces[0].get("embedding")

        if embedding:
            request.user.face_embedding = embedding
        selfie.seek(0)
        request.user.face_image = selfie
        request.user.save(update_fields=["face_embedding", "face_image"])

        match_result = None
        passport_bytes = _read_field_bytes(request.user.passport_front_image)
        if passport_bytes:
            match_result = face_match(passport_bytes, selfie_bytes)

        return Response(
            {
                "detail": "Face verification completed.",
                "faces_detected": faces_detected,
                "has_embedding": bool(embedding),
                "match_result": match_result,
            },
            status=status.HTTP_200_OK,
        )


class EmailVerificationSendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        email = (request.data.get("email") or request.user.email or "").strip()
        if not email:
            raise ValidationError({"email": "Email talab qilinadi."})

        code = f"{User.objects.make_random_password(length=6, allowed_chars='0123456789')}"
        expires_at = timezone.now() + timedelta(minutes=10)

        EmailVerificationCode.objects.create(
            user=request.user,
            email=email,
            code=code,
            expires_at=expires_at,
        )

        subject = "Verification Code"
        message = f"Your verification code is: {code}"
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None) or getattr(settings, "EMAIL_HOST_USER", None)
        send_mail(
            subject,
            message,
            from_email,
            [email],
            fail_silently=False,
        )

        return Response({"detail": "Verification code sent."}, status=status.HTTP_200_OK)


class EmailVerificationConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = (request.data.get("code") or "").strip()
        if not code:
            raise ValidationError({"code": "Verification code talab qilinadi."})

        now = timezone.now()
        record = (
            EmailVerificationCode.objects.filter(user=request.user, is_used=False, expires_at__gt=now)
            .order_by("-created_at")
            .first()
        )

        if not record or record.code != code:
            raise ValidationError({"code": "Verification code noto'g'ri yoki eskirgan."})

        record.is_used = True
        record.save(update_fields=["is_used"])

        request.user.email_verified = True
        request.user.save(update_fields=["email_verified"])

        return Response({"detail": "Email verified."}, status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response({"detail": "Parol yangilandi"})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminSetRoleView(APIView):
    """
    Admin/superuser uchun: user rolini student/teacher/admin ga o'zgartirish.
    Body: { "user_id": int, "role": "student"|"teacher"|"admin" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not (request.user.is_superuser or getattr(request.user, "role", None) == "admin"):
            raise PermissionDenied("Faqat admin o'zgartira oladi.")

        user_id = request.data.get("user_id")
        role = request.data.get("role")
        if not user_id or not role:
            return Response({"detail": "user_id va role kerak"}, status=status.HTTP_400_BAD_REQUEST)

        if role not in dict(User.ROLE_CHOICES):
            return Response({"detail": "Role noto'g'ri"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User topilmadi"}, status=status.HTTP_404_NOT_FOUND)

        old_role = target.role
        target.role = role
        # Admin bo'lsa is_staff yoqamiz, admin emas bo'lsa (superuser emas) is_staff o'chadi
        if role == "admin":
            target.is_staff = True
        elif not target.is_superuser:
            target.is_staff = False
        target.save(update_fields=["role", "is_staff"])
        log_audit(
            request,
            "role_changed",
            user=request.user,
            role=getattr(request.user, "role", None),
            extra={"target_user_id": target.id, "old_role": old_role, "new_role": target.role},
        )
        return Response({"detail": "Role yangilandi", "user_id": target.id, "role": target.role})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        log_audit(request, "logout", user=request.user, role=getattr(request.user, "role", None))
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminUserListView(APIView):
    """
    Admin/superuser uchun userlar ro'yxati.
    Optional: ?role=student|teacher|admin
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.is_superuser or getattr(request.user, "role", None) == "admin"):
            raise PermissionDenied("Faqat admin ko'ra oladi.")

        qs = User.objects.all().order_by("id")
        role = request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)
        serializer = AdminUserSerializer(qs, many=True)
        return Response(serializer.data)


class TeacherStudentListView(APIView):
    """
    Teacher uchun: o'ziga biriktirilgan guruhlardagi studentlar ro'yxati.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = getattr(request.user, "role", None)
        if not (request.user.is_superuser or role == "teacher"):
            raise PermissionDenied("Faqat teacher ko'ra oladi.")

        group_ids = (
            TeacherSubject.objects.filter(teacher=request.user)
            .values_list("groups__id", flat=True)
            .distinct()
        )
        qs = User.objects.filter(role="student", group_id__in=group_ids).order_by("id")
        serializer = UserSerializer(qs, many=True)
        return Response(serializer.data)
class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("id")
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return AdminUserWriteSerializer
        return AdminUserSerializer


class AuditLogViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = AuditLog.objects.select_related("user").order_by("-created_at")
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class PassportDataViewSet(viewsets.ModelViewSet):
    queryset = PassportData.objects.select_related("user").order_by("id")
    serializer_class = PassportDataSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.select_related("content_type").order_by("content_type__app_label", "codename")
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class AuthGroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all().order_by("id")
    serializer_class = AuthGroupSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class AuthTokenViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Token.objects.select_related("user").order_by("-created")
    serializer_class = AuthTokenSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class OutstandingTokenViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = OutstandingToken.objects.select_related("user").order_by("-created_at")
    serializer_class = OutstandingTokenSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class BlacklistedTokenViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = BlacklistedToken.objects.select_related("token", "token__user").order_by("-blacklisted_at")
    serializer_class = BlacklistedTokenSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
