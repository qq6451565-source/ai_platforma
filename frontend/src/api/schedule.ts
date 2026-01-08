import api from "./client";
import type { LessonSlot, Timetable } from "../types/schedule";

export async function fetchLessonSlots(): Promise<LessonSlot[]> {
  const res = await api.get<LessonSlot[]>("/api/schedule/lesson-slots/");
  return res.data;
}

export async function fetchTimetables(): Promise<Timetable[]> {
  const res = await api.get<Timetable[]>("/api/schedule/timetables/");
  return res.data;
}
