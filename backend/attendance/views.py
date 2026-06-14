from django.conf import settings
from django.db import transaction
from django.utils import timezone
import logging
import re
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import NotFound, ValidationError

from ai.clients import presence_check
from ai.models import AISettings
from lessons.models import Lesson
from .models import Attendance, AttendanceOverrideLog, LessonActivityLog
from .serializers import (
    AttendanceOverrideLogSerializer,
    AttendanceSerializer,
    LessonActivityLogSerializer,
    MarkAttendanceSerializer,
)

logger = logging.getLogger(__name__)


def _ensure_staff_can_access_lesson(request, lesson_id: int) -> Lesson:
    role = getattr(request.user, "role", None)
    try:
        lesson = Lesson.objects.select_related("teacher_subject__teacher").get(id=lesson_id)
    except Lesson.DoesNotExist:
        raise NotFound("Lesson topilmadi.")

    if request.user.is_superuser or role == "admin":
        return lesson

    if role == "teacher" and lesson.teacher_subject_id and lesson.teacher_subject.teacher_id == request.user.id:
        return lesson

    raise PermissionDenied("Bu dars sizga tegishli emas.")


class MarkAttendanceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        role = getattr(request.user, "role", None)
        if not (request.user.is_superuser or role in ["teacher", "admin"]):
            raise PermissionDenied("Faqat teacher yoki admin davomat belgilaydi.")

        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        if "lesson_id" in data and "lesson" not in data:
            data["lesson"] = data.get("lesson_id")
        if "student_id" in data and "student" not in data:
            data["student"] = data.get("student_id")
        raw_status = data.get("status")
        if isinstance(raw_status, str):
            cleaned = re.sub(r"[^a-z]", "", raw_status.strip().lower())
            if cleaned in ["bor", "present"]:
                data["status"] = "present"
            elif cleaned in ["yoq", "absent", "no"]:
                data["status"] = "absent"

        serializer = MarkAttendanceSerializer(data=data)
        if serializer.is_valid():
            lesson = Lesson.objects.select_related("teacher_subject__teacher").get(
                id=serializer.validated_data["lesson"].id
            )
            student = serializer.validated_data["student"]
            if role == "teacher" and lesson.teacher_subject.teacher_id != request.user.id:
                raise PermissionDenied("Bu dars sizga tegishli emas.")
            status_value = serializer.validated_data["status"]
            reason = serializer.validated_data["reason"]

            with transaction.atomic():
                qs = Attendance.objects.select_for_update().filter(lesson=lesson, student=student).order_by("-timestamp", "-id")
                obj = qs.first()
                previous_status = obj.status if obj else None
                previous_finalized = bool(obj.finalized) if obj else False
                now = timezone.now()

                if obj:
                    if qs.count() > 1:
                        qs.exclude(id=obj.id).delete()
                    obj.status = status_value
                    obj.finalized = True
                    obj.finalized_at = now
                    obj.manual_override = True
                    obj.override_reason = reason
                    obj.overridden_by = request.user
                    obj.overridden_at = now
                    obj.save(update_fields=[
                        "status",
                        "finalized",
                        "finalized_at",
                        "manual_override",
                        "override_reason",
                        "overridden_by",
                        "overridden_at",
                    ])
                else:
                    obj = Attendance.objects.create(
                        lesson=lesson,
                        student=student,
                        status=status_value,
                        finalized=True,
                        finalized_at=now,
                        manual_override=True,
                        override_reason=reason,
                        overridden_by=request.user,
                        overridden_at=now,
                    )

                AttendanceOverrideLog.objects.create(
                    attendance=obj,
                    lesson=lesson,
                    student=student,
                    previous_status=previous_status,
                    new_status=obj.status,
                    previous_finalized=previous_finalized,
                    new_finalized=obj.finalized,
                    reason=reason,
                    changed_by=request.user,
                )

            return Response({
                "message": "Davomat saqlandi",
                "attendance_id": obj.id,
                "status": obj.status,
                "manual_override": obj.manual_override,
                "override_reason": obj.override_reason,
            })
        logger.warning("MarkAttendance invalid payload: %s", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LessonAttendanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, lesson_id):
        _ensure_staff_can_access_lesson(request, lesson_id)

        records = Attendance.objects.select_related("overridden_by").filter(lesson_id=lesson_id)
        serializer = AttendanceSerializer(records, many=True)
        return Response(serializer.data)


class AttendanceOverrideHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, lesson_id, student_id):
        _ensure_staff_can_access_lesson(request, lesson_id)

        logs = (
            AttendanceOverrideLog.objects.select_related("changed_by")
            .filter(lesson_id=lesson_id, student_id=student_id)
        )
        serializer = AttendanceOverrideLogSerializer(logs, many=True)
        return Response(serializer.data)


class StudentAttendanceHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        role = getattr(request.user, "role", None)
        if role == "student" and request.user.id != student_id:
            raise PermissionDenied("Faqat oz davomingizni ko'ra olasiz.")
        if not (request.user.is_superuser or role in ["student", "teacher", "admin"]):
            raise PermissionDenied("Ruxsat yo'q.")

        records = Attendance.objects.select_related("overridden_by").filter(student_id=student_id)
        serializer = AttendanceSerializer(records, many=True)
        return Response(serializer.data)


class PresenceCheckView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if getattr(request.user, "role", None) != "student":
            raise PermissionDenied("Faqat student uchun.")

        lesson_id = request.data.get("lesson_id")
        frame = request.FILES.get("frame")
        if not lesson_id or not frame:
            raise ValidationError({"detail": "lesson_id va frame majburiy."})

        try:
            lesson = Lesson.objects.get(id=lesson_id)
        except Lesson.DoesNotExist:
            raise NotFound("Lesson topilmadi.")

        if getattr(request.user, "group_id", None) != lesson.group_id:
            raise PermissionDenied("Bu dars sizning guruhingizga tegishli emas.")

        if not (getattr(settings, "AI_ENABLED", False) and getattr(settings, "AI_BASE_URL", None)):
            return Response({"detail": "AI o'chirilgan"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        ai_settings = AISettings.get_active()
        if not ai_settings.enable_presence:
            return Response({"detail": "AI presence o'chirilgan"}, status=status.HTTP_400_BAD_REQUEST)

        result = presence_check(str(lesson_id), frame.read())
        if not result:
            return Response({"detail": "AI javobi yo'q"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        present = bool(result.get("present"))
        confidence = float(result.get("confidence") or 0.0)
        if confidence < ai_settings.presence_threshold:
            present = False

        attendance, created = Attendance.objects.get_or_create(
            lesson=lesson,
            student=request.user,
            defaults={"status": "absent"},
        )
        if present and attendance.status != "present":
            attendance.status = "present"
            attendance.save(update_fields=["status"])

        return Response(
            {
                "present": present,
                "confidence": confidence,
                "status": attendance.status,
                "finalized": attendance.finalized,
            }
        )


# ─────────────────────────────────────────────────────────
#  Dars Faoliyati (LessonActivityLog) Views
# ─────────────────────────────────────────────────────────

def _get_or_create_activity_log(student, lesson_id: int) -> LessonActivityLog:
    """Talaba uchun LessonActivityLog oladi yoki yaratadi."""
    try:
        lesson = Lesson.objects.get(id=lesson_id)
    except Lesson.DoesNotExist:
        raise NotFound("Dars topilmadi.")
    log, _ = LessonActivityLog.objects.get_or_create(
        lesson=lesson,
        student=student,
    )
    return log


class LessonOpenView(APIView):
    """
    Talaba dars sahifasini ochganini qayd qiladi (20 ball).
    POST /attendance/activity/lesson-open/
    Body: { "lesson_id": <int> }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if getattr(request.user, "role", None) != "student":
            raise PermissionDenied("Faqat talabalar uchun.")

        lesson_id = request.data.get("lesson_id")
        if not lesson_id:
            raise ValidationError({"lesson_id": "lesson_id majburiy."})

        log = _get_or_create_activity_log(request.user, lesson_id)

        # Guruh tekshiruvi
        if getattr(request.user, "group_id", None) != log.lesson.group_id:
            raise PermissionDenied("Bu dars sizning guruhingizga tegishli emas.")

        if not log.lesson_opened:
            log.lesson_opened = True
            log.lesson_opened_at = timezone.now()
            log.save_computed()

        return Response({
            "detail": "Dars ochildi.",
            "total_score": log.total_score,
            "status": log.status,
        })


class MaterialViewedView(APIView):
    """
    Talaba material/video ko'rganini qayd qiladi (30 ball).
    POST /attendance/activity/material-viewed/
    Body: { "lesson_id": <int> }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if getattr(request.user, "role", None) != "student":
            raise PermissionDenied("Faqat talabalar uchun.")

        lesson_id = request.data.get("lesson_id")
        if not lesson_id:
            raise ValidationError({"lesson_id": "lesson_id majburiy."})

        log = _get_or_create_activity_log(request.user, lesson_id)

        if getattr(request.user, "group_id", None) != log.lesson.group_id:
            raise PermissionDenied("Bu dars sizning guruhingizga tegishli emas.")

        if not log.material_viewed:
            log.material_viewed = True
            log.material_viewed_at = timezone.now()
            log.save_computed()

        return Response({
            "detail": "Material ko'rildi.",
            "total_score": log.total_score,
            "status": log.status,
        })


class MyActivityLogView(APIView):
    """
    Talaba o'z faoliyat jurnalini ko'radi.
    GET /attendance/activity/my/          → barcha darslar
    GET /attendance/activity/my/?lesson_id=<id>  → bitta dars
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if getattr(request.user, "role", None) != "student":
            raise PermissionDenied("Faqat talabalar uchun.")

        qs = LessonActivityLog.objects.filter(student=request.user).select_related("lesson")
        lesson_id = request.query_params.get("lesson_id")
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        return Response(LessonActivityLogSerializer(qs, many=True).data)


class LessonActivityListView(APIView):
    """
    O'qituvchi/Admin bitta dars uchun barcha talabalar faoliyatini ko'radi.
    GET /attendance/activity/lesson/<lesson_id>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, lesson_id):
        role = getattr(request.user, "role", None)
        if not (request.user.is_superuser or role in ["teacher", "admin"]):
            raise PermissionDenied("Ruxsat yo'q.")

        try:
            lesson = Lesson.objects.select_related("teacher_subject__teacher").get(id=lesson_id)
        except Lesson.DoesNotExist:
            raise NotFound("Dars topilmadi.")

        # O'qituvchi faqat o'z darsini ko'ra oladi
        if role == "teacher":
            if not (lesson.teacher_subject_id and lesson.teacher_subject.teacher_id == request.user.id):
                raise PermissionDenied("Bu dars sizga tegishli emas.")

        logs = LessonActivityLog.objects.filter(lesson=lesson).select_related("student", "lesson")
        serializer = LessonActivityLogSerializer(logs, many=True)

        # Statistika
        total = logs.count()
        active = logs.filter(status="active").count()
        partial = logs.filter(status="partial").count()
        absent = logs.filter(status="absent").count()

        return Response({
            "lesson_id": lesson_id,
            "lesson_topic": lesson.topic,
            "summary": {
                "total": total,
                "active": active,
                "partial": partial,
                "absent": absent,
            },
            "records": serializer.data,
        })


class ActivityReportView(APIView):
    """
    O'qituvchi/Admin: guruh bo'yicha yoki umumiy hisobot.
    GET /attendance/activity/report/?lesson_id=<id>
    GET /attendance/activity/report/?group_id=<id>
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = getattr(request.user, "role", None)
        if not (request.user.is_superuser or role in ["teacher", "admin"]):
            raise PermissionDenied("Ruxsat yo'q.")

        qs = LessonActivityLog.objects.select_related("student", "lesson", "lesson__group")

        lesson_id = request.query_params.get("lesson_id")
        group_id = request.query_params.get("group_id")

        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        if group_id:
            qs = qs.filter(lesson__group_id=group_id)

        # O'qituvchi faqat o'z darslarini ko'radi
        if role == "teacher":
            qs = qs.filter(lesson__teacher_subject__teacher=request.user)

        logs = qs.order_by("lesson__start_time", "student__last_name")
        serializer = LessonActivityLogSerializer(logs, many=True)

        total = logs.count()
        active = logs.filter(status="active").count()
        partial = logs.filter(status="partial").count()
        absent = logs.filter(status="absent").count()

        return Response({
            "summary": {
                "total": total,
                "active": active,
                "partial": partial,
                "absent": absent,
                "active_pct": round(active / total * 100, 1) if total else 0,
                "partial_pct": round(partial / total * 100, 1) if total else 0,
                "absent_pct": round(absent / total * 100, 1) if total else 0,
            },
            "records": serializer.data,
        })
