from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView,
    MeView,
    ChangePasswordView,
    AdminSetRoleView,
    AdminStudentPlacementView,
    AdminTeacherWorkloadView,
    AdminUserListView,
    AdminReanalyzeFaceView,
    TeacherStudentListView,
    LogoutView,
    AdminUserViewSet,
    AuditLogViewSet,
    PassportDataViewSet,
    AuthGroupViewSet,
    PermissionViewSet,
    AuthTokenViewSet,
    OutstandingTokenViewSet,
    BlacklistedTokenViewSet,
    GoogleOAuthView,
    RegistrationProfileView,
    PassportUploadView,
    FaceVerificationView,
    EmailVerificationSendView,
    EmailVerificationConfirmView,
    ApproveUserView,
)

router = DefaultRouter()
router.register("admin/users", AdminUserViewSet, basename="admin-users")
router.register("admin/audit-logs", AuditLogViewSet, basename="audit-logs")
router.register("admin/passports", PassportDataViewSet, basename="passport-data")
router.register("admin/auth-groups", AuthGroupViewSet, basename="auth-groups")
router.register("admin/permissions", PermissionViewSet, basename="permissions")
router.register("admin/auth-tokens", AuthTokenViewSet, basename="auth-tokens")
router.register("admin/outstanding-tokens", OutstandingTokenViewSet, basename="outstanding-tokens")
router.register("admin/blacklisted-tokens", BlacklistedTokenViewSet, basename="blacklisted-tokens")

urlpatterns = [
    path('register/', RegisterView.as_view()),
    path('google/', GoogleOAuthView.as_view()),
    path('registration/profile/', RegistrationProfileView.as_view()),
    path('registration/passport/', PassportUploadView.as_view()),
    path('registration/face/', FaceVerificationView.as_view()),
    path('registration/email/send/', EmailVerificationSendView.as_view()),
    path('registration/email/verify/', EmailVerificationConfirmView.as_view()),
    path('me/', MeView.as_view()),
    path('change-password/', ChangePasswordView.as_view()),
    path('logout/', LogoutView.as_view()),
    path('admin/set-role/', AdminSetRoleView.as_view()),
    path('admin/approve-user/', ApproveUserView.as_view()),
    path('admin/students/<int:user_id>/placement/', AdminStudentPlacementView.as_view()),
    path('admin/teachers/<int:user_id>/workload/', AdminTeacherWorkloadView.as_view()),
    path('admin/reanalyze-face/', AdminReanalyzeFaceView.as_view()),
    path('list/', AdminUserListView.as_view()),
    path('teacher/students/', TeacherStudentListView.as_view()),
] + router.urls
