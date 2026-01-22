import api from "./client";
import type { GradebookEntry } from "../types/gradebook";

export async function fetchGradebook(): Promise<GradebookEntry[]> {
  const res = await api.get<GradebookEntry[]>("/api/gradebook/entries/");
  return res.data;
}

export type GradebookUpdatePayload = Partial<
  Pick<GradebookEntry, "assignment_score" | "midterm_score" | "total_score">
>;

export async function updateGradebookEntry(
  id: number,
  payload: GradebookUpdatePayload
): Promise<GradebookEntry> {
  const res = await api.patch<GradebookEntry>(`/api/gradebook/entries/${id}/`, payload);
  return res.data;
}

export type GradebookCreatePayload = {
  student: number;
  subject: number;
  assignment_score?: number;
  midterm_score?: number;
};

export async function createGradebookEntry(
  payload: GradebookCreatePayload
): Promise<GradebookEntry> {
  const res = await api.post<GradebookEntry>("/api/gradebook/entries/", payload);
  return res.data;
}

export async function recalcGradebookEntry(
  id: number
): Promise<{ entry_id: number; total_score: number }> {
  const res = await api.post<{ entry_id: number; total_score: number }>(
    `/api/gradebook/recalculate/${id}/`
  );
  return res.data;
}
