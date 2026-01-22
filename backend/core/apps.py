from auditlog.registry import auditlog
from django.apps import AppConfig

class CoreConfig(AppConfig):
    name = 'core'

    def ready(self):
        from accounts.models import User, PassportData
        from profiles.models import StudentProfile, TeacherProfile
        from assignments.models import Assignment, Submission
        from assessment.models import Exam, ExamAttempt, ExamType
        from attendance.models import Attendance
        from gradebook.models import GradebookEntry
        from journal.models import JournalRecord
        from proctoring.models import ProctorSession, ProctorEvent
        from materials.models import Material
        from subjects.models import Subject
        from groups.models import Group
        from directions.models import Direction
        # from analytics.models import AnalyticsModel1, AnalyticsModel2  # Agar analyticsda model bo'lsa, aniq import qiling
        from announcements.models import Announcement
        from student_tests.models import StudentTest, StudentAnswer
        from tests_app.models import Test, Question, Option

        # Register all models for audit logging
        auditlog.register(User)
        auditlog.register(PassportData)
        auditlog.register(StudentProfile)
        auditlog.register(TeacherProfile)
        auditlog.register(Assignment)
        auditlog.register(Submission)
        auditlog.register(Exam)
        auditlog.register(ExamAttempt)
        auditlog.register(ExamType)
        auditlog.register(Attendance)
        auditlog.register(GradebookEntry)
        auditlog.register(JournalRecord)
        auditlog.register(ProctorSession)
        auditlog.register(ProctorEvent)
        auditlog.register(Material)
        auditlog.register(Subject)
        auditlog.register(Group)
        auditlog.register(Direction)
        auditlog.register(Announcement)
        auditlog.register(StudentTest)
        auditlog.register(StudentAnswer)
        auditlog.register(Test)
        auditlog.register(Question)
        auditlog.register(Option)
