from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView,
    MeView,
    ChangePasswordView,
    AdminSetRoleView,
    AdminUserListView,
    LogoutView,
    AdminUserViewSet,
    AuditLogViewSet,
    PassportDataViewSet,
    AuthGroupViewSet,
    PermissionViewSet,
    AuthTokenViewSet,
    OutstandingTokenViewSet,
    BlacklistedTokenViewSet,
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
    path('me/', MeView.as_view()),
    path('change-password/', ChangePasswordView.as_view()),
    path('logout/', LogoutView.as_view()),
    path('admin/set-role/', AdminSetRoleView.as_view()),
    path('list/', AdminUserListView.as_view()),
] + router.urls
