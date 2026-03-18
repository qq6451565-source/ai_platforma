import { queryOptions } from "@tanstack/react-query";

import {
  fetchDirections,
  fetchExamAttempts,
  fetchExams,
  fetchExamTypes,
  fetchAuthTokens,
  fetchAuditLogs,
  fetchEnrollment,
  fetchEnrollmentApplicant,
  fetchEnrollmentDocuments,
  fetchEnrollmentWindows,
  fetchGroupsAdmin,
  fetchJournalRecords,
  fetchLessonsAdmin,
  fetchLessonAttendance,
  fetchLessonSlotsAdmin,
  fetchPassportData,
  fetchStudentProfiles,
  fetchStudentTests,
  fetchSubjectsAdmin,
  fetchTeacherSubjects,
  fetchTimetablesAdmin,
  fetchUsers,
  fetchVerificationResults,
  fetchGradebookEntries,
} from "../../../api/admin";
import { fetchAttendanceOverrideHistory } from "../../../api/attendance";
import { fetchAssignments } from "../../../api/assignments";
import { fetchMaterials } from "../../../api/materials";
import { fetchAllSubmissions } from "../../../api/submissions";
import { fetchTests } from "../../../api/tests";
import { ADMIN_QUERY_KEYS } from "./adminWorkflowMutations";

export const adminQueryOptions = {
  users: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.users,
      queryFn: () => fetchUsers(),
    }),
  students: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.students,
      queryFn: () => fetchUsers("student"),
    }),
  teachers: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.teachers,
      queryFn: () => fetchUsers("teacher"),
    }),
  directions: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.directions,
      queryFn: fetchDirections,
    }),
  groups: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.groups,
      queryFn: fetchGroupsAdmin,
    }),
  subjects: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.subjects,
      queryFn: fetchSubjectsAdmin,
    }),
  lessons: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.lessons,
      queryFn: fetchLessonsAdmin,
    }),
  timetables: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.timetables,
      queryFn: fetchTimetablesAdmin,
    }),
  lessonSlots: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.lessonSlots,
      queryFn: fetchLessonSlotsAdmin,
    }),
  studentProfiles: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.studentProfiles,
      queryFn: fetchStudentProfiles,
    }),
  teacherSubjects: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.teacherSubjects,
      queryFn: fetchTeacherSubjects,
    }),
  passports: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.passports,
      queryFn: fetchPassportData,
    }),
  gradebook: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.gradebook,
      queryFn: fetchGradebookEntries,
    }),
  materials: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.materials,
      queryFn: fetchMaterials,
    }),
  assignments: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.assignments,
      queryFn: fetchAssignments,
    }),
  tests: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.tests,
      queryFn: fetchTests,
    }),
  authTokens: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.authTokens,
      queryFn: fetchAuthTokens,
    }),
  journalRecords: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.journalRecords,
      queryFn: fetchJournalRecords,
    }),
  examTypes: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.examTypes,
      queryFn: fetchExamTypes,
    }),
  exams: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.exams,
      queryFn: fetchExams,
    }),
  examAttempts: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.examAttempts,
      queryFn: fetchExamAttempts,
    }),
  enrollmentList: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.enrollmentList,
      queryFn: fetchEnrollment,
    }),
  enrollmentDetail: (id?: number | null) =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.enrollmentDetail(id),
      queryFn: () => fetchEnrollmentApplicant(id as number),
    }),
  enrollmentAudit: (id?: number | null) =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.enrollmentAudit(id),
      queryFn: () =>
        fetchAuditLogs({
          domain: "enrollment",
          applicant_id: id as number,
        }),
    }),
  enrollmentWindows: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.enrollmentWindows,
      queryFn: fetchEnrollmentWindows,
    }),
  enrollmentDocuments: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.enrollmentDocuments,
      queryFn: fetchEnrollmentDocuments,
    }),
  enrollmentVerifications: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.enrollmentVerifications,
      queryFn: fetchVerificationResults,
    }),
  submissions: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.submissions,
      queryFn: fetchAllSubmissions,
    }),
  studentTests: () =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.studentTests,
      queryFn: fetchStudentTests,
    }),
  attendance: (lessonIds: number[]) => {
    const lessonKey = lessonIds.join(",");
    return queryOptions({
      queryKey: ADMIN_QUERY_KEYS.attendance(lessonKey),
      queryFn: async () => {
        if (!lessonIds.length) return [];
        const results = await Promise.all(lessonIds.map((id) => fetchLessonAttendance(id).catch(() => [])));
        return results.flat();
      },
    });
  },
  attendanceOverrideHistory: (lesson?: number, student?: number) =>
    queryOptions({
      queryKey: ADMIN_QUERY_KEYS.attendanceOverrideHistory(lesson, student),
      queryFn: () => fetchAttendanceOverrideHistory(lesson as number, student as number),
    }),
};
