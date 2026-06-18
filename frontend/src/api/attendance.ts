import api from "./client";

export type AttendanceRecord = {
  id: number;
  lesson: number;
  student: number;
  status: "present" | "absent";
  timestamp?: string;
  face_check_count?: number;
  face_success_count?: number;
  face_verified_ratio?: number;
  joined_seconds?: number;
  joined_ratio?: number;
  finalized?: boolean;
  finalized_at?: string | null;
  manual_override?: boolean;
  override_reason?: string;
  overridden_by?: number | null;
  overridden_by_name?: string | null;
  overridden_at?: string | null;
};

export type AttendanceOverrideLog = {
  id: number;
  attendance: number;
  lesson: number;
  student: number;
  previous_status?: "present" | "absent" | null;
  new_status: "present" | "absent";
  previous_finalized: boolean;
  new_finalized: boolean;
  reason: string;
  changed_by?: number | null;
  changed_by_name?: string | null;
  created_at?: string;
};

export const fetchAttendance = async (studentId: number): Promise<AttendanceRecord[]> => {
  const res = await api.get<AttendanceRecord[]>(`/api/attendance/student/${studentId}/`);
  return res.data;
};

export type MarkAttendancePayload = {
  lesson: number;
  student: number;
  status: "present" | "absent";
  reason: string;
};

export const markAttendance = async (payload: MarkAttendancePayload) => {
  const res = await api.post("/api/attendance/mark/", payload);
  return res.data;
};

export const fetchLessonAttendance = async (lessonId: number): Promise<AttendanceRecord[]> => {
  const res = await api.get<AttendanceRecord[]>(`/api/attendance/lesson/${lessonId}/`);
  return res.data;
};

export const fetchAttendanceOverrideHistory = async (
  lessonId: number,
  studentId: number
): Promise<AttendanceOverrideLog[]> => {
  const res = await api.get<AttendanceOverrideLog[]>(
    `/api/attendance/lesson/${lessonId}/student/${studentId}/overrides/`
  );
  return res.data;
};

export const sendPresence = async (lessonId: number, frame: Blob) => {
  const form = new FormData();
  form.append("lesson_id", String(lessonId));
  form.append("frame", frame, "frame.jpg");
  const res = await api.post("/api/attendance/presence-check/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// ─────────────────────────────────────────────────────────
//  LessonActivityLog — Dars Faoliyati Davomati
// ─────────────────────────────────────────────────────────

export type ActivityStatus = "active" | "partial" | "absent";

export type LessonActivityLog = {
  id: number;
  lesson: number;
  lesson_topic?: string;
  student: number;
  student_name?: string;
  lesson_opened: boolean;
  lesson_opened_at?: string | null;
  material_viewed: boolean;
  material_viewed_at?: string | null;
  test_attended: boolean;
  test_score: number;
  assignment_submitted: boolean;
  assignment_submitted_at?: string | null;
  total_score: number;
  status: ActivityStatus;
  status_display?: string;
  computed_at?: string | null;
  updated_at?: string;
  // Asinxron (video) dars progressi
  video_watch_seconds?: number;
  video_duration_seconds?: number;
  video_progress_ratio?: number;
  video_completed?: boolean;
  video_completed_at?: string | null;
};

export type LessonActivitySummary = {
  total: number;
  active: number;
  partial: number;
  absent: number;
  active_pct?: number;
  partial_pct?: number;
  absent_pct?: number;
};

export type LessonActivityReport = {
  summary: LessonActivitySummary;
  records: LessonActivityLog[];
};

export type LessonActivityDetail = {
  lesson_id: number;
  lesson_topic?: string;
  summary: LessonActivitySummary;
  records: LessonActivityLog[];
};

/** Talaba dars sahifasini ochganida chaqiriladi (20 ball) */
export const trackLessonOpen = async (lessonId: number) => {
  const res = await api.post("/api/attendance/activity/lesson-open/", { lesson_id: lessonId });
  return res.data;
};

/** Talaba material/video ko'rib bo'lganida chaqiriladi (30 ball) */
export const trackMaterialViewed = async (lessonId: number) => {
  const res = await api.post("/api/attendance/activity/material-viewed/", { lesson_id: lessonId });
  return res.data;
};

export type VideoProgressResponse = {
  detail: string;
  video_watch_seconds: number;
  video_duration_seconds: number;
  video_progress_ratio: number;
  video_completed: boolean;
  completion_threshold: number;
  total_score: number;
  status: ActivityStatus;
};

/**
 * Asinxron (video) dars uchun ko'rish progressini serverga yuboradi (heartbeat).
 * Server real watch-time'ni kuzatadi va threshold (default 90%) bajarilganda
 * video_completed=true qaytaradi — shundan keyin keyingi bosqichlarga ruxsat ochiladi.
 */
export const trackVideoProgress = async (
  lessonId: number,
  watchSeconds: number,
  durationSeconds?: number
): Promise<VideoProgressResponse> => {
  const res = await api.post<VideoProgressResponse>(
    "/api/attendance/activity/video-progress/",
    {
      lesson_id: lessonId,
      watch_seconds: Math.floor(watchSeconds),
      ...(durationSeconds ? { duration_seconds: Math.floor(durationSeconds) } : {}),
    }
  );
  return res.data;
};

/** Talaba o'z faoliyat jurnalini oladi */
export const fetchMyActivityLogs = async (lessonId?: number): Promise<LessonActivityLog[]> => {
  const params = lessonId ? { lesson_id: lessonId } : {};
  const res = await api.get<LessonActivityLog[]>("/api/attendance/activity/my/", { params });
  return res.data;
};

/** O'qituvchi/Admin: bitta dars bo'yicha barcha talabalar faoliyati */
export const fetchLessonActivityDetail = async (lessonId: number): Promise<LessonActivityDetail> => {
  const res = await api.get<LessonActivityDetail>(`/api/attendance/activity/lesson/${lessonId}/`);
  return res.data;
};

/** O'qituvchi/Admin: hisobot (lesson_id yoki group_id bo'yicha filter) */
export const fetchActivityReport = async (params?: {
  lesson_id?: number;
  group_id?: number;
}): Promise<LessonActivityReport> => {
  const res = await api.get<LessonActivityReport>("/api/attendance/activity/report/", { params });
  return res.data;
};

// ─────────────────────────────────────────────────────────
//  Yagona hisobot (sinxron + asinxron birlashtirilgan)
// ─────────────────────────────────────────────────────────

export type UnifiedLessonRow = {
  lesson_id: number;
  lesson_topic: string;
  lesson_type: "live" | "video" | "pending";
  mode: "live" | "video";
  start_time?: string;
  end_time?: string;
  group_id?: number;
  total_score: number;
  activity_status: ActivityStatus;
  attended: boolean;
  attendance_status: "present" | "absent";
  attendance_finalized?: boolean;
  face_verified_ratio?: number;
  joined_ratio?: number;
  test_attended: boolean;
  test_score: number;
  assignment_submitted: boolean;
  video_completed?: boolean;
  video_progress_ratio?: number;
  video_watch_seconds?: number;
  video_duration_seconds?: number;
};

export type UnifiedSummary = {
  total_lessons: number;
  attended: number;
  attendance_rate: number;
  live_lessons: number;
  video_lessons: number;
  video_completed: number;
  activity_active: number;
  activity_partial: number;
  activity_absent: number;
  avg_activity_score: number;
  students_count?: number;
};

export type UnifiedStudentReport = {
  student_id: number;
  student_name: string;
  summary: UnifiedSummary;
  lessons: UnifiedLessonRow[];
};

export type UnifiedReport = {
  scope: "student" | "teacher" | "admin";
  filters: {
    student_id: number | null;
    group_id: number | null;
    lesson_id: number | null;
  };
  overall: UnifiedSummary;
  // student scope:
  summary?: UnifiedSummary;
  lessons?: UnifiedLessonRow[];
  // teacher/admin scope:
  students?: UnifiedStudentReport[];
};

/**
 * Yagona davomat + natijalar hisoboti.
 * Rolga qarab: student → o'zi, teacher → biriktirilgan guruhlar, admin → barchasi.
 */
export const fetchUnifiedReport = async (params?: {
  student_id?: number;
  group_id?: number;
  lesson_id?: number;
}): Promise<UnifiedReport> => {
  const res = await api.get<UnifiedReport>("/api/attendance/report/unified/", { params });
  return res.data;
};
