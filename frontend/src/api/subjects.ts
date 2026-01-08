import api from "./client";
import type { Subject } from "../types/subject";

export async function fetchSubjects(): Promise<Subject[]> {
  const res = await api.get<Subject[]>("/api/subjects/");
  return res.data;
}
