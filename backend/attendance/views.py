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
from .services import get_video_completion_threshold
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


class VideoProgressView(APIView):
    """
    Asinxron (video) dars uchun ko'rish progressini qayd qiladi (heartbeat).
    Frontend video pleer davriy ravishda (masalan har 10-15 sekundda) yuboradi.

    POST /attendance/activity/video-progress/
    Body: {
        "lesson_id": <int>,
        "watch_seconds": <float>,       # boshidan beri ko'rilgan jami sekund
        "duration_seconds": <float>     # ixtiyoriy, video umumiy davomiyligi
    }

    Anti-cheat: watch_seconds faqat oshadi va duration'dan oshmaydi.
    video_completed faqat ko'rilgan foiz threshold (default 90%) dan oshganda True.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if getattr(request.user, "role", None) != "student":
            raise PermissionDenied("Faqat talabalar uchun.")

        lesson_id = request.data.get("lesson_id")
        if not lesson_id:
            raise ValidationError({"lesson_id": "lesson_id majburiy."})

        try:
            watch_seconds = float(request.data.get("watch_seconds", 0) or 0)
        except (TypeError, ValueError):
            raise ValidationError({"watch_seconds": "watch_seconds raqam bo'lishi kerak."})

        duration_raw = request.data.get("duration_seconds")
        duration_seconds = None
        if duration_raw not in (None, ""):
            try:
                duration_seconds = float(duration_raw)
            except (TypeError, ValueError):
                raise ValidationError({"duration_seconds": "duration_seconds raqam bo'lishi kerak."})

        log = _get_or_create_activity_log(request.user, lesson_id)

        if getattr(request.user, "group_id", None) != log.lesson.group_id:
            raise PermissionDenied("Bu dars sizning guruhingizga tegishli emas.")

        threshold = get_video_completion_threshold()
        log.record_video_progress(
            watch_seconds=watch_seconds,
            duration_seconds=duration_seconds,
            completion_threshold=threshold,
        )

        return Response({
            "detail": "Video progress saqlandi.",
            "video_watch_seconds": log.video_watch_seconds,
            "video_duration_seconds": log.video_duration_seconds,
            "video_progress_ratio": log.video_progress_ratio,
            "video_completed": log.video_completed,
            "completion_threshold": threshold,
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


# ─────────────────────────────────────────────────────────
#  Yagona davomat + natijalar hisoboti (sinxron + asinxron)
# ─────────────────────────────────────────────────────────

def _build_lesson_report_row(log: LessonActivityLog, attendance: "Attendance | None") -> dict:
    """Bitta dars uchun talaba natijasini (live + video birlashtirilgan) qaytaradi."""
    lesson = log.lesson
    lesson_type = getattr(lesson, "lesson_type", "pending")

    row = {
        "lesson_id": lesson.id,
        "lesson_topic": lesson.topic,
        "lesson_type": lesson_type,
        "start_time": lesson.start_time,
        "end_time": lesson.end_time,
        "group_id": lesson.group_id,
        "total_score": log.total_score,
        "activity_status": log.status,
        "test_attended": log.test_attended,
        "test_score": log.test_score,
        "assignment_submitted": log.assignment_submitted,
    }

    if lesson_type == "video":
        row["mode"] = "video"
        row["video_completed"] = bool(log.video_completed or log.material_viewed)
        row["video_progress_ratio"] = log.video_progress_ratio
        row["video_watch_seconds"] = log.video_watch_seconds
        row["video_duration_seconds"] = log.video_duration_seconds
        # Asinxronda "qatnashish" = videoni tugatish
        row["attended"] = bool(log.video_completed or log.material_viewed)
        row["attendance_status"] = "present" if row["attended"] else "absent"
    else:
        row["mode"] = "live"
        if attendance is not None:
            row["attendance_status"] = attendance.status
            row["attendance_finalized"] = attendance.finalized
            row["face_verified_ratio"] = attendance.face_verified_ratio
            row["joined_ratio"] = attendance.joined_ratio
            row["attended"] = attendance.status == "present"
        else:
            row["attendance_status"] = "absent"
            row["attendance_finalized"] = False
            row["attended"] = False

    return row


def _summarize_lesson_rows(rows: list[dict]) -> dict:
    """Dars qatorlaridan yig'ma statistika hisoblaydi."""
    total = len(rows)
    attended = sum(1 for r in rows if r.get("attended"))
    live_total = sum(1 for r in rows if r.get("mode") == "live")
    video_total = sum(1 for r in rows if r.get("mode") == "video")
    video_completed = sum(1 for r in rows if r.get("mode") == "video" and r.get("video_completed"))
    active = sum(1 for r in rows if r.get("activity_status") == "active")
    partial = sum(1 for r in rows if r.get("activity_status") == "partial")
    absent = sum(1 for r in rows if r.get("activity_status") == "absent")
    avg_score = round(sum(r.get("total_score", 0) for r in rows) / total, 1) if total else 0.0

    return {
        "total_lessons": total,
        "attended": attended,
        "attendance_rate": round(attended / total * 100, 1) if total else 0.0,
        "live_lessons": live_total,
        "video_lessons": video_total,
        "video_completed": video_completed,
        "activity_active": active,
        "activity_partial": partial,
        "activity_absent": absent,
        "avg_activity_score": avg_score,
    }


class UnifiedReportView(APIView):
    """
    Yagona davomat + natijalar hisoboti — sinxron (live) va asinxron (video) birlashtirilgan.

    Rollarga qarab ko'rinish:
      - student  → faqat o'zining hisoboti
      - teacher  → unga biriktirilgan darslar/guruhlar talabalari
      - admin    → barcha (group_id / student_id / lesson_id bilan filtrlash mumkin)

    GET /attendance/report/unified/
        ?student_id=<id>   (ixtiyoriy — teacher/admin)
        &group_id=<id>     (ixtiyoriy — teacher/admin)
        &lesson_id=<id>    (ixtiyoriy)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = getattr(request.user, "role", None)
        is_staff = request.user.is_superuser or role in ["teacher", "admin"]

        qs = LessonActivityLog.objects.select_related(
            "student", "lesson", "lesson__group", "lesson__teacher_subject__teacher"
        )

        student_id = request.query_params.get("student_id")
        group_id = request.query_params.get("group_id")
        lesson_id = request.query_params.get("lesson_id")

        # Rol bo'yicha qamrov
        if role == "student":
            qs = qs.filter(student=request.user)
            scope = "student"
        elif role == "teacher":
            qs = qs.filter(lesson__teacher_subject__teacher=request.user)
            scope = "teacher"
        elif is_staff:
            scope = "admin"
        else:
            raise PermissionDenied("Ruxsat yo'q.")

        # Filtrlar (teacher/admin)
        if student_id and role != "student":
            qs = qs.filter(student_id=student_id)
        if group_id and role != "student":
            qs = qs.filter(lesson__group_id=group_id)
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)

        logs = list(qs.order_by("student_id", "lesson__start_time"))

        # Live darslar uchun Attendance ma'lumotini birlashtirish
        live_lesson_keys = [
            (log.student_id, log.lesson_id)
            for log in logs
            if getattr(log.lesson, "lesson_type", "pending") != "video"
        ]
        attendance_map: dict[tuple[int, int], Attendance] = {}
        if live_lesson_keys:
            student_ids = {sid for sid, _ in live_lesson_keys}
            lesson_ids = {lid for _, lid in live_lesson_keys}
            for att in Attendance.objects.filter(
                student_id__in=student_ids, lesson_id__in=lesson_ids
            ).order_by("-timestamp", "-id"):
                attendance_map.setdefault((att.student_id, att.lesson_id), att)

        # Talabalar bo'yicha guruhlash
        students: dict[int, dict] = {}
        for log in logs:
            att = attendance_map.get((log.student_id, log.lesson_id))
            row = _build_lesson_report_row(log, att)
            sid = log.student_id
            if sid not in students:
                students[sid] = {
                    "student_id": sid,
                    "student_name": log.student.get_full_name() or log.student.username,
                    "lessons": [],
                }
            students[sid]["lessons"].append(row)

        student_reports = []
        for sid, data in students.items():
            data["summary"] = _summarize_lesson_rows(data["lessons"])
            student_reports.append(data)

        student_reports.sort(key=lambda d: d["student_name"].lower())

        # Umumiy yig'ma (barcha qatorlar)
        all_rows = [row for d in student_reports for row in d["lessons"]]
        overall = _summarize_lesson_rows(all_rows)
        overall["students_count"] = len(student_reports)

        payload = {
            "scope": scope,
            "filters": {
                "student_id": int(student_id) if student_id else None,
                "group_id": int(group_id) if group_id else None,
                "lesson_id": int(lesson_id) if lesson_id else None,
            },
            "overall": overall,
        }

        if scope == "student":
            # Talaba uchun tekis ro'yxat
            payload["summary"] = student_reports[0]["summary"] if student_reports else _summarize_lesson_rows([])
            payload["lessons"] = student_reports[0]["lessons"] if student_reports else []
        else:
            payload["students"] = student_reports

        return Response(payload)
