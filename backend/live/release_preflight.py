from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any
from urllib.parse import urlparse

from django.conf import settings
from django.db import DEFAULT_DB_ALIAS, connections
from django.db.migrations.executor import MigrationExecutor
from django.db.utils import OperationalError, ProgrammingError
from django.utils import timezone

DEFAULT_SECRET_KEY = "django-insecure-test-key"
DEFAULT_LIVEKIT_URL = "ws://127.0.0.1:7880"
DEFAULT_LIVEKIT_API_KEY = "devkey"
DEFAULT_LIVEKIT_API_SECRET = "devsecret_very_long_32_chars_minimum"

STATUS_PASS = "pass"
STATUS_WARN = "warn"
STATUS_FAIL = "fail"


@dataclass(frozen=True)
class PreflightCheck:
    key: str
    label: str
    status: str
    message: str
    details: dict[str, Any] | None = None

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


def get_pending_migration_names() -> list[str]:
    connection = connections[DEFAULT_DB_ALIAS]
    executor = MigrationExecutor(connection)
    targets = executor.loader.graph.leaf_nodes()
    plan = executor.migration_plan(targets)
    pending: list[str] = []
    for migration, backwards in plan:
        if backwards:
            continue
        name = f"{migration.app_label}.{migration.name}"
        if name not in pending:
            pending.append(name)
    return pending


def _is_local_livekit_url(value: str) -> bool:
    parsed = urlparse(value)
    hostname = (parsed.hostname or "").lower()
    return hostname in {"127.0.0.1", "localhost", "::1"}


def _check_pending_migrations() -> PreflightCheck:
    try:
        pending = get_pending_migration_names()
    except (OperationalError, ProgrammingError) as exc:
        return PreflightCheck(
            key="pending_migrations",
            label="Pending migrations",
            status=STATUS_FAIL,
            message="Migratsiya holatini tekshirib bo'lmadi.",
            details={"error": str(exc)},
        )

    if pending:
        preview = pending[:5]
        return PreflightCheck(
            key="pending_migrations",
            label="Pending migrations",
            status=STATUS_FAIL,
            message=f"{len(pending)} ta unapplied migration bor.",
            details={"pending": preview, "total": len(pending)},
        )
    return PreflightCheck(
        key="pending_migrations",
        label="Pending migrations",
        status=STATUS_PASS,
        message="Unapplied migration topilmadi.",
    )


def _check_secret_key() -> PreflightCheck:
    secret_key = (getattr(settings, "SECRET_KEY", "") or "").strip()
    if not secret_key:
        return PreflightCheck(
            key="secret_key",
            label="Secret key",
            status=STATUS_FAIL,
            message="SECRET_KEY bo'sh.",
        )
    if secret_key == DEFAULT_SECRET_KEY:
        return PreflightCheck(
            key="secret_key",
            label="Secret key",
            status=STATUS_FAIL,
            message="SECRET_KEY default qiymatda qolgan.",
        )
    if len(secret_key) < 32:
        return PreflightCheck(
            key="secret_key",
            label="Secret key",
            status=STATUS_WARN,
            message="SECRET_KEY juda qisqa; production uchun kuchaytirish kerak.",
            details={"length": len(secret_key)},
        )
    return PreflightCheck(
        key="secret_key",
        label="Secret key",
        status=STATUS_PASS,
        message="SECRET_KEY productionga mos ko'rinadi.",
        details={"length": len(secret_key)},
    )


def _check_runtime_settings() -> PreflightCheck:
    debug = bool(getattr(settings, "DEBUG", False))
    allowed_hosts = list(getattr(settings, "ALLOWED_HOSTS", []) or [])
    csrf_origins = list(getattr(settings, "CSRF_TRUSTED_ORIGINS", []) or [])
    details = {
        "debug": debug,
        "allowed_hosts": allowed_hosts,
        "csrf_trusted_origins_count": len(csrf_origins),
    }
    if debug:
        return PreflightCheck(
            key="runtime",
            label="Runtime settings",
            status=STATUS_WARN,
            message="DEBUG=True. Release oldidan False qilish kerak.",
            details=details,
        )
    if not allowed_hosts:
        return PreflightCheck(
            key="runtime",
            label="Runtime settings",
            status=STATUS_FAIL,
            message="ALLOWED_HOSTS bo'sh.",
            details=details,
        )
    if not csrf_origins:
        return PreflightCheck(
            key="runtime",
            label="Runtime settings",
            status=STATUS_WARN,
            message="CSRF_TRUSTED_ORIGINS bo'sh; staging/prod originlarini kiriting.",
            details=details,
        )
    return PreflightCheck(
        key="runtime",
        label="Runtime settings",
        status=STATUS_PASS,
        message="DEBUG, ALLOWED_HOSTS va CSRF originlar release uchun tayyor.",
        details=details,
    )


def _check_agora_settings() -> PreflightCheck:
    app_id = (getattr(settings, "AGORA_APP_ID", "") or "").strip()
    app_certificate = (getattr(settings, "AGORA_APP_CERTIFICATE", "") or "").strip()
    missing = []
    if not app_id:
        missing.append("AGORA_APP_ID")
    if not app_certificate:
        missing.append("AGORA_APP_CERTIFICATE")
    if missing:
        return PreflightCheck(
            key="agora",
            label="Agora RTC",
            status=STATUS_FAIL,
            message="Agora token generation uchun majburiy env yetishmayapti.",
            details={"missing": missing},
        )
    return PreflightCheck(
        key="agora",
        label="Agora RTC",
        status=STATUS_PASS,
        message="Agora env tayyor.",
        details={"app_id_present": True, "certificate_present": True},
    )


def _check_livekit_settings() -> PreflightCheck:
    url = (getattr(settings, "LIVEKIT_URL", "") or "").strip()
    api_key = (getattr(settings, "LIVEKIT_API_KEY", "") or "").strip()
    api_secret = (getattr(settings, "LIVEKIT_API_SECRET", "") or "").strip()
    if not url or not api_key or not api_secret:
        missing = []
        if not url:
            missing.append("LIVEKIT_URL")
        if not api_key:
            missing.append("LIVEKIT_API_KEY")
        if not api_secret:
            missing.append("LIVEKIT_API_SECRET")
        return PreflightCheck(
            key="livekit",
            label="LiveKit compatibility",
            status=STATUS_FAIL,
            message="LiveKit compatibility env to'liq emas.",
            details={"missing": missing},
        )

    uses_defaults = (
        url == DEFAULT_LIVEKIT_URL
        or api_key == DEFAULT_LIVEKIT_API_KEY
        or api_secret == DEFAULT_LIVEKIT_API_SECRET
        or _is_local_livekit_url(url)
    )
    if uses_defaults:
        return PreflightCheck(
            key="livekit",
            label="LiveKit compatibility",
            status=STATUS_WARN,
            message="LiveKit env lokal/dev qiymatlarda qolgan.",
            details={"url": url, "using_default_credentials": True},
        )
    return PreflightCheck(
        key="livekit",
        label="LiveKit compatibility",
        status=STATUS_PASS,
        message="LiveKit compatibility env tayyor.",
        details={"url": url, "using_default_credentials": False},
    )


def _check_attendance_thresholds() -> PreflightCheck:
    min_samples = int(getattr(settings, "FACE_ATTENDANCE_MIN_SAMPLES", 0) or 0)
    face_ratio = float(getattr(settings, "FACE_ATTENDANCE_PRESENT_RATIO", 0) or 0)
    duration_ratio = float(getattr(settings, "LIVE_ATTENDANCE_MIN_DURATION_RATIO", 0) or 0)
    stale_seconds = int(getattr(settings, "LIVE_PARTICIPANT_STALE_SECONDS", 0) or 0)
    details = {
        "min_samples": min_samples,
        "face_ratio": face_ratio,
        "duration_ratio": duration_ratio,
        "stale_seconds": stale_seconds,
    }
    invalid = []
    if min_samples < 3:
        invalid.append("FACE_ATTENDANCE_MIN_SAMPLES < 3")
    if not 0.5 <= face_ratio <= 0.95:
        invalid.append("FACE_ATTENDANCE_PRESENT_RATIO 0.50..0.95 oralig'ida emas")
    if not 0.5 <= duration_ratio <= 0.95:
        invalid.append("LIVE_ATTENDANCE_MIN_DURATION_RATIO 0.50..0.95 oralig'ida emas")
    if stale_seconds < 5:
        invalid.append("LIVE_PARTICIPANT_STALE_SECONDS < 5")
    if invalid:
        return PreflightCheck(
            key="attendance_thresholds",
            label="Attendance thresholds",
            status=STATUS_FAIL,
            message="Attendance thresholdlarida noto'g'ri qiymat bor.",
            details={**details, "issues": invalid},
        )

    soft_thresholds = []
    if min_samples < 6:
        soft_thresholds.append("min_samples < 6")
    if face_ratio < 0.65:
        soft_thresholds.append("face_ratio < 0.65")
    if duration_ratio < 0.70:
        soft_thresholds.append("duration_ratio < 0.70")
    if stale_seconds > 120:
        soft_thresholds.append("stale_seconds > 120")

    if soft_thresholds:
        return PreflightCheck(
            key="attendance_thresholds",
            label="Attendance thresholds",
            status=STATUS_WARN,
            message="Attendance thresholdlar release uchun yumshoq.",
            details={**details, "issues": soft_thresholds},
        )
    return PreflightCheck(
        key="attendance_thresholds",
        label="Attendance thresholds",
        status=STATUS_PASS,
        message="Attendance thresholdlar production baselinega mos.",
        details=details,
    )


def build_release_preflight_report() -> dict[str, Any]:
    checks = [
        _check_pending_migrations(),
        _check_secret_key(),
        _check_runtime_settings(),
        _check_agora_settings(),
        _check_livekit_settings(),
        _check_attendance_thresholds(),
    ]

    counts = {
        STATUS_PASS: sum(1 for check in checks if check.status == STATUS_PASS),
        STATUS_WARN: sum(1 for check in checks if check.status == STATUS_WARN),
        STATUS_FAIL: sum(1 for check in checks if check.status == STATUS_FAIL),
    }
    overall_status = STATUS_PASS
    if counts[STATUS_FAIL]:
        overall_status = STATUS_FAIL
    elif counts[STATUS_WARN]:
        overall_status = STATUS_WARN

    return {
        "generated_at": timezone.now().isoformat(),
        "overall_status": overall_status,
        "counts": counts,
        "checks": [check.as_dict() for check in checks],
    }
