import api from "./client";
import type { User } from "../types/user";

export async function fetchMe(): Promise<User> {
  const res = await api.get<User>("/api/accounts/me/");
  return res.data;
}

export async function fetchTeacherStudents(): Promise<User[]> {
  const res = await api.get<User[]>("/api/accounts/teacher/students/");
  return res.data;
}
