from rest_framework import viewsets

from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, NotFound

from tests_app.permissions import IsTeacherOrAdmin

from assessment.models import ExamAttempt
from student_tests.models import StudentTest
from ai.clients import presence_check, face_match
from ai.models import AISettings

from .models import ProctorSession, ProctorEvent
from .serializers import ProctorSessionSerializer, ProctorEventSerializer


class TeacherAdminOnlyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        return [IsAuthenticated(), IsTeacherOrAdmin()]


class ProctorSessionViewSet(TeacherAdminOnlyViewSet):
    queryset = ProctorSession.objects.all()
    serializer_class = ProctorSessionSerializer


class ProctorEventViewSet(TeacherAdminOnlyViewSet):
    queryset = ProctorEvent.objects.all()
    serializer_class = ProctorEventSerializer


class StartProctorSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, attempt_id):
        if getattr(request.user, "role", None) != "student":
            raise ValidationError({"detail": "Faqat student proctoring boshlay oladi."})

        try:
            attempt = ExamAttempt.objects.get(id=attempt_id, student=request.user)
        except ExamAttempt.DoesNotExist:
            raise NotFound("Attempt topilmadi.")

        session = getattr(attempt, "proctor_session", None)
        if session:
            return Response(
                {
                    "session_id": session.id,
                    "verified": session.verified,
                    "confidence": session.confidence,
                },
                status=status.HTTP_200_OK,
            )

        session = ProctorSession.objects.create(
            user=request.user,
            exam_attempt=attempt,
        )

        return Response(
            {
                "session_id": session.id,
                "verified": session.verified,
                "confidence": session.confidence,
            },
            status=status.HTTP_201_CREATED,
        )


class StartProctorSessionForStudentTestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, student_test_id):
        if getattr(request.user, "role", None) != "student":
            raise ValidationError({"detail": "Faqat student proctoring boshlay oladi."})

        try:
            student_test = StudentTest.objects.get(id=student_test_id, student=request.user)
        except StudentTest.DoesNotExist:
            raise NotFound("Student test topilmadi.")

        session = getattr(student_test, "proctor_session", None)
        if session:
            return Response(
                {
                    "session_id": session.id,
                    "verified": session.verified,
                    "confidence": session.confidence,
                },
                status=status.HTTP_200_OK,
            )

        session = ProctorSession.objects.create(
            user=request.user,
            student_test=student_test,
        )

        return Response(
            {
                "session_id": session.id,
                "verified": session.verified,
                "confidence": session.confidence,
            },
            status=status.HTTP_201_CREATED,
        )


class FinishProctorSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        if getattr(request.user, "role", None) != "student":
            raise ValidationError({"detail": "Faqat student proctoring yakunlay oladi."})

        try:
            session = ProctorSession.objects.get(id=session_id, user=request.user)
        except ProctorSession.DoesNotExist:
            raise NotFound("Session topilmadi.")

        verified = request.data.get("verified")
        confidence = request.data.get("confidence")

        if verified is not None:
            if not isinstance(verified, bool):
                raise ValidationError({"verified": "verified True/False bo'lishi kerak."})
            session.verified = verified

        if confidence is not None:
            try:
                confidence = float(confidence)
            except (TypeError, ValueError):
                raise ValidationError({"confidence": "confidence raqam bo'lishi kerak."})
            if confidence < 0 or confidence > 1:
                raise ValidationError({"confidence": "confidence 0..1 oralig'ida bo'lishi kerak."})
            session.confidence = confidence

        session.ended_at = timezone.now()
        session.save(update_fields=["verified", "confidence", "ended_at"])

        return Response(
            {
                "session_id": session.id,
                "verified": session.verified,
                "confidence": session.confidence,
            },
            status=status.HTTP_200_OK,
        )


class AddProctorEventView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        if getattr(request.user, "role", None) != "student":
            raise ValidationError({"detail": "Faqat student event yuboradi."})

        try:
            session = ProctorSession.objects.get(id=session_id, user=request.user)
        except ProctorSession.DoesNotExist:
            raise NotFound("Session topilmadi.")

        event_type = request.data.get("event_type")
        if not event_type:
            raise ValidationError({"event_type": "event_type required"})

        meta_json = request.data.get("meta_json", {})
        event = ProctorEvent.objects.create(
            session=session,
            event_type=event_type,
            meta_json=meta_json,
        )

        return Response(
            {
                "event_id": event.id,
                "event_type": event.event_type,
            },
            status=status.HTTP_201_CREATED,
        )


def _read_field_bytes(field_file):
    if not field_file:
        return None
    try:
        if hasattr(field_file, "open"):
            field_file.open("rb")
        return field_file.read()
    finally:
        try:
            if hasattr(field_file, "close"):
                field_file.close()
        except Exception:
            pass


class VerifyProctorSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        if getattr(request.user, "role", None) != "student":
            raise ValidationError({"detail": "Faqat student tekshiradi."})

        try:
            session = ProctorSession.objects.get(id=session_id, user=request.user)
        except ProctorSession.DoesNotExist:
            raise NotFound("Session topilmadi.")

        frame = request.FILES.get("frame")
        if not frame:
            raise ValidationError({"frame": "frame majburiy."})

        if not (getattr(settings, "AI_ENABLED", False) and getattr(settings, "AI_BASE_URL", None)):
            return Response({"detail": "AI o'chirilgan"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        ai_settings = AISettings.get_active()
        if not ai_settings.enable_face_match:
            return Response({"detail": "Face match o'chirilgan"}, status=status.HTTP_400_BAD_REQUEST)

        reference = _read_field_bytes(request.user.face_image)
        if not reference:
            raise ValidationError({"detail": "User uchun yuz rasmi topilmadi."})

        confidence = face_match(reference, frame.read()) or 0.0
        verified = confidence >= ai_settings.face_match_threshold
        session.verified = verified
        session.confidence = confidence
        session.save(update_fields=["verified", "confidence"])

        return Response(
            {
                "session_id": session.id,
                "verified": session.verified,
                "confidence": session.confidence,
                "blocked": session.blocked,
                "blocked_reason": session.blocked_reason,
            },
            status=status.HTTP_200_OK,
        )


class PresenceProctorSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        if getattr(request.user, "role", None) != "student":
            raise ValidationError({"detail": "Faqat student yuboradi."})

        try:
            session = ProctorSession.objects.get(id=session_id, user=request.user)
        except ProctorSession.DoesNotExist:
            raise NotFound("Session topilmadi.")

        frame = request.FILES.get("frame")
        if not frame:
            raise ValidationError({"frame": "frame majburiy."})

        if not (getattr(settings, "AI_ENABLED", False) and getattr(settings, "AI_BASE_URL", None)):
            return Response({"detail": "AI o'chirilgan"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        ai_settings = AISettings.get_active()
        if not ai_settings.enable_presence:
            return Response({"detail": "Presence o'chirilgan"}, status=status.HTTP_400_BAD_REQUEST)

        result = presence_check(str(session_id), frame.read())
        if not result:
            return Response({"detail": "AI javobi yo'q"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        present = bool(result.get("present"))
        confidence = float(result.get("confidence") or 0.0)
        if confidence < ai_settings.presence_threshold:
            present = False

        now = timezone.now()
        if present:
            session.last_present_at = now
            if session.missing_since:
                session.missing_since = None
        else:
            if not session.missing_since:
                session.missing_since = now
            if not session.blocked:
                limit_seconds = int(ai_settings.proctor_missing_seconds or 0)
                if limit_seconds > 0 and session.missing_since:
                    elapsed = (now - session.missing_since).total_seconds()
                    if elapsed >= limit_seconds:
                        session.blocked = True
                        session.blocked_reason = "face_missing_timeout"

        session.save(update_fields=["last_present_at", "missing_since", "blocked", "blocked_reason"])

        last_event = session.events.order_by("-timestamp").first()
        new_event = None
        if present:
            if last_event and last_event.event_type == "face_missing":
                new_event = ProctorEvent.objects.create(session=session, event_type="face_returned")
        else:
            if not last_event or last_event.event_type != "face_missing":
                new_event = ProctorEvent.objects.create(session=session, event_type="face_missing")

        return Response(
            {
                "present": present,
                "confidence": confidence,
                "event_id": new_event.id if new_event else None,
                "event_type": new_event.event_type if new_event else None,
                "blocked": session.blocked,
                "blocked_reason": session.blocked_reason,
            },
            status=status.HTTP_200_OK,
        )
