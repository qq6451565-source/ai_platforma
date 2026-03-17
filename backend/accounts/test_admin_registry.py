from __future__ import annotations

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from core.test_support import AcademicFixtureMixin
from directions.models import Direction
from groups.models import Group
from profiles.models import StudentProfile, TeacherProfile
from teacher_subject.models import TeacherSubject


class AdminRegistryApiTests(AcademicFixtureMixin, TestCase):
    def setUp(self) -> None:
        self.create_academic_context()
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="registry_admin",
            password="secret",
            role="admin",
            is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)
        self.group_two = Group.objects.create(
            direction=self.direction,
            language="uz",
            level=3,
        )
        self.other_direction = Direction.objects.create(
            name="Data Science",
            language="uz",
            degree="bachelor",
        )
        self.other_group = Group.objects.create(
            direction=self.other_direction,
            language="uz",
            level=1,
        )

    def test_set_role_creates_placeholder_student_profile(self) -> None:
        user = User.objects.create_user(
            username="role_candidate",
            password="secret",
            role="teacher",
        )

        response = self.client.post(
            "/api/accounts/admin/set-role/",
            {"user_id": user.id, "role": "student"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.role, "student")
        self.assertTrue(StudentProfile.objects.filter(user=user).exists())
        profile = user.student_profile
        self.assertEqual(profile.status, "active")
        self.assertGreaterEqual(profile.admission_year, 2025)

    def test_student_profile_endpoint_syncs_user_group_and_role(self) -> None:
        user = User.objects.create_user(
            username="profile_candidate",
            password="secret",
            role="teacher",
        )

        response = self.client.post(
            "/api/profiles/students/",
            {
                "user": user.id,
                "direction": self.direction.id,
                "group": self.group.id,
                "admission_year": 2025,
                "status": "active",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user.refresh_from_db()
        self.assertEqual(user.role, "student")
        self.assertEqual(user.group_id, self.group.id)
        profile = user.student_profile
        self.assertEqual(profile.direction_id, self.direction.id)
        self.assertEqual(profile.group_id, self.group.id)

    def test_student_profile_endpoint_rejects_group_direction_mismatch(self) -> None:
        user = User.objects.create_user(
            username="mismatch_candidate",
            password="secret",
            role="student",
        )

        response = self.client.post(
            "/api/profiles/students/",
            {
                "user": user.id,
                "direction": self.other_direction.id,
                "group": self.group.id,
                "admission_year": 2025,
                "status": "active",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("group", response.data)

    def test_teacher_subject_post_reuses_existing_mapping(self) -> None:
        response = self.client.post(
            "/api/teacher-subject/",
            {
                "teacher": self.teacher.id,
                "subject": self.subject.id,
                "groups": [self.group.id, self.group_two.id],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TeacherSubject.objects.filter(teacher=self.teacher, subject=self.subject).count(), 1)
        mapping = TeacherSubject.objects.get(teacher=self.teacher, subject=self.subject)
        self.assertSetEqual(set(mapping.groups.values_list("id", flat=True)), {self.group.id, self.group_two.id})

    def test_admin_student_placement_endpoint_assigns_student_role(self) -> None:
        user = User.objects.create_user(
            username="placement_candidate",
            password="secret",
            role="teacher",
        )

        response = self.client.post(
            f"/api/accounts/admin/students/{user.id}/placement/",
            {
                "direction_id": self.direction.id,
                "group_id": self.group.id,
                "admission_year": 2026,
                "status": "active",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.role, "student")
        self.assertEqual(user.group_id, self.group.id)
        self.assertEqual(user.student_profile.admission_year, 2026)

    def test_admin_teacher_workload_endpoint_assigns_teacher_role_and_groups(self) -> None:
        user = User.objects.create_user(
            username="workload_candidate",
            password="secret",
            role="student",
            group=self.group,
        )

        response = self.client.post(
            f"/api/accounts/admin/teachers/{user.id}/workload/",
            {
                "subject_id": self.subject.id,
                "group_ids": [self.group.id, self.group_two.id],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user.refresh_from_db()
        self.assertEqual(user.role, "teacher")
        self.assertIsNone(user.group_id)
        self.assertTrue(TeacherProfile.objects.filter(user=user).exists())
        mapping = TeacherSubject.objects.get(teacher=user, subject=self.subject)
        self.assertSetEqual(set(mapping.groups.values_list("id", flat=True)), {self.group.id, self.group_two.id})
