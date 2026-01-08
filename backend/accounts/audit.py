from typing import Optional

from .models import AuditLog, User


def _get_client_ip(request) -> Optional[str]:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_audit(request, action: str, user: Optional[User] = None, role: Optional[str] = None, extra=None) -> None:
    try:
        AuditLog.objects.create(
            user=user,
            action=action,
            role=role or "",
            ip_address=_get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            extra=extra or {},
        )
    except Exception:
        # Audit log yozishda xato bo'lsa, asosiy oqim buzilmasin.
        return
