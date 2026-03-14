from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from django.conf import settings

from .models import Attendance


DEFAULT_MISSING_ATTENDANCE_REASON = "Bu dars uchun davomat topilmadi."
DEFAULT_PENDING_REASON = "Live dars davomi hali yakunlanmagan."
DEFAULT_ABSENT_REASON = "Darsda qatnashmagansiz."
DEFAULT_MISSING_LESSON_REASON = "Baholash shu darsga biriktirilmagan."
DEFAULT_ELIGIBLE_REASON = "Unlock uchun shartlar bajarilgan."
DEFAULT_NO_PROGRESS_REASON = "Davomat hali yig'ilmagan."
DEFAULT_FACE_SAMPLES_REASON = "Face tekshiruvi yetarli emas."
DEFAULT_FACE_RATIO_REASON = "Face ratio yetarli emas."
DEFAULT_DURATION_REASON = "Qatnashuv foizi yetarli emas."


def get_live_attendance_thresholds() -> dict[str, float | int]:
    minimum_face_checks = max(1, int(getattr(settings, "FACE_ATTENDANCE_MIN_SAMPLES", 3) or 3))
    face_ratio_threshold = float(
        max(0.1, min(1.0, float(getattr(settings, "FACE_ATTENDANCE_PRESENT_RATIO", 0.50) or 0.50)))
    )
    duration_ratio_threshold = float(
        max(0.1, min(1.0, float(getattr(settings, "LIVE_ATTENDANCE_MIN_DURATION_RATIO", 0.70) or 0.70)))
    )
    return {
        "minimum_face_checks": minimum_face_checks,
        "face_ratio_threshold": face_ratio_threshold,
        "duration_ratio_threshold": duration_ratio_threshold,
    }


def _resolve_preview_reason(
    *,
    joined_ratio: float,
    face_ratio: float,
    face_checks: int,
    minimum_face_checks: int,
    face_ratio_threshold: float,
    duration_ratio_threshold: float,
    fallback: str,
) -> str:
    if face_checks < minimum_face_checks:
        return DEFAULT_FACE_SAMPLES_REASON
    if joined_ratio < duration_ratio_threshold:
        return DEFAULT_DURATION_REASON
    if face_ratio < face_ratio_threshold:
        return DEFAULT_FACE_RATIO_REASON
    return fallback


def build_live_attendance_preview(
    *,
    joined_ratio: float | None,
    face_ratio: float | None,
    face_checks: int | None,
    finalized: bool = False,
    attendance_status: str | None = None,
) -> dict[str, Any]:
    thresholds = get_live_attendance_thresholds()
    joined_ratio_value = max(0.0, float(joined_ratio or 0.0))
    face_ratio_value = max(0.0, float(face_ratio or 0.0))
    face_checks_value = max(0, int(face_checks or 0))

    minimum_face_checks = int(thresholds["minimum_face_checks"])
    face_ratio_threshold = float(thresholds["face_ratio_threshold"])
    duration_ratio_threshold = float(thresholds["duration_ratio_threshold"])

    meets_face_samples = face_checks_value >= minimum_face_checks
    meets_face_ratio = face_ratio_value >= face_ratio_threshold
    meets_duration_ratio = joined_ratio_value >= duration_ratio_threshold
    meets_unlock_now = meets_face_samples and meets_face_ratio and meets_duration_ratio

    if finalized and attendance_status == "present":
        preview_status = "eligible"
        preview_reason = "Yakuniy davomat tasdiqlandi."
    elif finalized and attendance_status == "absent":
        preview_status = "blocked"
        preview_reason = _resolve_preview_reason(
            joined_ratio=joined_ratio_value,
            face_ratio=face_ratio_value,
            face_checks=face_checks_value,
            minimum_face_checks=minimum_face_checks,
            face_ratio_threshold=face_ratio_threshold,
            duration_ratio_threshold=duration_ratio_threshold,
            fallback=DEFAULT_ABSENT_REASON,
        )
    elif meets_unlock_now:
        preview_status = "eligible"
        preview_reason = DEFAULT_ELIGIBLE_REASON
    elif face_checks_value == 0 and joined_ratio_value <= 0:
        preview_status = "blocked"
        preview_reason = DEFAULT_NO_PROGRESS_REASON
    else:
        preview_status = "risk"
        preview_reason = _resolve_preview_reason(
            joined_ratio=joined_ratio_value,
            face_ratio=face_ratio_value,
            face_checks=face_checks_value,
            minimum_face_checks=minimum_face_checks,
            face_ratio_threshold=face_ratio_threshold,
            duration_ratio_threshold=duration_ratio_threshold,
            fallback=DEFAULT_PENDING_REASON,
        )

    return {
        "status": preview_status,
        "reason": preview_reason,
        "meets_unlock_now": meets_unlock_now,
        "meets_minimum_face_checks": meets_face_samples,
        "meets_face_ratio": meets_face_ratio,
        "meets_duration_ratio": meets_duration_ratio,
        "minimum_face_checks": minimum_face_checks,
        "face_ratio_threshold": face_ratio_threshold,
        "duration_ratio_threshold": duration_ratio_threshold,
    }


def _blocked_missing_lesson_snapshot() -> dict[str, Any]:
    return {
        "allowed": False,
        "status": "blocked_missing_lesson",
        "reason": DEFAULT_MISSING_LESSON_REASON,
        "attendance_status": None,
        "attendance_finalized": False,
        "attendance_finalized_at": None,
        "attendance_joined_ratio": None,
        "attendance_face_verified_ratio": None,
        "attendance_joined_seconds": None,
        "attendance_face_check_count": 0,
        "attendance_face_success_count": 0,
        "attendance_preview_status": "blocked",
        "attendance_preview_reason": DEFAULT_MISSING_LESSON_REASON,
    }


def build_lesson_access_snapshot(attendance: Attendance | None) -> dict[str, Any]:
    if attendance is None:
        snapshot = _blocked_missing_lesson_snapshot()
        snapshot.update(
            status="blocked_no_attendance",
            reason=DEFAULT_MISSING_ATTENDANCE_REASON,
        )
        return snapshot

    snapshot = {
        "allowed": False,
        "status": "pending_attendance",
        "reason": DEFAULT_PENDING_REASON,
        "attendance_status": attendance.status,
        "attendance_finalized": attendance.finalized,
        "attendance_finalized_at": attendance.finalized_at,
        "attendance_joined_ratio": attendance.joined_ratio,
        "attendance_face_verified_ratio": attendance.face_verified_ratio,
        "attendance_joined_seconds": attendance.joined_seconds,
        "attendance_face_check_count": attendance.face_check_count,
        "attendance_face_success_count": attendance.face_success_count,
    }
    preview = build_live_attendance_preview(
        joined_ratio=attendance.joined_ratio,
        face_ratio=attendance.face_verified_ratio,
        face_checks=attendance.face_check_count,
        finalized=attendance.finalized,
        attendance_status=attendance.status,
    )
    snapshot["attendance_preview_status"] = preview["status"]
    snapshot["attendance_preview_reason"] = preview["reason"]

    if not attendance.finalized:
        return snapshot

    if attendance.status != "present":
        snapshot.update(
            status="blocked_absent",
            reason=DEFAULT_ABSENT_REASON,
        )
        return snapshot

    snapshot.update(
        allowed=True,
        status="open",
        reason=None,
    )
    return snapshot


def get_latest_lesson_attendance_map(student, lesson_ids: Iterable[int | None]) -> dict[int, Attendance]:
    normalized_lesson_ids = sorted({int(lesson_id) for lesson_id in lesson_ids if lesson_id})
    if not student or not normalized_lesson_ids:
        return {}

    records = Attendance.objects.filter(
        student=student,
        lesson_id__in=normalized_lesson_ids,
    ).order_by("lesson_id", "-timestamp", "-id")

    latest_records: dict[int, Attendance] = {}
    for record in records:
        latest_records.setdefault(record.lesson_id, record)
    return latest_records


def get_lesson_access_snapshots(student, lesson_ids: Iterable[int | None]) -> dict[int, dict[str, Any]]:
    normalized_lesson_ids = [int(value) for value in lesson_ids if value]
    attendance_map = get_latest_lesson_attendance_map(student, normalized_lesson_ids)
    snapshots: dict[int, dict[str, Any]] = {}
    for lesson_id in sorted(set(normalized_lesson_ids)):
        snapshots[lesson_id] = build_lesson_access_snapshot(attendance_map.get(lesson_id))
    return snapshots


def get_lesson_access_snapshot(student, lesson_id: int | None) -> dict[str, Any]:
    if not lesson_id:
        return _blocked_missing_lesson_snapshot()

    attendance = Attendance.objects.filter(
        student=student,
        lesson_id=lesson_id,
    ).order_by("-timestamp", "-id").first()
    return build_lesson_access_snapshot(attendance)


def get_lesson_attendance_eligibility(student, lesson_id: int | None) -> tuple[bool, str | None]:
    """
    Centralized access rule for lesson-bound assessments.

    Access is granted only after live attendance has been finalized
    and the student is marked present for that exact lesson.
    """
    snapshot = get_lesson_access_snapshot(student, lesson_id)
    return bool(snapshot["allowed"]), snapshot["reason"]
