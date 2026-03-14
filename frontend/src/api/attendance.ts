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

export const sendPresence = async (lessonId: number, frame: Blob) => {
  const form = new FormData();
  form.append("lesson_id", String(lessonId));
  form.append("frame", frame, "frame.jpg");
  const res = await api.post("/api/attendance/presence-check/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};
