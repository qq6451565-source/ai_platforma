import api from "./client";

export type AttendanceRecord = {
  id: number;
  lesson: number;
  student: number;
  status: string;
  timestamp: string;
};

export async function fetchAttendance(studentId: number): Promise<AttendanceRecord[]> {
  const res = await api.get<AttendanceRecord[]>(`/api/attendance/student/${studentId}/`);
  return res.data;
}
