import api from "./client";

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

export type StudentTestRecord = {
  id: number;
  student: number;
  test: number;
  test_title?: string;
  test_total_score?: number | string;
  lesson_topic?: string;
  subject_name?: string;
  group_name?: string;
  started_at?: string;
  finished_at?: string;
  current_question_index?: number;
  score_percent?: number;
  is_finished?: boolean;
};

export async function fetchStudentTestRecords(): Promise<StudentTestRecord[]> {
  const res = await api.get<StudentTestRecord[]>("/api/student-tests/records/");
  return res.data;
}

export async function updateStudentTestRecord(
  id: number,
  payload: { score_percent?: number }
) {
  const res = await api.patch(`/api/student-tests/records/${id}/`, payload);
  return res.data;
}
