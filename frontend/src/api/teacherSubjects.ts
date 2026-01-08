import api from "./client";
import type { TeacherSubject } from "../types/teacherSubject";

export async function fetchTeacherSubjects(): Promise<TeacherSubject[]> {
  const res = await api.get<TeacherSubject[]>("/api/teacher-subject/");
  return res.data;
}
