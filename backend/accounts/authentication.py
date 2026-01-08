from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed


class RoleJWTAuthentication(JWTAuthentication):
    """
    JWT ichidagi role qiymati DB dagi user bilan mos bo'lishi shart.
    Mos kelmasa, token bekor hisoblanadi.
    """

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        token_role = validated_token.get("role")
        if token_role is None:
            raise AuthenticationFailed("Token eskirgan.")
        if getattr(user, "role", None) != token_role:
            raise AuthenticationFailed("Token role mos emas.")
        return user
