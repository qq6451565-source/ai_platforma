from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from django.db import close_old_connections
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import User


@database_sync_to_async
def _get_user_from_token(token: str):
    try:
        payload = AccessToken(token)
    except Exception:
        return AnonymousUser()

    user_id = payload.get("user_id")
    if not user_id:
        return AnonymousUser()

    user = User.objects.filter(id=user_id).first()
    if not user:
        return AnonymousUser()

    token_version = payload.get("token_version")
    if token_version is not None and getattr(user, "token_version", None) != token_version:
        return AnonymousUser()

    token_role = payload.get("role")
    if token_role is not None and getattr(user, "role", None) != token_role:
        return AnonymousUser()

    return user


def _extract_token_from_scope(scope) -> str | None:
    query_string = scope.get("query_string", b"").decode("utf-8")
    params = parse_qs(query_string)
    token = params.get("token", [None])[0]
    if token:
        return token

    headers = dict(scope.get("headers", []))
    auth_header = headers.get(b"authorization")
    if not auth_header:
        return None
    value = auth_header.decode("utf-8")
    if value.lower().startswith("bearer "):
        return value.split(" ", 1)[1].strip()
    return None


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        close_old_connections()
        scope_user = scope.get("user")
        if scope_user and getattr(scope_user, "is_authenticated", False):
            return await super().__call__(scope, receive, send)

        token = _extract_token_from_scope(scope)
        if token:
            scope["user"] = await _get_user_from_token(token)
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)

