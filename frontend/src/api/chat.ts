import api from "./client";
import type { GroupMessage } from "../types/chat";

export async function fetchChatHistory(groupId: number): Promise<GroupMessage[]> {
  const res = await api.get<GroupMessage[]>(`/api/chat/chat/history/${groupId}/`);
  return res.data;
}

export async function sendChatMessage(payload: { group: number; text: string; file?: File }) {
  const form = new FormData();
  form.append("group", String(payload.group));
  form.append("text", payload.text);
  if (payload.file) form.append("file", payload.file);
  const res = await api.post("/api/chat/chat/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as GroupMessage;
}
