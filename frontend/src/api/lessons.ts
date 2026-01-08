import api from "./client";

export type Lesson = {
  id: number;
  teacher_subject: number;
  group: number;
  group_name?: string;
  subject_name?: string;
  topic: string;
  start_time: string;
  end_time: string;
};

export async function fetchLessons(): Promise<Lesson[]> {
  const res = await api.get<Lesson[]>("/api/lessons/");
  return res.data;
}

export async function createLesson(payload: {
  teacher_subject: number;
  group: number;
  topic: string;
  start_time: string;
  end_time: string;
}) {
  const res = await api.post("/api/lessons/", payload);
  return res.data;
}

export async function deleteLesson(id: number) {
  const res = await api.delete(`/api/lessons/${id}/`);
  return res.data;
}

export async function updateLesson(
  id: number,
  payload: {
    teacher_subject?: number;
    group?: number;
    topic?: string;
    start_time?: string;
    end_time?: string;
  }
) {
  const res = await api.patch(`/api/lessons/${id}/`, payload);
  return res.data;
}
