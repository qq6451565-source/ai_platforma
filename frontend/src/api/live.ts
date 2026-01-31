import api from "./client";

export type JoinLiveResponse = {
  room_id?: number;
  room: string;
  token: string;
  livekit_url: string;
  ws_url?: string;
  jitsi_url?: string;
};

export type AgoraTokenResponse = {
  app_id: string;
  channel: string;
  uid: number;
  token: string;
  expires_in: number;
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

export async function fetchAgoraToken(payload: {
  room_id?: number;
  lesson_id?: number;
}): Promise<AgoraTokenResponse> {
  const res = await api.post<AgoraTokenResponse>("/api/live/agora/token/", payload);
  return res.data;
}
