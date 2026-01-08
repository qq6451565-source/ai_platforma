import api from "./client";
import type { Announcement } from "../types/announcement";

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const res = await api.get<Announcement[]>("/api/announcements/");
  return res.data;
}

export async function createAnnouncement(payload: {
  title: string;
  message: string;
  subject?: number | null;
  group?: number | null;
}) {
  const res = await api.post<Announcement>("/api/announcements/", payload);
  return res.data;
}
