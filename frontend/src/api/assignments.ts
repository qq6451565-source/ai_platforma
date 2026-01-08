import api from "./client";
import type { Assignment } from "../types/assignment";

export async function fetchAssignments(): Promise<Assignment[]> {
  const res = await api.get<Assignment[]>("/api/assignments/assignments/");
  return res.data;
}

export async function createAssignment(payload: {
  teacher_subject: number;
  title: string;
  description?: string;
  file?: File;
  deadline: string;
}) {
  const form = new FormData();
  form.append("teacher_subject", String(payload.teacher_subject));
  form.append("title", payload.title);
  if (payload.description) form.append("description", payload.description);
  form.append("deadline", payload.deadline);
  if (payload.file) form.append("file", payload.file);
  const res = await api.post("/api/assignments/assignments/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function deleteAssignment(id: number) {
  const res = await api.delete(`/api/assignments/assignments/${id}/`);
  return res.data;
}

export async function updateAssignment(
  id: number,
  payload: {
    teacher_subject?: number;
    title?: string;
    description?: string;
    file?: File | null;
    deadline?: string;
  }
) {
  const form = new FormData();
  if (payload.teacher_subject !== undefined) form.append("teacher_subject", String(payload.teacher_subject));
  if (payload.title !== undefined) form.append("title", payload.title);
  if (payload.description !== undefined) form.append("description", payload.description);
  if (payload.deadline !== undefined) form.append("deadline", payload.deadline);
  if (payload.file !== undefined) {
    if (payload.file === null) form.append("file", "");
    else form.append("file", payload.file);
  }
  const res = await api.patch(`/api/assignments/assignments/${id}/`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}
