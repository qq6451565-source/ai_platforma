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
from .models import Attendance, AttendanceOverrideLog
from .serializers import AttendanceSerializer, MarkAttendanceSerializer

logger = logging.getLogger(__name__)


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
        role = getattr(request.user, "role", None)
        if not (request.user.is_superuser or role == "admin"):
            if role != "teacher":
                raise PermissionDenied("Faqat admin yoki teacher ko'ra oladi.")
            try:
                lesson = Lesson.objects.select_related("teacher_subject__teacher").get(id=lesson_id)
            except Lesson.DoesNotExist:
                raise NotFound("Lesson topilmadi.")
            if not lesson.teacher_subject_id or lesson.teacher_subject.teacher_id != request.user.id:
                raise PermissionDenied("Bu dars sizga tegishli emas.")

        records = Attendance.objects.select_related("overridden_by").filter(lesson_id=lesson_id)
        serializer = AttendanceSerializer(records, many=True)
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
