from rest_framework.permissions import BasePermission
from profiles.models import StudentProfile


class IsTeacher(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and getattr(request.user, "role", None) == "teacher")


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and getattr(request.user, "role", None) == "student"):
            return False
        try:
            request.user.student_profile
            return True
        except StudentProfile.DoesNotExist:
            return False


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.is_superuser or getattr(request.user, "role", None) == "admin"))


class IsTeacherOrAdmin(BasePermission):
    def has_permission(self, request, view):
        role = getattr(request.user, "role", None)
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_superuser or role in ["teacher", "admin"])
        )
