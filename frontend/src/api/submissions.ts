import api from "./client";
import type { Submission } from "../types/submission";

export async function fetchMySubmissions(): Promise<Submission[]> {
  const res = await api.get<Submission[]>("/api/assignments/submissions/");
  return res.data;
}

export async function submitAssignment(payload: {
  assignment: number;
  file?: File;
  comment?: string;
}) {
  const form = new FormData();
  form.append("assignment", String(payload.assignment));
  if (payload.comment) form.append("comment", payload.comment);
  if (payload.file) form.append("file", payload.file);
  const res = await api.post("/api/assignments/submit/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function fetchAllSubmissions(): Promise<Submission[]> {
  const res = await api.get<Submission[]>("/api/assignments/submissions/");
  return res.data;
}

export async function gradeSubmission(submissionId: number, payload: { grade?: number; teacher_comment?: string }) {
  const res = await api.post(`/api/assignments/grade/${submissionId}/`, payload);
  return res.data;
}
