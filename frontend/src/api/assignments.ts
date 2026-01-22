import api from "./client";
import type { Assignment } from "../types/assignment";

export async function fetchAssignments(): Promise<Assignment[]> {
  const res = await api.get<Assignment[]>("/api/assignments/assignments/");
  return res.data;
}

export async function createAssignment(payload: {
  lesson: number;
  title: string;
  description?: string;
  file?: File;
}) {
  const form = new FormData();
  form.append("lesson", String(payload.lesson));
  form.append("title", payload.title);
  if (payload.description) form.append("description", payload.description);
  if (payload.file) form.append("file", payload.file);
  const res = await api.post("/api/assignments/assignments/", form);
  return res.data;
}

export async function deleteAssignment(id: number) {
  const res = await api.delete(`/api/assignments/assignments/${id}/`);
  return res.data;
}

export async function updateAssignment(
  id: number,
  payload: {
    lesson?: number | null;
    title?: string;
    description?: string;
    file?: File | null;
  }
) {
  const form = new FormData();
  if (payload.lesson !== undefined) {
    if (payload.lesson === null) form.append("lesson", "");
    else form.append("lesson", String(payload.lesson));
  }
  if (payload.title !== undefined) form.append("title", payload.title);
  if (payload.description !== undefined) form.append("description", payload.description);
  if (payload.file !== undefined) {
    if (payload.file === null) form.append("file", "");
    else form.append("file", payload.file);
  }
  const res = await api.patch(`/api/assignments/assignments/${id}/`, form);
  return res.data;
}
