import { describe, expect, it } from "vitest";

import type {
  AdminGroup,
  AdminLesson,
  AdminUser,
  AttendanceRecord,
  Subject,
  TeacherSubject,
} from "../../../api/admin";
import {
  buildAttendanceGroupMap,
  buildAttendanceLessonMap,
  buildAttendanceRows,
  buildAttendanceSubjectCards,
  buildLessonSubjectMap,
  buildLessonsForSubject,
  filterAttendanceStudents,
  filterStudentsForDirection,
  filterStudentsForSubject,
  formatAttendanceRatio,
} from "./adminAttendance";

const groups: AdminGroup[] = [
  { id: 11, name: "SE-201", direction: 100, level: 2, language: "uz" },
  { id: 22, name: "CS-301", direction: 200, level: 3, language: "en" },
];

const students: AdminUser[] = [
  {
    id: 1,
    username: "ali",
    email: "ali@example.com",
    first_name: "Ali",
    last_name: "Valiyev",
    group: 11,
    role: "student",
  },
  {
    id: 2,
    username: "sardor",
    email: "sardor@example.com",
    first_name: "Sardor",
    last_name: "Karimov",
    group: 22,
    role: "student",
  },
];

const subjects: Subject[] = [
  { id: 5, name: "Algorithms", directions: [100, 200] },
  { id: 7, name: "Databases", directions: [100] },
];

const teacherSubjects: TeacherSubject[] = [
  { id: 101, teacher: 9, subject: 7, groups: [11] },
];

const lessons: AdminLesson[] = [
  {
    id: 501,
    teacher_subject: 101,
    group: 11,
    topic: "Normalization",
    start_time: "2026-03-10T09:00:00Z",
    end_time: "2026-03-10T10:00:00Z",
    subject_name: "Databases",
    group_name: "SE-201",
  },
];

const attendanceRecords: AttendanceRecord[] = [
  {
    id: 900,
    lesson: 501,
    student: 1,
    status: "absent",
    joined_ratio: 0.42,
    face_verified_ratio: 0.5,
    finalized: true,
    manual_override: true,
    override_reason: "Manual tekshirildi",
    overridden_by_name: "Admin",
  },
];

describe("adminAttendance utils", () => {
  it("formats attendance ratios", () => {
    expect(formatAttendanceRatio(0.66)).toBe("66%");
    expect(formatAttendanceRatio(null)).toBe("-");
  });

  it("filters subjects, lessons and students by academic context", () => {
    const groupMap = buildAttendanceGroupMap(groups);
    const lessonSubjectMap = buildLessonSubjectMap(teacherSubjects);

    expect(buildAttendanceSubjectCards(subjects, 100).map((subject) => subject.id)).toEqual([5, 7]);
    expect(buildLessonsForSubject(lessons, 7, lessonSubjectMap).map((lesson) => lesson.id)).toEqual([501]);
    expect(filterStudentsForDirection(students, groupMap, 100).map((student) => student.id)).toEqual([1]);
    expect(
      filterStudentsForSubject(filterStudentsForDirection(students, groupMap, 100), 7, new Set([11])).map(
        (student) => student.id,
      ),
    ).toEqual([1]);
  });

  it("builds attendance rows from absent lesson records", () => {
    const groupMap = buildAttendanceGroupMap(groups);
    const lessonMap = buildAttendanceLessonMap(lessons);
    const filteredStudents = filterAttendanceStudents({
      students,
      groupMap,
      groupFilter: 11,
      search: "ali",
    });

    const rows = buildAttendanceRows({
      students: filteredStudents,
      attendanceRecords,
      groupMap,
      lessonMap,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      studentId: 1,
      groupName: "SE-201",
      levelLabel: "uz | 2-bosqich",
      absentCount: 1,
    });
    expect(rows[0].absentLessons[0]).toMatchObject({
      lessonId: 501,
      topic: "Normalization",
      subject: "Databases",
      manualOverride: true,
    });
  });
});
