# """
# URL configuration for config project.

# The `urlpatterns` list routes URLs to views. For more information please see:
#     https://docs.djangoproject.com/en/5.2/topics/http/urls/
# Examples:
# Function views
#     1. Add an import:  from my_app import views
#     2. Add a URL to urlpatterns:  path('', views.home, name='home')
# Class-based views
#     1. Add an import:  from other_app.views import Home
#     2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
# Including another URLconf
#     1. Import the include() function: from django.urls import include, path
#     2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
# """
# from django.contrib import admin
# from django.urls import path, include
# from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

# from announcements.views import AnnouncementViewSet
# from rest_framework.routers import DefaultRouter

# router = DefaultRouter()
# router.register('announcements', AnnouncementViewSet)

# urlpatterns = [
#     path('admin/', admin.site.urls),
#     path('api/accounts/', include('accounts.urls')),
#     path('api/directions/', include('directions.urls')),
#     path('api/semesters/', include('semesters.urls')),
#     path('api/subjects/', include('subjects.urls')),
#     path('api/curriculum/', include('curriculum.urls')),
#     path('api/groups/', include('groups.urls')),
#     path('api/teacher-subject/', include('teacher_subject.urls')),
#     path('api/lessons/', include('lessons.urls')),
#     path('api/materials/', include('materials.urls')),
#     path('api/tests/', include('tests_app.urls')),
#     path('api/student-tests/', include('student_tests.urls')),
#     path('api/', include('assignments.urls')),
#     path('api/attendance/', include('attendance.urls')),
#     path('api/live/', include('live.urls')),
#     path('api/', include(router.urls)),

#     # JWT
#     path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
#     path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
# ]


from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter

from announcements.views import AnnouncementViewSet
from accounts.jwt import CustomTokenObtainPairView, CustomTokenRefreshView

router = DefaultRouter()
router.register('announcements', AnnouncementViewSet)


def root_health(_request):
    return JsonResponse({"status": "ok"})

urlpatterns = [
    path('', root_health),
    path('admin/', admin.site.urls),

    # Accounts
    path('api/accounts/', include('accounts.urls')),

    # Education structure
    path('api/directions/', include('directions.urls')),
    path('api/subjects/', include('subjects.urls')),
    path('api/groups/', include('groups.urls')),
    path('api/teacher-subject/', include('teacher_subject.urls')),

    # Lessons & attendance
    path('api/lessons/', include('lessons.urls')),
    path('api/materials/', include('materials.urls')),
    path('api/attendance/', include('attendance.urls')),

    # Tests
    path("api/tests/", include("tests_app.urls")),
    path("api/student-tests/", include("student_tests.urls")),

    # Assignments
    path('api/assignments/', include('assignments.urls')),

    # Ananiytics
    path('api/analytics/', include('analytics.urls')),
    
    # AI
    path('api/ai/', include('ai.urls')),

    # Jurnal
    path('api/journal/', include('journal.urls')),
 
    # Live (WebSocket signalling)
    path('api/live/', include('live.urls')),

    # Group_chat
    path('api/chat/', include('group_chat.urls')),

    # University core (removed structure endpoints)
    path('api/profiles/', include('profiles.urls')),
    path('api/enrollment/', include('enrollment.urls')),
    path('api/schedule/', include('schedule.urls')),
    path('api/assessment/', include('assessment.urls')),
    path('api/proctoring/', include('proctoring.urls')),
    path('api/gradebook/', include('gradebook.urls')),

    # Router (announcements)
    path('api/', include(router.urls)),

    # JWT
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
