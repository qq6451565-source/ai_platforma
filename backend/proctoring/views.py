from rest_framework import viewsets

from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, NotFound

from tests_app.permissions import IsTeacherOrAdmin

from assessment.models import ExamAttempt

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
