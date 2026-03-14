from __future__ import annotations

from typing import Tuple

from .models import Attendance


def get_lesson_attendance_eligibility(student, lesson_id: int) -> Tuple[bool, str | None]:
    """
    Centralized access rule for lesson-bound assessments.

    Access is granted only after live attendance has been finalized
    and the student is marked present for that exact lesson.
    """
    attendance = Attendance.objects.filter(
        student=student,
        lesson_id=lesson_id,
    ).order_by("-timestamp", "-id").first()

    if not attendance:
        return False, "Bu dars uchun davomat topilmadi."
    if not attendance.finalized:
        return False, "Live dars davomi hali yakunlanmagan."
    if attendance.status != "present":
        return False, "Darsda qatnashmagansiz."
    return True, None
