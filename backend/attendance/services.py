from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from .models import Attendance


DEFAULT_MISSING_ATTENDANCE_REASON = "Bu dars uchun davomat topilmadi."
DEFAULT_PENDING_REASON = "Live dars davomi hali yakunlanmagan."
DEFAULT_ABSENT_REASON = "Darsda qatnashmagansiz."
DEFAULT_MISSING_LESSON_REASON = "Baholash shu darsga biriktirilmagan."


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
