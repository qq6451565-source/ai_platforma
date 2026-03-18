import type { QueryClient } from "@tanstack/react-query";

export const ADMIN_QUERY_KEYS = {
  users: ["admin-users"] as const,
  students: ["admin-students"] as const,
  teachers: ["admin-teachers"] as const,
  studentPlacementUsers: ["admin-users", "student-placement"] as const,
  teacherWorkloadUsers: ["admin-users", "teacher-workload"] as const,
  directions: ["admin-directions"] as const,
  groups: ["admin-groups"] as const,
  subjects: ["admin-subjects"] as const,
  lessons: ["admin-lessons"] as const,
  timetables: ["admin-timetables"] as const,
  lessonSlots: ["admin-lesson-slots"] as const,
  studentProfiles: ["admin-student-profiles"] as const,
  teacherSubjects: ["admin-teacher-subjects"] as const,
  passports: ["admin-passports"] as const,
  gradebook: ["admin-gradebook"] as const,
  materials: ["admin-materials"] as const,
  assignments: ["admin-assignments"] as const,
  tests: ["admin-tests"] as const,
  authTokens: ["admin-auth-tokens"] as const,
  authGroups: ["admin-auth-groups"] as const,
  permissions: ["admin-permissions"] as const,
  journalRecords: ["admin-journal-records"] as const,
  examTypes: ["admin-exam-types"] as const,
  exams: ["admin-exams"] as const,
  examAttempts: ["admin-exam-attempts"] as const,
  outstandingTokens: ["admin-outstanding-tokens"] as const,
  blacklistedTokens: ["admin-blacklisted-tokens"] as const,
  proctorSessions: ["admin-proctor-sessions"] as const,
  proctorEvents: ["admin-proctor-events"] as const,
  liveRooms: ["admin-live-rooms"] as const,
  liveParticipants: ["admin-live-participants"] as const,
  enrollmentList: ["admin-enrollment-list"] as const,
  enrollmentDetail: (id?: number | null) => ["admin-enrollment-detail", id] as const,
  enrollmentAudit: (id?: number | null) => ["admin-enrollment-audit", id] as const,
  enrollmentWindows: ["admin-enrollment-windows"] as const,
  enrollmentDocuments: ["admin-enrollment-docs"] as const,
  enrollmentVerifications: ["admin-enrollment-verifications"] as const,
  submissions: ["admin-submissions"] as const,
  studentTests: ["admin-student-tests"] as const,
  studentAnswers: ["admin-student-answers"] as const,
  auditLogs: (domain: string, action: string, search: string) =>
    ["admin-audit-logs", domain, action, search] as const,
  attendance: (lessonIdsKey: string) => ["admin-attendance", lessonIdsKey] as const,
  attendanceOverrideHistory: (lesson?: number, student?: number) =>
    ["attendance-override-history", lesson, student] as const,
};

export const ADMIN_INVALIDATION_GROUPS = {
  usersOnly: [ADMIN_QUERY_KEYS.users] as const,
  userDirectory: [
    ADMIN_QUERY_KEYS.users,
    ADMIN_QUERY_KEYS.studentPlacementUsers,
    ADMIN_QUERY_KEYS.teacherWorkloadUsers,
  ] as const,
  roleChange: [
    ADMIN_QUERY_KEYS.users,
    ADMIN_QUERY_KEYS.studentPlacementUsers,
    ADMIN_QUERY_KEYS.teacherWorkloadUsers,
    ADMIN_QUERY_KEYS.studentProfiles,
    ADMIN_QUERY_KEYS.teacherSubjects,
  ] as const,
  studentPlacement: [
    ADMIN_QUERY_KEYS.users,
    ADMIN_QUERY_KEYS.studentPlacementUsers,
    ADMIN_QUERY_KEYS.studentProfiles,
  ] as const,
  teacherWorkload: [
    ADMIN_QUERY_KEYS.teacherSubjects,
    ADMIN_QUERY_KEYS.teacherWorkloadUsers,
  ] as const,
  teacherSubjectsOnly: [ADMIN_QUERY_KEYS.teacherSubjects] as const,
  passportsOnly: [ADMIN_QUERY_KEYS.passports] as const,
};

const toErrorMessage = (value: unknown) => {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === "string" && item.trim());
    return typeof first === "string" ? first : null;
  }
  return null;
};

export const getAdminApiErrorMessage = (
  error: unknown,
  preferredFields: string[],
  fallback: string,
) => {
  const data = (error as any)?.response?.data;
  for (const field of preferredFields) {
    const message = toErrorMessage(data?.[field]);
    if (message) {
      return message;
    }
  }
  const detailMessage = toErrorMessage(data?.detail);
  if (detailMessage) {
    return detailMessage;
  }
  return fallback;
};

export const invalidateAdminQueries = async (
  queryClient: Pick<QueryClient, "invalidateQueries">,
  queryKeys: readonly (readonly unknown[])[],
) => {
  await Promise.all(
    queryKeys.map((queryKey) =>
      queryClient.invalidateQueries({
        queryKey,
      }),
    ),
  );
};

export const getEnrollmentInvalidationKeys = (id?: number | null) =>
  [
    ADMIN_QUERY_KEYS.enrollmentList,
    ...(id
      ? [ADMIN_QUERY_KEYS.enrollmentDetail(id), ADMIN_QUERY_KEYS.enrollmentAudit(id)]
      : []),
  ] as const;
