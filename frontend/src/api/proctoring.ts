import api from "./client";

export type ProctorStartResponse = {
  session_id: number;
  verified: boolean;
  confidence: number;
};

export type ProctorVerifyResponse = {
  session_id: number;
  verified: boolean;
  confidence: number;
  blocked?: boolean;
  blocked_reason?: string;
};

export type ProctorPresenceResponse = {
  present: boolean;
  confidence: number;
  event_id?: number | null;
  event_type?: string | null;
  blocked?: boolean;
  blocked_reason?: string;
};

export async function startTestProctoring(studentTestId: number): Promise<ProctorStartResponse> {
  const res = await api.post<ProctorStartResponse>(`/api/proctoring/sessions/start-test/${studentTestId}/`);
  return res.data;
}

export async function finishProctoring(sessionId: number, payload?: { verified?: boolean; confidence?: number }) {
  const res = await api.post(`/api/proctoring/sessions/finish/${sessionId}/`, payload || {});
  return res.data;
}

export async function verifyProctoring(sessionId: number, frame: Blob): Promise<ProctorVerifyResponse> {
  const form = new FormData();
  form.append("frame", frame, "frame.jpg");
  const res = await api.post<ProctorVerifyResponse>(`/api/proctoring/sessions/verify/${sessionId}/`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function presenceProctoring(sessionId: number, frame: Blob): Promise<ProctorPresenceResponse> {
  const form = new FormData();
  form.append("frame", frame, "frame.jpg");
  const res = await api.post<ProctorPresenceResponse>(`/api/proctoring/sessions/presence/${sessionId}/`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}
