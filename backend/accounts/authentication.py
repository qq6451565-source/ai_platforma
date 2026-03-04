from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed


class RoleJWTAuthentication(JWTAuthentication):
    """
    JWT ichidagi role va token_version qiymatlari DB dagi user bilan mos bo'lishi shart.
    Mos kelmasa yoki version eski bo'lsa, token bekor hisoblanadi.
    """

    def get_user(self, validated_token):
        user = super().get_user(validated_token)

        token_role = validated_token.get("role")
        if token_role is None:
            raise AuthenticationFailed("Token eskirgan.")
        if getattr(user, "role", None) != token_role:
            raise AuthenticationFailed("Token role mos emas.")

        # token_version mismatch → admin rol o'zgartirgan yoki logout qilingan
        token_version = validated_token.get("token_version")
        if token_version is not None and int(token_version) != int(getattr(user, "token_version", 1)):
            raise AuthenticationFailed("Token bekor qilingan. Qayta kiring.")

        return user
