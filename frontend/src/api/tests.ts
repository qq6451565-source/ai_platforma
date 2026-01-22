import api from "./client";
import type { TestItem, QuestionInput, TestDetail } from "../types/test";

export async function fetchTests(): Promise<TestItem[]> {
  const res = await api.get<TestItem[]>("/api/tests/");
  return res.data;
}

export async function createTest(payload: {
  title: string;
  description?: string;
  lesson?: number;
  subject?: number;
  group?: number;
  teacher?: number;
  time_limit_minutes?: number;
  total_score?: number;
  is_active?: boolean;
  questions?: QuestionInput[];
}) {
  const res = await api.post("/api/tests/", payload);
  return res.data;
}

export async function deleteTest(id: number) {
  const res = await api.delete(`/api/tests/${id}/`);
  return res.data;
}

export async function fetchTest(id: number): Promise<TestDetail> {
  const res = await api.get<TestDetail>(`/api/tests/${id}/`);
  return res.data;
}

export async function uploadTest(payload: {
  title?: string;
  lesson: number;
  file: File;
  time_limit_minutes?: number;
  total_score?: number;
  is_active?: boolean;
}) {
  const form = new FormData();
  form.append("lesson", String(payload.lesson));
  if (payload.title) form.append("title", payload.title);
  if (payload.time_limit_minutes != null) {
    form.append("time_limit_minutes", String(payload.time_limit_minutes));
  }
  if (payload.total_score != null) {
    form.append("total_score", String(payload.total_score));
  }
  if (payload.is_active != null) {
    form.append("is_active", payload.is_active ? "true" : "false");
  }
  form.append("file", payload.file);
  const res = await api.post("/api/tests/upload/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function updateTest(
  id: number,
  payload: {
    title?: string;
    description?: string;
    lesson?: number | null;
    subject?: number;
    group?: number;
    teacher?: number;
    time_limit_minutes?: number;
    total_score?: number;
    is_active?: boolean;
  }
) {
  const res = await api.patch(`/api/tests/${id}/`, payload);
  return res.data;
}
