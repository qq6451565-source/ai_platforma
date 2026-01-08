import api from "./client";
import type { GradebookEntry } from "../types/gradebook";

export async function fetchGradebook(): Promise<GradebookEntry[]> {
  const res = await api.get<GradebookEntry[]>("/api/gradebook/entries/");
  return res.data;
}
