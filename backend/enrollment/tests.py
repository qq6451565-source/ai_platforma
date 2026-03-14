from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AuditLog, User
from directions.models import Direction
from enrollment.models import Applicant, ApplicantDocument, RegistrationWindow, VerificationResult
from groups.models import Group


def _image_file(name: str) -> SimpleUploadedFile:
    return SimpleUploadedFile(name, b"fake-image-bytes", content_type="image/jpeg")


class EnrollmentRegistrationFlowTests(APITestCase):
    def setUp(self):
        RegistrationWindow.objects.create(is_active=True)
        self.direction = Direction.objects.create(name="Axborot xavfsizligi")

    def _start_registration(
        self,
        full_name: str = "Ali Valiyev",
        email: str = "ali@example.com",
        phone: str = "+998901112233",
    ):
        payload = {
            "full_name": full_name,
            "email": email,
            "phone": phone,
            "direction_choice": self.direction.id,
        }
        return self.client.post("/api/enrollment/register/start/", payload, format="json")

    def test_register_start_creates_user_applicant_and_tokens(self):
        response = self._start_registration()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("applicant_id", response.data)
        self.assertEqual(response.data.get("status"), "pending")

        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(Applicant.objects.count(), 1)
        applicant = Applicant.objects.first()
        self.assertIsNotNone(applicant)
        self.assertEqual(applicant.status, "pending")

    @patch("enrollment.views._run_ai_verification")
    def test_register_finalize_updates_documents_without_ai_call(self, mocked_ai_verification):
        start_response = self._start_registration()
        self.assertEqual(start_response.status_code, status.HTTP_201_CREATED)

        access = start_response.data["access"]
        applicant_id = start_response.data["applicant_id"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        payload = {
            "passport_front": _image_file("passport_front.jpg"),
            "selfie_image": _image_file("selfie.jpg"),
        }
        response = self.client.post("/api/enrollment/register/finalize/", payload, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("status"), "pending")
        self.assertEqual(response.data.get("applicant_id"), applicant_id)

        applicant = Applicant.objects.get(id=applicant_id)
        self.assertEqual(applicant.status, "pending")
        self.assertTrue(ApplicantDocument.objects.filter(applicant=applicant).exists())
        mocked_ai_verification.assert_not_called()

    def test_register_finalize_requires_auth(self):
        payload = {
            "passport_front": _image_file("passport_front.jpg"),
            "selfie_image": _image_file("selfie.jpg"),
        }
        response = self.client.post("/api/enrollment/register/finalize/", payload, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_register_finalize_for_non_student_returns_forbidden(self):
        teacher = User.objects.create_user(
            username="teacher_user",
            password="secret123",
            role="teacher",
            email="teacher@example.com",
        )
        self.client.force_authenticate(user=teacher)

        payload = {
            "passport_front": _image_file("passport_front.jpg"),
            "selfie_image": _image_file("selfie.jpg"),
        }
        response = self.client.post("/api/enrollment/register/finalize/", payload, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch("enrollment.views._run_ai_verification")
    def test_self_reverify_runs_for_pending_student(self, mocked_run_ai):
        start_response = self._start_registration()
        access = start_response.data["access"]
        applicant_id = start_response.data["applicant_id"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        finalize_payload = {
            "passport_front": _image_file("passport_front.jpg"),
            "selfie_image": _image_file("selfie.jpg"),
        }
        finalize_response = self.client.post("/api/enrollment/register/finalize/", finalize_payload, format="multipart")
        self.assertEqual(finalize_response.status_code, status.HTTP_200_OK)

        applicant = Applicant.objects.get(id=applicant_id)
        mocked_run_ai.return_value = None
        VerificationResult.objects.create(
            applicant=applicant,
            verified=True,
            confidence=0.92,
            events_json=[{"type": "face_match", "status": "ok"}],
        )

        response = self.client.post("/api/enrollment/reverify/self/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("action"), "skipped")
        mocked_run_ai.assert_not_called()

    def test_self_reverify_requires_student_role(self):
        teacher = User.objects.create_user(
            username="teacher_reverify",
            password="secret123",
            role="teacher",
            email="teacher2@example.com",
        )
        self.client.force_authenticate(user=teacher)
        response = self.client.post("/api/enrollment/reverify/self/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_self_reverify_returns_cooldown_for_recent_unavailable(self):
        start_response = self._start_registration()
        access = start_response.data["access"]
        applicant_id = start_response.data["applicant_id"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        finalize_payload = {
            "passport_front": _image_file("passport_front.jpg"),
            "selfie_image": _image_file("selfie.jpg"),
        }
        finalize_response = self.client.post("/api/enrollment/register/finalize/", finalize_payload, format="multipart")
        self.assertEqual(finalize_response.status_code, status.HTTP_200_OK)

        applicant = Applicant.objects.get(id=applicant_id)
        VerificationResult.objects.create(
            applicant=applicant,
            verified=False,
            confidence=0.0,
            events_json=[{"type": "ai", "status": "unavailable"}],
            created_at=timezone.now(),
        )

        with patch("enrollment.views._run_ai_verification") as mocked_run_ai:
            response = self.client.post("/api/enrollment/reverify/self/")
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data.get("action"), "cooldown")
            mocked_run_ai.assert_not_called()


class AdminEnrollmentApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin_enrollment",
            password="secret123",
            role="admin",
            email="admin@example.com",
        )
        self.direction = Direction.objects.create(name="Axborot xavfsizligi")
        self.applicant = Applicant.objects.create(
            full_name="Sardor Qodirov",
            phone="+998901234567",
            email="sardor@example.com",
            direction_choice=self.direction,
            card_number="AA1234567",
            status="pending",
        )
        self.group = Group.objects.create(direction=self.direction, language="uz", level=1)
        ApplicantDocument.objects.create(
            applicant=self.applicant,
            passport_front=_image_file("passport_front.jpg"),
            passport_back=_image_file("passport_back.jpg"),
            face_image=_image_file("selfie.jpg"),
        )
        VerificationResult.objects.create(
            applicant=self.applicant,
            verified=False,
            confidence=0.61,
            events_json=[
                {
                    "type": "face_match",
                    "status": "ok",
                    "threshold": 0.7,
                    "passed": False,
                },
                {
                    "type": "face_embedding",
                    "status": "ok",
                    "embedding_length": 512,
                },
            ],
        )
        self.client.force_authenticate(user=self.admin)

    def test_admin_enrollment_list_returns_ai_summary_contract(self):
        response = self.client.get("/api/enrollment/applicants/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        item = response.data[0]
        self.assertEqual(item["direction_name"], self.direction.name)
        self.assertIn("ai_summary", item)
        self.assertIn("latest_verification", item)
        self.assertEqual(item["ai_summary"]["status"], "not_verified")
        self.assertTrue(item["ai_summary"]["face_embedding_ready"])
        self.assertNotIn("documents", item)

    def test_admin_enrollment_detail_returns_face_only_documents(self):
        response = self.client.get(f"/api/enrollment/applicants/{self.applicant.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("documents", response.data)
        self.assertIn("verification_history", response.data)
        self.assertIn("passport_front", response.data["documents"])
        self.assertIn("face_image", response.data["documents"])
        self.assertNotIn("passport_back", response.data["documents"])

    def test_admin_approval_requires_manual_override_reason_when_ai_not_verified(self):
        response = self.client.post(
            f"/api/enrollment/approve/{self.applicant.id}/",
            {"role": "student", "group_id": self.group.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("manual_override_reason", response.data)

    def test_admin_approval_logs_override_reason(self):
        response = self.client.post(
            f"/api/enrollment/approve/{self.applicant.id}/",
            {
                "role": "student",
                "group_id": self.group.id,
                "manual_override_reason": "Passport va selfie preview qo'lda tekshirildi.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        audit = AuditLog.objects.filter(action="enrollment_override_approved").order_by("-created_at").first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.extra["applicant_id"], self.applicant.id)
        self.assertEqual(
            audit.extra["manual_override_reason"],
            "Passport va selfie preview qo'lda tekshirildi.",
        )

    def test_admin_reject_requires_reason(self):
        response = self.client.post(
            f"/api/enrollment/reject/{self.applicant.id}/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("reject_reason", response.data)

    def test_admin_reject_keeps_applicant_and_logs_reason(self):
        response = self.client.post(
            f"/api/enrollment/reject/{self.applicant.id}/",
            {"reject_reason": "Selfie bilan passport yuz mos kelmadi."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.applicant.refresh_from_db()
        self.assertEqual(self.applicant.status, "rejected")
        audit = AuditLog.objects.filter(action="enrollment_rejected").order_by("-created_at").first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.extra["applicant_id"], self.applicant.id)
        self.assertEqual(audit.extra["reject_reason"], "Selfie bilan passport yuz mos kelmadi.")

    def test_admin_reopen_requires_rejected_status(self):
        response = self.client.post(
            f"/api/enrollment/reopen/{self.applicant.id}/",
            {"reopen_reason": "Review qayta boshlanadi."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_reopen_requires_reason(self):
        self.applicant.status = "rejected"
        self.applicant.save(update_fields=["status"])

        response = self.client.post(
            f"/api/enrollment/reopen/{self.applicant.id}/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("reopen_reason", response.data)

    def test_admin_reopen_rejected_applicant_sets_pending_and_logs_reason(self):
        self.applicant.status = "rejected"
        self.applicant.save(update_fields=["status"])

        response = self.client.post(
            f"/api/enrollment/reopen/{self.applicant.id}/",
            {"reopen_reason": "Yangi review uchun qayta ochildi."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.applicant.refresh_from_db()
        self.assertEqual(self.applicant.status, "pending")
        audit = AuditLog.objects.filter(action="enrollment_reopened").order_by("-created_at").first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.extra["applicant_id"], self.applicant.id)
        self.assertEqual(audit.extra["reopen_reason"], "Yangi review uchun qayta ochildi.")

    def test_admin_cannot_edit_final_applicant(self):
        self.applicant.status = "approved"
        self.applicant.save(update_fields=["status"])

        response = self.client.patch(
            f"/api/enrollment/applicants/{self.applicant.id}/",
            {"full_name": "Yangilangan ism"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.applicant.refresh_from_db()
        self.assertEqual(self.applicant.full_name, "Sardor Qodirov")

    def test_admin_cannot_delete_final_applicant(self):
        self.applicant.status = "rejected"
        self.applicant.save(update_fields=["status"])

        response = self.client.delete(f"/api/enrollment/applicants/{self.applicant.id}/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Applicant.objects.filter(id=self.applicant.id).exists())

    def test_admin_cannot_approve_rejected_applicant(self):
        self.applicant.status = "rejected"
        self.applicant.save(update_fields=["status"])

        response = self.client.post(
            f"/api/enrollment/approve/{self.applicant.id}/",
            {
                "role": "student",
                "group_id": self.group.id,
                "manual_override_reason": "Qo'lda tekshirildi.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_cannot_reverify_final_applicant(self):
        self.applicant.status = "approved"
        self.applicant.save(update_fields=["status"])

        response = self.client.post(f"/api/enrollment/reverify/{self.applicant.id}/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
