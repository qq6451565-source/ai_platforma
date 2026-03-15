from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from accounts.models import User
from assignments.models import Assignment
from directions.models import Direction
from groups.models import Group
from lessons.models import Lesson
from subjects.models import Subject
from teacher_subject.models import TeacherSubject
from tests_app.models import Option, Question, Test


class AcademicFixtureMixin:
    def create_academic_context(self) -> None:
        now = timezone.now().replace(microsecond=0)

        self.direction = Direction.objects.create(
            name="Software Engineering",
            language="uz",
            degree="bachelor",
        )
        self.group = Group.objects.create(
            direction=self.direction,
            language="uz",
            level=2,
        )
        self.teacher = User.objects.create_user(
            username="teacher_user",
            password="secret",
            role="teacher",
            first_name="Ali",
            last_name="Teacher",
        )
        self.student = User.objects.create_user(
            username="student_user",
            password="secret",
            role="student",
            first_name="Vali",
            last_name="Student",
            group=self.group,
        )
        self.subject = Subject.objects.create(name="Algorithms")
        self.subject.directions.add(self.direction)
        self.teacher_subject = TeacherSubject.objects.create(
            teacher=self.teacher,
            subject=self.subject,
        )
        self.teacher_subject.groups.add(self.group)

        self.lesson_start = now - timedelta(minutes=100)
        self.lesson_end = now
        self.lesson = Lesson.objects.create(
            teacher_subject=self.teacher_subject,
            group=self.group,
            topic="Graph Traversal",
            start_time=self.lesson_start,
            end_time=self.lesson_end,
        )

    def create_lesson_test(self) -> Test:
        test = Test.objects.create(
            title="Graph Test",
            description="Attendance-gated test",
            lesson=self.lesson,
            subject=self.subject,
            group=self.group,
            teacher=self.teacher,
            is_active=True,
        )
        question = Question.objects.create(
            test=test,
            text="DFS nimani anglatadi?",
            order=1,
            points=10,
        )
        Option.objects.create(question=question, text="Depth First Search", is_correct=True)
        Option.objects.create(question=question, text="Data Flow Syntax", is_correct=False)
        return test

    def create_assignment(self) -> Assignment:
        return Assignment.objects.create(
            lesson=self.lesson,
            teacher_subject=self.teacher_subject,
            title="Graph Homework",
            description="Attendance-gated assignment",
            deadline=self.lesson_end + timedelta(days=2),
        )
