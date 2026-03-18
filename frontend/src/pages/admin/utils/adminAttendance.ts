import type {
  AdminGroup,
  AdminLesson,
  AdminUser,
  AttendanceRecord,
  Subject,
  TeacherSubject,
} from "../../../api/admin";

export type AttendanceSubjectCard = {
  id: number;
  name: string;
};

export type AbsentLesson = {
  lessonId: number;
  topic: string;
  subject: string;
  group: string;
  startTime?: string;
  status: "present" | "absent";
  joinedRatio?: number;
  faceVerifiedRatio?: number;
  finalized?: boolean;
  manualOverride?: boolean;
  overrideReason?: string;
  overriddenByName?: string | null;
  overriddenAt?: string | null;
};

export type StudentRow = {
  studentId: number;
  studentName: string;
  groupName: string;
  levelLabel: string;
  absentCount: number;
  absentLessons: AbsentLesson[];
};

export type OverrideDraft = {
  lesson: number;
  student: number;
  status: "present" | "absent";
  studentName: string;
};

export type HistoryTarget = {
  lesson: number;
  student: number;
  studentName: string;
};

export const formatAttendanceRatio = (value?: number | null) =>
  value == null ? "-" : `${Math.round(value * 100)}%`;

export const buildAttendanceGroupMap = (groups: AdminGroup[]) =>
  new Map(groups.map((group) => [group.id, group] as const));

export const buildAttendanceLessonMap = (lessons: AdminLesson[]) =>
  new Map(lessons.map((lesson) => [lesson.id, lesson] as const));

export const buildLessonSubjectMap = (teacherSubjects: TeacherSubject[]) =>
  new Map(teacherSubjects.map((assignment) => [assignment.id, assignment.subject] as const));

export const buildAttendanceSubjectCards = (
  subjects: Subject[],
  directionId?: number | null,
): AttendanceSubjectCard[] => {
  if (!directionId) return [];
  return subjects
    .filter((subject) => (subject.directions || []).includes(directionId))
    .map((subject) => ({ id: subject.id, name: subject.name }))
    .sort((left, right) => left.name.localeCompare(right.name));
};

export const buildLessonsForSubject = (
  lessons: AdminLesson[],
  selectedSubjectId: number | null | undefined,
  lessonSubjectMap: Map<number, number>,
) => {
  if (!selectedSubjectId) return [];
  return lessons.filter((lesson) => lessonSubjectMap.get(lesson.teacher_subject) === selectedSubjectId);
};

export const filterStudentsForDirection = (
  students: AdminUser[],
  groupMap: Map<number, AdminGroup>,
  directionId?: number | null,
) => {
  if (!directionId) return students;
  return students.filter((student) => {
    if (!student.group) return false;
    return groupMap.get(student.group)?.direction === directionId;
  });
};

export const filterStudentsForSubject = (
  studentsForDirection: AdminUser[],
  selectedSubjectId: number | null | undefined,
  lessonGroupIds: Set<number>,
) => {
  if (!selectedSubjectId) return [];
  if (!lessonGroupIds.size) return studentsForDirection;
  return studentsForDirection.filter(
    (student) => typeof student.group === "number" && lessonGroupIds.has(student.group),
  );
};

export const buildAttendanceGroupOptions = (
  relevantGroupIds: Set<number>,
  groupMap: Map<number, AdminGroup>,
) =>
  Array.from(relevantGroupIds)
    .map((id) => groupMap.get(id))
    .filter((group): group is AdminGroup => Boolean(group))
    .map((group) => ({ value: group.id, label: group.name }));

export const filterAttendanceStudents = ({
  students,
  groupMap,
  groupFilter,
  search,
}: {
  students: AdminUser[];
  groupMap: Map<number, AdminGroup>;
  groupFilter: number | null;
  search: string;
}) => {
  const normalizedSearch = search.trim().toLowerCase();
  return students.filter((student) => {
    const group = student.group ? groupMap.get(student.group) : null;
    if (groupFilter && student.group !== groupFilter) return false;
    if (!normalizedSearch) return true;

    const fullName = `${student.first_name || ""} ${student.last_name || ""}`.trim().toLowerCase();
    const username = (student.username || "").toLowerCase();
    const groupName = (group?.name || "").toLowerCase();
    return (
      fullName.includes(normalizedSearch) ||
      username.includes(normalizedSearch) ||
      groupName.includes(normalizedSearch)
    );
  });
};

export const buildAttendanceRows = ({
  students,
  attendanceRecords,
  groupMap,
  lessonMap,
}: {
  students: AdminUser[];
  attendanceRecords: AttendanceRecord[];
  groupMap: Map<number, AdminGroup>;
  lessonMap: Map<number, AdminLesson>;
}): StudentRow[] => {
  const attendanceByStudent = new Map<number, AttendanceRecord[]>();
  attendanceRecords.forEach((record) => {
    const existing = attendanceByStudent.get(record.student) || [];
    existing.push(record);
    attendanceByStudent.set(record.student, existing);
  });

  return students.map((student) => {
    const group = student.group ? groupMap.get(student.group) : null;
    const absentLessons = (attendanceByStudent.get(student.id) || [])
      .filter((record) => record.status === "absent")
      .map((record) => {
        const lesson = lessonMap.get(record.lesson);
        return {
          lessonId: record.lesson,
          topic: lesson?.topic || `Dars #${record.lesson}`,
          subject: lesson?.subject_name || "-",
          group: lesson?.group_name || group?.name || "-",
          startTime: lesson?.start_time,
          status: "absent" as const,
          joinedRatio: record.joined_ratio,
          faceVerifiedRatio: record.face_verified_ratio,
          finalized: record.finalized,
          manualOverride: record.manual_override,
          overrideReason: record.override_reason,
          overriddenByName: record.overridden_by_name,
          overriddenAt: record.overridden_at,
        };
      });

    const levelParts = [group?.language, group?.level ? `${group.level}-bosqich` : null].filter(Boolean);

    return {
      studentId: student.id,
      studentName: `${student.first_name} ${student.last_name}`.trim() || student.username,
      groupName: group?.name || "-",
      levelLabel: levelParts.length ? levelParts.join(" | ") : "-",
      absentCount: absentLessons.length,
      absentLessons,
    };
  });
};
