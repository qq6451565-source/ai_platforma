import api from "./client";

export type JoinLiveResponse = {
  room_id?: number;
  room: string;
  token: string;
  livekit_url: string;
  ws_url?: string;
  jitsi_url?: string;
};

export async function joinLiveLesson(lessonId: number): Promise<JoinLiveResponse> {
  const res = await api.get<JoinLiveResponse>(`/api/live/join/${lessonId}/`);
  return res.data;
}

export async function createLiveRoom(lessonId: number): Promise<JoinLiveResponse> {
  const res = await api.post<JoinLiveResponse>("/api/live/room/create/", { lesson_id: lessonId });
  return res.data;
}

export async function leaveLiveRoom(roomId: number) {
  const res = await api.post("/api/live/room/leave/", { room_id: roomId });
  return res.data;
}

export async function endLiveRoom(roomId: number) {
  const res = await api.post("/api/live/room/end/", { room_id: roomId });
  return res.data;
}
