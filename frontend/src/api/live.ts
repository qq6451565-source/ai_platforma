import api from "./client";
import { getAccessToken } from "../utils/token";

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
  uid: number | string;
  token: string;
  expires_in: number;
};


export type LiveParticipantState = {
  user_id: number;
  user_name: string;
  role: string;
  is_teacher: boolean;
  hand_raised: boolean;
  group_name?: string;
  group?: string;
  group_code?: string;
  group_title?: string;
};

export type LiveRoomState = {
  room_id: number;
  room: string;
  stage_user_id: number | null;
  resolved_stage_user_id: number | null;
  allow_ptt: boolean;
  participants: LiveParticipantState[];
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

export async function sendLiveHeartbeat(roomId: number) {
  const res = await api.post("/api/live/room/heartbeat/", { room_id: roomId });
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

export async function syncLiveRooms() {
  const res = await api.post("/api/live/sync/");
  return res.data;
}


export async function fetchLiveState(payload: {
  room_id?: number;
  lesson_id?: number;
}): Promise<LiveRoomState> {
  const res = await api.get<LiveRoomState>("/api/live/state/", { params: payload });
  return res.data;
}

export async function raiseHand(roomId: number, raised: boolean) {
  const res = await api.post("/api/live/hand/", { room_id: roomId, raised });
  return res.data;
}

export async function setStageUser(roomId: number, userId?: number | null) {
  const res = await api.post("/api/live/stage/", { room_id: roomId, user_id: userId });
  return res.data;
}

export async function togglePushToTalk(roomId: number, enabled: boolean) {
  const res = await api.post("/api/live/ptt/", { room_id: roomId, enabled });
  return res.data;
}

function buildApiUrl(path: string): string {
  const apiBase =
    import.meta.env.VITE_API_BASE ||
    import.meta.env.VITE_API_BASE_URL ||
    window.location.origin;

  const normalizedBase = String(apiBase).replace(/\/+$/, "");
  const baseUrl = new URL(normalizedBase);
  return new URL(path, `${baseUrl.origin}/`).toString();
}

export function sendLiveLeaveKeepalive(roomId: number): boolean {
  const token = getAccessToken();
  if (!token) return false;

  try {
    void fetch(buildApiUrl("/api/live/room/leave/"), {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ room_id: roomId }),
    });
    return true;
  } catch {
    return false;
  }
}

// Face verification types
export type FaceSessionStatus = 'active' | 'verified' | 'failed' | 'ended';

export type LiveFaceSession = {
  id: number;
  user: number;
  user_username: string;
  user_full_name: string;
  status: FaceSessionStatus;
  last_verification_at: string | null;
  verification_count: number;
  success_count: number;
  fail_count: number;
  success_rate: number;
  started_at: string;
};

export type LiveMonitoringData = {
  room_name: string;
  room_id: number;
  lesson_topic: string;
  is_active: boolean;
  total_participants: number;
  verified_participants: number;
  sessions: LiveFaceSession[];
};

// Face verification API
export async function fetchLiveMonitoring(roomName: string): Promise<LiveMonitoringData> {
  const res = await api.get<LiveMonitoringData>('/api/live/face/monitoring/', {
    params: { room_name: roomName }
  });
  return res.data;
}
