from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from enrollment.models import Applicant, ApplicantDocument, RegistrationWindow


def _image_file(name: str) -> SimpleUploadedFile:
    return SimpleUploadedFile(name, b"fake-image-bytes", content_type="image/jpeg")


class EnrollmentRegistrationFlowTests(APITestCase):
    def setUp(self):
        RegistrationWindow.objects.create(is_active=True)

    def _start_registration(self, full_name="Ali Valiyev", email="ali@example.com", phone="+998901112233"):
        payload = {
            "full_name": full_name,
            "email": email,
            "phone": phone,
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
