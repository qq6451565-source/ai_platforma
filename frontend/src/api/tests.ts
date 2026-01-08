import api from "./client";
import type { TestItem, QuestionInput } from "../types/test";

export async function fetchTests(): Promise<TestItem[]> {
  const res = await api.get<TestItem[]>("/api/tests/");
  return res.data;
}

export async function createTest(payload: {
  title: string;
  description?: string;
  subject?: number;
  group?: number;
  teacher?: number;
  time_limit_minutes?: number;
  pass_score?: number;
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

export async function updateTest(
  id: number,
  payload: {
    title?: string;
    description?: string;
    subject?: number;
    group?: number;
    teacher?: number;
    time_limit_minutes?: number;
    pass_score?: number;
    is_active?: boolean;
  }
) {
  const res = await api.patch(`/api/tests/${id}/`, payload);
  return res.data;
}
