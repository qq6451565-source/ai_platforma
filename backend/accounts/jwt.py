from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import status
from rest_framework.response import Response

from .audit import log_audit


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = getattr(user, "role", None)
        token["token_version"] = getattr(user, "token_version", 1)
        token["is_staff"] = user.is_staff
        token["is_superuser"] = user.is_superuser
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user_id"] = self.user.id
        data["role"] = getattr(self.user, "role", None)
        data["token_version"] = getattr(self.user, "token_version", 1)
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            log_audit(
                request,
                "login_failed",
                user=None,
                role=None,
                extra={"username": request.data.get("username")},
            )
            raise

        data = serializer.validated_data
        log_audit(request, "login_success", user=serializer.user, role=getattr(serializer.user, "role", None))
        return Response(data, status=status.HTTP_200_OK)


class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        refresh = self.token
        user_id = refresh.get("user_id")
        token_role = refresh.get("role")
        token_version = refresh.get("token_version")
        User = get_user_model()
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise AuthenticationFailed("Foydalanuvchi topilmadi.")
        if token_role is None:
            raise AuthenticationFailed("Token eskirgan.")
        if getattr(user, "role", None) != token_role:
            raise AuthenticationFailed("Token role mos emas.")
        # Refresh orqali yangi token olishdan oldin version tekshiriladi
        if token_version is not None and int(token_version) != int(getattr(user, "token_version", 1)):
            raise AuthenticationFailed("Token bekor qilingan. Qayta kiring.")
        return data
