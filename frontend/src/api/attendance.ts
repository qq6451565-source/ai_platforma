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
