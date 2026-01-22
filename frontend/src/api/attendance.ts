import api from "./client";

export type AttendanceRecord = {
  id: number;
  lesson: number;
  student: number;
  status: "present" | "absent";
  timestamp?: string;
};

export const fetchAttendance = async (studentId: number): Promise<AttendanceRecord[]> => {
  const res = await api.get<AttendanceRecord[]>(`/api/attendance/student/${studentId}/`);
  return res.data;
};

export type MarkAttendancePayload = {
  lesson: number;
  student: number;
  status: "present" | "absent";
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
