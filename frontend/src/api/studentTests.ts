import api from "./client";
import { TestItem } from "../types/test";

export type StartTestResponse = {
  student_test_id: number;
  question?: {
    id: number;
    text: string;
    order: number;
    points: number;
    options: { id: number; text: string }[];
  };
  score_percent?: number;
  detail?: string;
};

export async function startTest(test_id: number): Promise<StartTestResponse> {
  const res = await api.post("/api/student-tests/start/", { test_id });
  return res.data;
}

export async function answerTest(payload: {
  student_test_id: number;
  question_id: number;
  option_id: number;
}): Promise<StartTestResponse> {
  const res = await api.post(
    `/api/student-tests/${payload.student_test_id}/answer/`,
    { question_id: payload.question_id, option_id: payload.option_id }
  );
  return res.data;
}

export async function finishTest(student_test_id: number) {
  const res = await api.post(`/api/student-tests/${student_test_id}/finish/`);
  return res.data;
}
