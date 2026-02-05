/**
 * API client for face verification endpoints
 */
import client from './client';

export interface FaceVerificationSettings {
  id: number;
  verification_enabled: boolean;
  verification_interval: number;
  confidence_threshold: number;
  max_faces_allowed: number;
  auto_attendance: boolean;
  alert_on_multiple_faces: boolean;
  alert_on_no_face: boolean;
  alert_on_verification_fail: boolean;
  created_at: string;
  updated_at: string;
}

export interface FaceSession {
  id: number;
  participant: number;
  room: number;
  user: number;
  user_username: string;
  user_full_name: string;
  status: 'active' | 'verified' | 'failed' | 'ended';
  last_verification_at: string | null;
  verification_count: number;
  success_count: number;
  fail_count: number;
  success_rate: number;
  started_at: string;
  ended_at: string | null;
}

export interface FaceEvent {
  id: number;
  session: number;
  room: number;
  user: number;
  user_username: string;
  user_full_name: string;
  event_type: string;
  faces_detected: number;
  confidence: number | null;
  is_verified: boolean;
  alert_sent: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

export interface MonitoringData {
  room_name: string;
  room_id: number;
  lesson_topic: string;
  is_active: boolean;
  total_participants: number;
  verified_participants: number;
  sessions: FaceSession[];
  recent_alerts: FaceEvent[];
}

/**
 * Get face verification settings
 */
export const getFaceSettings = async (): Promise<FaceVerificationSettings> => {
  const response = await client.get('/api/live/face/settings/');
  return response.data;
};

/**
 * Update face verification settings (admin only)
 */
export const updateFaceSettings = async (
  settings: Partial<FaceVerificationSettings>
): Promise<FaceVerificationSettings> => {
  const response = await client.patch('/api/live/face/settings/', settings);
  return response.data;
};

/**
 * Start face verification session
 */
export const startFaceSession = async (
  roomName: string
): Promise<{ session: FaceSession; created: boolean }> => {
  const response = await client.post('/api/live/face/start/', {
    room_name: roomName,
  });
  return response.data;
};

/**
 * Analyze a single frame (for testing)
 */
export const analyzeFrame = async (frameData: string): Promise<any> => {
  const response = await client.post('/api/live/face/analyze/', {
    frame_data: frameData,
  });
  return response.data;
};

/**
 * Get live monitoring data for a room
 */
export const getLiveMonitoring = async (
  roomName: string
): Promise<MonitoringData> => {
  const response = await client.get('/api/live/face/monitoring/', {
    params: { room_name: roomName },
  });
  return response.data;
};

/**
 * Get face sessions for a room
 */
export const getFaceSessions = async (
  roomName: string
): Promise<FaceSession[]> => {
  const response = await client.get('/api/live/face/sessions/', {
    params: { room_name: roomName },
  });
  return response.data;
};

/**
 * Get face events for a session or room
 */
export const getFaceEvents = async (params: {
  session_id?: number;
  room_name?: string;
}): Promise<FaceEvent[]> => {
  const response = await client.get('/api/live/face/events/', { params });
  return response.data;
};
