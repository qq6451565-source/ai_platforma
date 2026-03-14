import api from "./client";

// ==== Users / Roles ====
export type AdminUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  group?: number | null;
  role: string;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
};

export const fetchUsers = async (role?: string) => {
  const res = await api.get<AdminUser[]>("/api/accounts/list/", {
    params: role ? { role } : undefined,
  });
  return res.data;
};

export const setUserRole = async (user_id: number, role: "student" | "teacher" | "admin") => {
  const res = await api.post("/api/accounts/admin/set-role/", { user_id, role });
  return res.data;
};

// ==== Groups ====
export type AdminGroup = {
  id: number;
  name: string;
  direction?: number;
  level?: number;
  language?: string;
};
export const fetchGroupsAdmin = async () => (await api.get<AdminGroup[]>("/api/groups/")).data;
export const createGroupAdmin = async (payload: Partial<AdminGroup>) =>
  (await api.post("/api/groups/", payload)).data;
export const deleteGroupAdmin = async (id: number) => (await api.delete(`/api/groups/${id}/`)).data;
export const updateGroupAdmin = async (id: number, payload: Partial<AdminGroup>) =>
  (await api.patch(`/api/groups/${id}/`, payload)).data;

// ==== Directions / Subjects ====
export type Direction = { id: number; name: string; language?: string; degree?: string };
export const fetchDirections = async () => (await api.get<Direction[]>("/api/directions/")).data;
export const createDirection = async (payload: Partial<Direction>) =>
  (await api.post("/api/directions/", payload)).data;
export const deleteDirection = async (id: number) => (await api.delete(`/api/directions/${id}/`)).data;
export const updateDirection = async (id: number, payload: Partial<Direction>) =>
  (await api.patch(`/api/directions/${id}/`, payload)).data;

export type Subject = {
  id: number;
  name: string;
  directions: number[];
  direction_names?: string[];
};
export const fetchSubjectsAdmin = async () => (await api.get<Subject[]>("/api/subjects/")).data;
export const createSubject = async (payload: Partial<Subject>) =>
  (await api.post("/api/subjects/", payload)).data;
export const deleteSubject = async (id: number) => (await api.delete(`/api/subjects/${id}/`)).data;
export const updateSubject = async (id: number, payload: Partial<Subject>) =>
  (await api.patch(`/api/subjects/${id}/`, payload)).data;

// ==== Teacher Subjects ====
export type TeacherSubject = { id: number; teacher: number; subject: number; groups: number[] };
export const fetchTeacherSubjects = async () => (await api.get<TeacherSubject[]>("/api/teacher-subject/")).data;
export const createTeacherSubject = async (payload: Partial<TeacherSubject>) =>
  (await api.post("/api/teacher-subject/", payload)).data;
export const deleteTeacherSubject = async (id: number) =>
  (await api.delete(`/api/teacher-subject/${id}/`)).data;
export const updateTeacherSubject = async (id: number, payload: Partial<TeacherSubject>) =>
  (await api.patch(`/api/teacher-subject/${id}/`, payload)).data;

// ==== Lessons (admin) ====
export type AdminLesson = {
  id: number;
  teacher_subject: number;
  group: number;
  topic: string;
  start_time: string;
  end_time: string;
  subject_name?: string;
  group_name?: string;
};
export const fetchLessonsAdmin = async () => (await api.get<AdminLesson[]>("/api/lessons/")).data;
export const createLessonAdmin = async (payload: Partial<AdminLesson>) =>
  (await api.post("/api/lessons/", payload)).data;
export const deleteLessonAdmin = async (id: number) => (await api.delete(`/api/lessons/${id}/`)).data;
export const updateLessonAdmin = async (id: number, payload: Partial<AdminLesson>) =>
  (await api.patch(`/api/lessons/${id}/`, payload)).data;

// ==== Attendance (admin) ====
export type AttendanceRecord = {
  id: number;
  lesson: number;
  student: number;
  status: string;
  timestamp?: string;
};
export const fetchLessonAttendance = async (lessonId: number) =>
  (await api.get<AttendanceRecord[]>(`/api/attendance/lesson/${lessonId}/`)).data;

// ==== Announcements ====
export type AdminAnnouncement = { id: number; title: string; content: string; created_at?: string };
export const fetchAnnouncementsAdmin = async () => (await api.get<AdminAnnouncement[]>("/api/announcements/")).data;
export const createAnnouncementAdmin = async (payload: { title: string; content: string }) =>
  (await api.post("/api/announcements/", payload)).data;
export const deleteAnnouncementAdmin = async (id: number) =>
  (await api.delete(`/api/announcements/${id}/`)).data;

// ==== Enrollment (pending registrations) ====
export type EnrollmentVerificationStatus = "verified" | "not_verified" | "unavailable" | "not_run";

export type EnrollmentVerification = {
  verified: boolean;
  confidence: number | null;
  created_at?: string;
  checked_at?: string | null;
  status: EnrollmentVerificationStatus;
  label: string;
  color: string;
  message: string;
  threshold?: number | null;
  reason?: string | null;
  manual_review_required: boolean;
  face_embedding_ready: boolean;
  event_summary: string[];
  events_json?: any[];
};

export type EnrollmentAiSummary = {
  status: EnrollmentVerificationStatus;
  label: string;
  color: string;
  message: string;
  confidence?: number | null;
  threshold?: number | null;
  checked_at?: string | null;
  reason?: string | null;
  manual_review_required: boolean;
  face_embedding_ready: boolean;
  event_summary: string[];
};

export type EnrollmentAllowedActions = {
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_reject: boolean;
  can_reopen: boolean;
  can_reverify: boolean;
};

export type EnrollmentItem = {
  id: number;
  full_name?: string;
  phone?: string;
  email?: string;
  direction_choice?: number | null;
  direction_name?: string | null;
  created_at?: string;
  status?: string;
  latest_verification?: EnrollmentVerification | null;
  ai_summary: EnrollmentAiSummary;
  allowed_actions: EnrollmentAllowedActions;
};

export type EnrollmentDetailItem = EnrollmentItem & {
  approved_at?: string | null;
  approved_by_name?: string | null;
  has_user?: boolean;
  documents?: {
    passport_front?: string;
    face_image?: string;
  };
  verification_history?: EnrollmentVerification[];
};

export const fetchEnrollment = async () => (await api.get<EnrollmentItem[]>("/api/enrollment/applicants/")).data;
export const fetchEnrollmentApplicant = async (id: number) =>
  (await api.get<EnrollmentDetailItem>(`/api/enrollment/applicants/${id}/`)).data;
export type EnrollmentApplicantUpdatePayload = {
  full_name?: string;
  phone?: string;
  email?: string;
  direction_choice?: number | null;
};
export const updateEnrollmentApplicant = async (id: number, payload: EnrollmentApplicantUpdatePayload) =>
  (await api.patch(`/api/enrollment/applicants/${id}/`, payload)).data;
export const deleteEnrollmentApplicant = async (id: number) =>
  (await api.delete(`/api/enrollment/applicants/${id}/`)).data;
export type ApproveEnrollmentPayload = {
  role: "student" | "teacher";
  group_id?: number;
  subject_id?: number;
  group_ids?: number[];
  admission_year?: number;
  manual_override_reason?: string;
};
export const approveEnrollment = async (id: number, payload: ApproveEnrollmentPayload) =>
  (await api.post(`/api/enrollment/approve/${id}/`, payload)).data;
export type ReopenEnrollmentPayload = {
  reopen_reason: string;
};
export const reopenEnrollment = async (id: number, payload: ReopenEnrollmentPayload) =>
  (await api.post(`/api/enrollment/reopen/${id}/`, payload)).data;
export const reverifyEnrollment = async (id: number) =>
  (await api.post(`/api/enrollment/reverify/${id}/`)).data;

// ==== Schedule (timetables/lesson slots) ====
export type AdminTimetable = { id: number; group: number; group_name?: string };
export const fetchTimetablesAdmin = async () => (await api.get<AdminTimetable[]>("/api/schedule/timetables/")).data;
export const createTimetableAdmin = async (payload: Partial<AdminTimetable>) =>
  (await api.post("/api/schedule/timetables/", payload)).data;
export const updateTimetableAdmin = async (id: number, payload: Partial<AdminTimetable>) =>
  (await api.patch(`/api/schedule/timetables/${id}/`, payload)).data;
export const deleteTimetableAdmin = async (id: number) =>
  (await api.delete(`/api/schedule/timetables/${id}/`)).data;

export type AdminLessonSlot = {
  id: number;
  timetable: number;
  subject: number;
  teacher: number;
  start_time: string;
  end_time: string;
  room?: string;
  mode?: string;
  subject_name?: string;
  teacher_name?: string;
  group_name?: string;
};
export const fetchLessonSlotsAdmin = async () => (await api.get<AdminLessonSlot[]>("/api/schedule/lesson-slots/")).data;
export const createLessonSlotAdmin = async (payload: Partial<AdminLessonSlot>) =>
  (await api.post("/api/schedule/lesson-slots/", payload)).data;
export const updateLessonSlotAdmin = async (id: number, payload: Partial<AdminLessonSlot>) =>
  (await api.patch(`/api/schedule/lesson-slots/${id}/`, payload)).data;
export const deleteLessonSlotAdmin = async (id: number) =>
  (await api.delete(`/api/schedule/lesson-slots/${id}/`)).data;

// ==== Assessment (exam types/exams/attempts) ====
export type ExamType = { id: number; name: string };
export type Exam = {
  id: number;
  subject: number;
  group: number;
  teacher: number;
  exam_type: number;
  duration_minutes: number;
  attempts: number;
  starts_at?: string;
  ends_at?: string;
  proctoring_required?: boolean;
};
export type ExamAttempt = {
  id: number;
  student: number;
  exam: number;
  attempt_no: number;
  started_at?: string;
  finished_at?: string;
  score_percent?: number;
  status?: string;
};
export const fetchExamTypes = async () => (await api.get<ExamType[]>("/api/assessment/exam-types/")).data;
export const createExamType = async (payload: Partial<ExamType>) =>
  (await api.post("/api/assessment/exam-types/", payload)).data;
export const updateExamType = async (id: number, payload: Partial<ExamType>) =>
  (await api.patch(`/api/assessment/exam-types/${id}/`, payload)).data;
export const deleteExamType = async (id: number) =>
  (await api.delete(`/api/assessment/exam-types/${id}/`)).data;
export const fetchExams = async () => (await api.get<Exam[]>("/api/assessment/exams/")).data;
export const createExam = async (payload: Partial<Exam>) =>
  (await api.post("/api/assessment/exams/", payload)).data;
export const updateExam = async (id: number, payload: Partial<Exam>) =>
  (await api.patch(`/api/assessment/exams/${id}/`, payload)).data;
export const deleteExam = async (id: number) =>
  (await api.delete(`/api/assessment/exams/${id}/`)).data;
export const fetchExamAttempts = async () => (await api.get<ExamAttempt[]>("/api/assessment/attempts/")).data;
export const updateExamAttempt = async (id: number, payload: Partial<ExamAttempt>) =>
  (await api.patch(`/api/assessment/attempts/${id}/`, payload)).data;
export const deleteExamAttempt = async (id: number) =>
  (await api.delete(`/api/assessment/attempts/${id}/`)).data;

// ==== Proctoring ====
export type ProctorSession = {
  id: number;
  user: number;
  exam_attempt: number;
  verified?: boolean;
  confidence?: number;
  started_at?: string;
  ended_at?: string;
};
export type ProctorEvent = {
  id: number;
  session: number;
  event_type: string;
  meta_json?: any;
  created_at?: string;
};
export const fetchProctorSessions = async () => (await api.get<ProctorSession[]>("/api/proctoring/sessions/")).data;
export const fetchProctorEvents = async () => (await api.get<ProctorEvent[]>("/api/proctoring/events/")).data;
export const updateProctorSession = async (id: number, payload: Partial<ProctorSession>) =>
  (await api.patch(`/api/proctoring/sessions/${id}/`, payload)).data;
export const deleteProctorSession = async (id: number) =>
  (await api.delete(`/api/proctoring/sessions/${id}/`)).data;
export const deleteProctorEvent = async (id: number) =>
  (await api.delete(`/api/proctoring/events/${id}/`)).data;

// ==== Gradebook ====
export type GradebookEntry = {
  id: number;
  student: number;
  subject: number;
  assignment_score: number;
  midterm_score: number;
  total_score: number;
};
export const fetchGradebookEntries = async () => (await api.get<GradebookEntry[]>("/api/gradebook/entries/")).data;
export const createGradebookEntry = async (payload: Partial<GradebookEntry>) =>
  (await api.post("/api/gradebook/entries/", payload)).data;
export const updateGradebookEntry = async (id: number, payload: Partial<GradebookEntry>) =>
  (await api.patch(`/api/gradebook/entries/${id}/`, payload)).data;
export const deleteGradebookEntry = async (id: number) =>
  (await api.delete(`/api/gradebook/entries/${id}/`)).data;
export const recalcGradebookEntry = async (id: number) =>
  (await api.post(`/api/gradebook/recalculate/${id}/`)).data;

// ==== Journal ====
export type JournalRecord = {
  id: number;
  lesson: number;
  student: number;
  group: number;
  attendance: string;
  grade?: number;
  comment?: string;
  date?: string;
};
export const fetchJournalRecords = async () => (await api.get<JournalRecord[]>("/api/journal/records/")).data;
export const createJournalRecord = async (payload: Partial<JournalRecord>) =>
  (await api.post("/api/journal/records/", payload)).data;
export const updateJournalRecord = async (id: number, payload: Partial<JournalRecord>) =>
  (await api.patch(`/api/journal/records/${id}/`, payload)).data;
export const deleteJournalRecord = async (id: number) =>
  (await api.delete(`/api/journal/records/${id}/`)).data;

// ==== Profiles ====
export type StudentProfile = {
  id: number;
  user: number;
  direction?: number;
  group?: number;
  admission_year: number;
  status: string;
};
export type TeacherProfile = {
  id: number;
  user: number;
};
export const fetchStudentProfiles = async () => (await api.get<StudentProfile[]>("/api/profiles/students/")).data;
export const createStudentProfile = async (payload: Partial<StudentProfile>) =>
  (await api.post("/api/profiles/students/", payload)).data;
export const updateStudentProfile = async (id: number, payload: Partial<StudentProfile>) =>
  (await api.patch(`/api/profiles/students/${id}/`, payload)).data;
export const deleteStudentProfile = async (id: number) =>
  (await api.delete(`/api/profiles/students/${id}/`)).data;
export const fetchTeacherProfiles = async () => (await api.get<TeacherProfile[]>("/api/profiles/teachers/")).data;
export const createTeacherProfile = async (payload: Partial<TeacherProfile>) =>
  (await api.post("/api/profiles/teachers/", payload)).data;
export const updateTeacherProfile = async (id: number, payload: Partial<TeacherProfile>) =>
  (await api.patch(`/api/profiles/teachers/${id}/`, payload)).data;
export const deleteTeacherProfile = async (id: number) =>
  (await api.delete(`/api/profiles/teachers/${id}/`)).data;

// ==== Analytics ====
export type AdminAnalytics = Record<string, any>;
export const fetchAdminAnalytics = async () => (await api.get<AdminAnalytics>("/api/analytics/dashboard/admin/")).data;

// ==== AI settings ====
export type AISettings = {
  id: number;
  ai_enabled: boolean;
  api_base_url?: string | null;
  api_key?: string | null;
  timeout_seconds: number;
  retry_count: number;
  ocr_confidence_threshold: number;
  max_image_size_mb: number;
  face_model?: string | null;
  detection_backend?: string | null;
  enforce_detection: boolean;
  enable_presence: boolean;
  enable_face_match: boolean;
  presence_threshold: number;
  face_match_threshold: number;
  proctor_strict: boolean;
  proctor_missing_seconds: number;
  updated_at?: string;
};
export const fetchAISettings = async () => (await api.get<AISettings>("/api/ai/settings/")).data;
export const updateAISettings = async (payload: Partial<AISettings>) =>
  (await api.patch("/api/ai/settings/", payload)).data;

export type AIHealth = {
  status: string;
  enabled: boolean;
  base_url?: string | null;
  api_key_set: boolean;
  timeout: number;
  gateway?: Record<string, any>;
};
export const fetchAIHealth = async () => (await api.get<AIHealth>("/api/ai/health/")).data;

// ==== Student tests (admin) ====
export type StudentTestRecord = {
  id: number;
  student: number;
  test: number;
  test_title?: string;
  lesson_topic?: string;
  subject_name?: string;
  group_name?: string;
  started_at?: string;
  finished_at?: string;
  current_question_index?: number;
  score_percent?: number;
  is_finished?: boolean;
};
export type StudentAnswerRecord = {
  id: number;
  student_test: number;
  question: number;
  selected_option?: number;
  is_correct?: boolean;
  answered_at?: string;
};
export const fetchStudentTests = async () => (await api.get<StudentTestRecord[]>("/api/student-tests/records/")).data;
export const deleteStudentTest = async (id: number) =>
  (await api.delete(`/api/student-tests/records/${id}/`)).data;
export const fetchStudentAnswers = async () => (await api.get<StudentAnswerRecord[]>("/api/student-tests/answers/")).data;
export const deleteStudentAnswer = async (id: number) =>
  (await api.delete(`/api/student-tests/answers/${id}/`)).data;

// ==== Chat (admin) ====
export type ChatMessage = {
  id: number;
  group: number;
  sender: number;
  text: string;
  created_at?: string;
  is_seen?: boolean;
};
export const fetchChatMessages = async () => (await api.get<ChatMessage[]>("/api/chat/chat/")).data;
export const deleteChatMessage = async (id: number) =>
  (await api.delete(`/api/chat/chat/${id}/`)).data;

// ==== Live rooms (admin) ====
export type LiveRoom = {
  id: number;
  lesson: number;
  lesson_topic?: string;
  room_name: string;
  jitsi_url?: string;
  is_active?: boolean;
  started_at?: string;
  ended_at?: string;
};
export const fetchLiveRooms = async () => (await api.get<LiveRoom[]>("/api/live/rooms/")).data;
export const createLiveRoom = async (lesson_id: number) =>
  (await api.post("/api/live/rooms/", { lesson_id })).data;
export const deleteLiveRoom = async (id: number) =>
  (await api.delete(`/api/live/rooms/${id}/`)).data;

// ==== Audit logs ====
export type AuditLogExtra = {
  applicant_id?: number;
  applicant_name?: string;
  applicant_status?: string;
  new_status?: string;
  approved_role?: string;
  manual_override_required?: boolean;
  manual_override_reason?: string | null;
  reject_reason?: string | null;
  reopen_reason?: string | null;
  ai_verified?: boolean;
  ai_confidence?: number | null;
  verified?: boolean;
  confidence?: number | null;
  had_user?: boolean;
};

export type AuditLog = {
  id: number;
  user?: number | null;
  user_username?: string;
  action: string;
  role?: string;
  ip_address?: string | null;
  user_agent?: string;
  extra?: AuditLogExtra;
  created_at?: string;
};
export type FetchAuditLogsParams = {
  action?: string;
  domain?: "all" | "auth" | "enrollment";
  search?: string;
  applicant_id?: number;
};
export const fetchAuditLogs = async (params?: FetchAuditLogsParams) =>
  (
    await api.get<AuditLog[]>("/api/accounts/admin/audit-logs/", {
      params: params?.domain === "all" ? { ...params, domain: undefined } : params,
    })
  ).data;
export const deleteAuditLog = async (id: number) =>
  (await api.delete(`/api/accounts/admin/audit-logs/${id}/`)).data;

export type RejectEnrollmentPayload = {
  reject_reason: string;
};
export const rejectEnrollment = async (id: number, payload?: RejectEnrollmentPayload) =>
  (await api.post(`/api/enrollment/reject/${id}/`, payload)).data;

// ==== Passport data ====
export type PassportData = {
  id: number;
  user: number;
  user_username?: string;
  passport_series: string;
  passport_number: string;
  birth_date?: string;
  extracted_fullname?: string;
  front_image?: string;
  back_image?: string;
  selfie_image?: string;
};
export const fetchPassportData = async () =>
  (await api.get<PassportData[]>("/api/accounts/admin/passports/")).data;
export const createPassportData = async (payload: FormData) =>
  (await api.post("/api/accounts/admin/passports/", payload, { headers: { "Content-Type": "multipart/form-data" } }))
    .data;
export const updatePassportData = async (id: number, payload: FormData) =>
  (await api.patch(`/api/accounts/admin/passports/${id}/`, payload, { headers: { "Content-Type": "multipart/form-data" } }))
    .data;
export const deletePassportData = async (id: number) =>
  (await api.delete(`/api/accounts/admin/passports/${id}/`)).data;

// ==== Admin users (full CRUD) ====
export const fetchAdminUsers = async () =>
  (await api.get<AdminUser[]>("/api/accounts/admin/users/")).data;
export const createAdminUser = async (payload: Partial<AdminUser> & { password?: string }) =>
  (await api.post("/api/accounts/admin/users/", payload)).data;
export const updateAdminUser = async (id: number, payload: Partial<AdminUser> & { password?: string }) =>
  (await api.patch(`/api/accounts/admin/users/${id}/`, payload)).data;
export const deleteAdminUser = async (id: number) =>
  (await api.delete(`/api/accounts/admin/users/${id}/`)).data;

// ==== Auth groups & permissions ====
export type PermissionItem = {
  id: number;
  name: string;
  codename: string;
  app_label: string;
  model: string;
};
export type AuthGroup = { id: number; name: string; permissions: number[] };
export const fetchPermissions = async () =>
  (await api.get<PermissionItem[]>("/api/accounts/admin/permissions/")).data;
export const fetchAuthGroups = async () =>
  (await api.get<AuthGroup[]>("/api/accounts/admin/auth-groups/")).data;
export const createAuthGroup = async (payload: Partial<AuthGroup>) =>
  (await api.post("/api/accounts/admin/auth-groups/", payload)).data;
export const updateAuthGroup = async (id: number, payload: Partial<AuthGroup>) =>
  (await api.patch(`/api/accounts/admin/auth-groups/${id}/`, payload)).data;
export const deleteAuthGroup = async (id: number) =>
  (await api.delete(`/api/accounts/admin/auth-groups/${id}/`)).data;

// ==== Auth tokens ====
export type AuthToken = { key: string; user: number; user_username?: string; created?: string };
export const fetchAuthTokens = async () =>
  (await api.get<AuthToken[]>("/api/accounts/admin/auth-tokens/")).data;
export const createAuthToken = async (payload: { user: number }) =>
  (await api.post("/api/accounts/admin/auth-tokens/", payload)).data;
export const deleteAuthToken = async (key: string) =>
  (await api.delete(`/api/accounts/admin/auth-tokens/${key}/`)).data;

// ==== Token blacklist ====
export type OutstandingToken = {
  id: number;
  user?: number | null;
  user_username?: string;
  jti: string;
  token: string;
  created_at?: string;
  expires_at?: string;
};
export type BlacklistedToken = {
  id: number;
  token: number;
  token_jti?: string;
  user?: number | null;
  user_username?: string;
  blacklisted_at?: string;
};
export const fetchOutstandingTokens = async () =>
  (await api.get<OutstandingToken[]>("/api/accounts/admin/outstanding-tokens/")).data;
export const fetchBlacklistedTokens = async () =>
  (await api.get<BlacklistedToken[]>("/api/accounts/admin/blacklisted-tokens/")).data;
export const createBlacklistedToken = async (payload: { token: number }) =>
  (await api.post("/api/accounts/admin/blacklisted-tokens/", payload)).data;
export const deleteBlacklistedToken = async (id: number) =>
  (await api.delete(`/api/accounts/admin/blacklisted-tokens/${id}/`)).data;

// ==== Tests App (Questions/Options) ====
export type TestQuestion = { id: number; test: number; text: string; order: number; points: number };
export type TestOption = { id: number; question: number; text: string; is_correct: boolean };
export const fetchTestQuestions = async () =>
  (await api.get<TestQuestion[]>("/api/tests/questions/")).data;
export const createTestQuestion = async (payload: Partial<TestQuestion>) =>
  (await api.post("/api/tests/questions/", payload)).data;
export const updateTestQuestion = async (id: number, payload: Partial<TestQuestion>) =>
  (await api.patch(`/api/tests/questions/${id}/`, payload)).data;
export const deleteTestQuestion = async (id: number) =>
  (await api.delete(`/api/tests/questions/${id}/`)).data;
export const fetchTestOptions = async () =>
  (await api.get<TestOption[]>("/api/tests/options/")).data;
export const createTestOption = async (payload: Partial<TestOption>) =>
  (await api.post("/api/tests/options/", payload)).data;
export const updateTestOption = async (id: number, payload: Partial<TestOption>) =>
  (await api.patch(`/api/tests/options/${id}/`, payload)).data;
export const deleteTestOption = async (id: number) =>
  (await api.delete(`/api/tests/options/${id}/`)).data;

// ==== Live participants ====
export type LiveParticipant = {
  id: number;
  room: number;
  user: number;
  user_name?: string;
  joined_at?: string;
  left_at?: string | null;
  is_teacher?: boolean;
};
export const fetchLiveParticipants = async () =>
  (await api.get<LiveParticipant[]>("/api/live/participants/")).data;
export const deleteLiveParticipant = async (id: number) =>
  (await api.delete(`/api/live/participants/${id}/`)).data;

// ==== Enrollment windows/documents/verifications ====
export type EnrollmentWindow = {
  id: number;
  is_active: boolean;
};
export const fetchEnrollmentWindows = async () =>
  (await api.get<EnrollmentWindow[]>("/api/enrollment/windows/")).data;
export const createEnrollmentWindow = async (payload: Partial<EnrollmentWindow>) =>
  (await api.post("/api/enrollment/windows/", payload)).data;
export const updateEnrollmentWindow = async (id: number, payload: Partial<EnrollmentWindow>) =>
  (await api.patch(`/api/enrollment/windows/${id}/`, payload)).data;
export const deleteEnrollmentWindow = async (id: number) =>
  (await api.delete(`/api/enrollment/windows/${id}/`)).data;

export type EnrollmentDocument = {
  id: number;
  applicant: number;
  passport_front?: string;
  passport_back?: string;
  face_image?: string;
};
export const fetchEnrollmentDocuments = async () =>
  (await api.get<EnrollmentDocument[]>("/api/enrollment/documents/")).data;
export const createEnrollmentDocument = async (payload: FormData) =>
  (await api.post("/api/enrollment/documents/", payload, { headers: { "Content-Type": "multipart/form-data" } }))
    .data;
export const updateEnrollmentDocument = async (id: number, payload: FormData) =>
  (await api.patch(`/api/enrollment/documents/${id}/`, payload, { headers: { "Content-Type": "multipart/form-data" } }))
    .data;
export const deleteEnrollmentDocument = async (id: number) =>
  (await api.delete(`/api/enrollment/documents/${id}/`)).data;

export type VerificationResult = {
  id: number;
  applicant: number;
  verified: boolean;
  confidence: number;
  events_json: any;
  created_at?: string;
};
export const fetchVerificationResults = async () =>
  (await api.get<VerificationResult[]>("/api/enrollment/verifications/")).data;
export const createVerificationResult = async (payload: Partial<VerificationResult>) =>
  (await api.post("/api/enrollment/verifications/", payload)).data;
export const updateVerificationResult = async (id: number, payload: Partial<VerificationResult>) =>
  (await api.patch(`/api/enrollment/verifications/${id}/`, payload)).data;
export const deleteVerificationResult = async (id: number) =>
  (await api.delete(`/api/enrollment/verifications/${id}/`)).data;
