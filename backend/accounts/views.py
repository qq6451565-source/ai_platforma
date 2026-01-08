from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status, viewsets, mixins
from rest_framework.exceptions import PermissionDenied
from django.contrib.auth.models import Group, Permission
from rest_framework.authtoken.models import Token
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from tests_app.permissions import IsAdmin

from .serializers import (
    RegisterSerializer,
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
from .models import User, PassportData, AuditLog
from .jwt import CustomTokenObtainPairSerializer
from .audit import log_audit


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data.copy()
        # Ochiq registratsiya faqat student uchun
        data.pop("role", None)
        serializer = RegisterSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()

        selfie = request.FILES.get("selfie_image")
        if selfie:
            user.face_image = selfie
            user.save(update_fields=["face_image"])

        refresh = CustomTokenObtainPairSerializer.get_token(user)
        return Response(
            {
                "message": "User created",
                "user_id": user.id,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


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
