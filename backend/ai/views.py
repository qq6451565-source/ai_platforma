from django.utils import timezone
from django.db import models
from django.conf import settings

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError

from tests_app.permissions import IsAdmin

from accounts.models import User
from student_tests.models import StudentTest
from attendance.models import Attendance
from assignments.models import Assignment, Submission
from teacher_subject.models import TeacherSubject
from lessons.models import Lesson
from materials.models import Material
from tests_app.models import Test

from .models import AISettings
from . import clients
from .serializers import MaterialQuestionSerializer, AISettingsSerializer


class StudentAIRecommendationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        role = getattr(request.user, "role", None)
        if role == "student" and request.user.id != student_id:
            raise PermissionDenied("Faqat oz profilingizni ko'ra olasiz.")

        try:
            student = User.objects.get(id=student_id, role="student")
        except User.DoesNotExist:
            return Response({"error": "Bunday student topilmadi"}, status=status.HTTP_404_NOT_FOUND)

        tests_qs = StudentTest.objects.filter(student=student)
        total_tests = tests_qs.count()
        avg_score = tests_qs.aggregate(avg=models.Avg("score_percent"))["avg"] or 0

        subject_scores_qs = tests_qs.values(
            "test__subject__name",
        ).annotate(
            avg_score=models.Avg("score_percent"),
        )

        subject_scores = []
        weak_subjects = []

        for row in subject_scores_qs:
            name = row["test__subject__name"]
            avg_s = row["avg_score"] or 0
            subject_scores.append({
                "subject": name,
                "avg_score": round(avg_s, 2),
            })
            if avg_s < 60:
                weak_subjects.append(name)

        attendance_qs = Attendance.objects.filter(student=student)
        total_attendance = attendance_qs.count()
        present_count = attendance_qs.filter(status="present").count()
        attendance_rate = (present_count / total_attendance * 100) if total_attendance else 0

        submissions_qs = Submission.objects.filter(student=student)
        submitted_count = submissions_qs.count()

        if student.group:
            group_ts = TeacherSubject.objects.filter(groups=student.group)
            all_assignments_count = Assignment.objects.filter(
                teacher_subject__in=group_ts,
            ).count()
        else:
            all_assignments_count = Assignment.objects.all().count()

        submit_rate = (submitted_count / all_assignments_count * 100) if all_assignments_count else 0

        advice = []

        if total_tests == 0:
            advice.append("Hali birorta test topshirmagansiz. Testlar orqali bilim darajangizni tekshirib boring.")
        else:
            if avg_score < 60:
                advice.append("Umumiy test natijalaringiz past. Mavzularni qayta korib chiqish va mashq qilish tavsiya etiladi.")
            elif avg_score < 80:
                advice.append("Test natijalaringiz ortacha. Zaif fanlarni aniqlab, ular boyicha koproq mashq qiling.")
            else:
                advice.append("Test natijalaringiz yaxshi. Bilimni mustahkamlash uchun murakkabroq masalalar ustida ishlang.")

        if attendance_rate < 70:
            advice.append("Davomat juda past. Darslarga qatnashish bilimni oshirishda juda muhim.")
        elif attendance_rate < 90:
            advice.append("Davomat ortacha. Imkon qadar barcha darslarda qatnashishga harakat qiling.")
        else:
            advice.append("Davomatingiz yaxshi. Shu ruhda davom eting.")

        if submit_rate < 50:
            advice.append("Topshiriqlarni oz vaqtida topshirish odatini shakllantirish zarur.")
        elif submit_rate < 90:
            advice.append("Bazi topshiriqlarni otkazib yuborgan bolishingiz mumkin. Ularni qayta korib chiqing.")
        else:
            advice.append("Topshiriqlarni deyarli hammasini topshirgansiz. Juda yaxshi!")

        if weak_subjects:
            advice.append(
                "Quyidagi fanlar boyicha natijalaringiz pastroq: "
                + ", ".join(weak_subjects)
                + ". Shu fanlar boyicha materiallarni qayta oqing va qoshimcha mashqlar bajaring."
            )

        stats_payload = {
            "total_tests": total_tests,
            "avg_score": round(avg_score, 2),
            "attendance_rate": round(attendance_rate, 2),
            "submitted_assignments": submitted_count,
            "assignments_submit_rate": round(submit_rate, 2),
        }

        ai_response = clients.recommend_student(student, stats_payload)
        if ai_response and isinstance(ai_response, dict):
            # Agar tashqi AI javob berayotgan bo'lsa, uni ustun qo'yamiz, lekin fallback ma'lumotlarni ham qaytaramiz.
            return Response({
                "student": {
                    "id": student.id,
                    "username": student.username,
                    "group": student.group.name if student.group else None,
                },
                "stats": stats_payload,
                "ai_recommendation": ai_response,
                "fallback": {
                    "subjects": subject_scores,
                    "weak_subjects": weak_subjects,
                    "advice": advice,
                },
            })

        return Response({
            "student": {
                "id": student.id,
                "username": student.username,
                "group": student.group.name if student.group else None,
            },
            "stats": stats_payload,
            "subjects": subject_scores,
            "weak_subjects": weak_subjects,
            "advice": advice,
        })


class MaterialAIAnswerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MaterialQuestionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        material_id = serializer.validated_data["material_id"]
        question = serializer.validated_data["question"]

        try:
            material = Material.objects.get(id=material_id)
        except Material.DoesNotExist:
            return Response({"error": "Material topilmadi"}, status=status.HTTP_404_NOT_FOUND)

        ai_resp = clients.material_qa(material, question)
        if ai_resp and isinstance(ai_resp, dict):
            return Response({
                "material": {
                    "id": material.id,
                    "title": material.title,
                },
                "question": question,
                "answer": ai_resp.get("answer"),
                "confidence": ai_resp.get("confidence"),
                "sources": ai_resp.get("sources"),
            })

        answer_text = (
            f"Siz '{material.title}' materialiga oid savol berdingiz.\n\n"
            f"Savolingiz: {question}\n\n"
            "AI servisi ulanmagan. Fallback javob: "
            "materialni qayta o'qib chiqing va o'qituvchi bilan aniqlashtiring."
        )

        return Response({
            "material": {
                "id": material.id,
                "title": material.title,
            },
            "question": question,
            "answer": answer_text,
        })


class AISettingsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        settings = AISettings.get_active()
        return Response(AISettingsSerializer(settings).data)

    def patch(self, request):
        settings = AISettings.get_active()
        serializer = AISettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def put(self, request):
        return self.patch(request)


class AIHealthView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        ai_settings = AISettings.get_active()
        enabled = ai_settings.ai_enabled
        base_url = ai_settings.api_base_url or getattr(settings, "AI_BASE_URL", None)
        api_key_set = bool(ai_settings.api_key or getattr(settings, "AI_API_KEY", None))
        timeout = ai_settings.timeout_seconds or getattr(settings, "AI_TIMEOUT", 5)
        retry_count = ai_settings.retry_count

        payload = {
            "enabled": enabled,
            "base_url": base_url,
            "api_key_set": api_key_set,
            "timeout": timeout,
            "retry_count": retry_count,
            "ocr_confidence_threshold": ai_settings.ocr_confidence_threshold,
            "max_image_size_mb": ai_settings.max_image_size_mb,
            "face_model": ai_settings.face_model,
            "detection_backend": ai_settings.detection_backend,
            "enforce_detection": ai_settings.enforce_detection,
            "presence_threshold": ai_settings.presence_threshold,
            "face_match_threshold": ai_settings.face_match_threshold,
        }

        if not enabled:
            payload["status"] = "disabled"
            return Response(payload, status=status.HTTP_200_OK)

        if not base_url:
            payload["status"] = "unconfigured"
            return Response(payload, status=status.HTTP_200_OK)

        health = clients.health_check()
        if not health:
            payload["status"] = "unreachable"
            return Response(payload, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        payload["status"] = "ok"
        payload["gateway"] = health
        return Response(payload, status=status.HTTP_200_OK)


class PassportOCRView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        passport_file = request.FILES.get("passport_image")
        if not passport_file:
            raise ValidationError({"passport_image": "Fayl talab qilinadi"})

        result = clients.ocr_passport(passport_file.read())
        if not result:
            return Response({"error": "AI OCR ulanmagan yoki xato yuz berdi"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(result, status=status.HTTP_200_OK)


class FaceMatchView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        settings = AISettings.get_active()
        if not settings.enable_face_match:
            return Response({"error": "Face match AI o'chirilgan (admin)"},
                            status=status.HTTP_403_FORBIDDEN)

        passport_file = request.FILES.get("passport_image")
        selfie_file = request.FILES.get("selfie_image")
        if not passport_file or not selfie_file:
            raise ValidationError({"detail": "passport_image va selfie_image talab qilinadi"})

        result = clients.face_match(passport_file.read(), selfie_file.read())
        if not result:
            return Response({"error": "AI face-match ulanmagan yoki xato"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        # Threshold tekshiruvi
        confidence = result.get("confidence")
        if confidence is not None and confidence < settings.face_match_threshold:
            result["verified"] = False
        return Response(result, status=status.HTTP_200_OK)


class PresenceCheckView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        settings = AISettings.get_active()
        if not settings.enable_presence:
            return Response({"error": "Presence AI o'chirilgan (admin)"},
                            status=status.HTTP_403_FORBIDDEN)

        session_id = request.data.get("session_id")
        frame = request.FILES.get("frame")
        if not session_id or not frame:
            raise ValidationError({"detail": "session_id va frame talab qilinadi"})

        result = clients.presence_check(session_id, frame.read())
        if not result:
            return Response({"error": "AI presence ulanmagan yoki xato"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        # Threshold tekshiruvi
        confidence = result.get("confidence")
        if confidence is not None and confidence < settings.presence_threshold:
            result["present"] = False
        return Response(result, status=status.HTTP_200_OK)
