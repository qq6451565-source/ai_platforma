import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAccessToken } from "../../../utils/token";
import type { StudentStatus } from "../utils/studentSorting";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FaceDetectionStatus = "DETECTED" | "NOT_DETECTED" | "MULTIPLE" | "CHECKING";

interface VerificationResult {
  type: "verification_result";
  verified: boolean;
  confidence?: number;
  faces_detected?: number;
  face_detection_status?: FaceDetectionStatus;
  event_type?: string;
  message?: string;
  alert?: boolean;
}

interface StudentStatusUpdate {
  student_id: number;
  student_name?: string;
  face_detection_status?: FaceDetectionStatus;
  confidence?: number;
  hand_raised?: boolean;
  audio_enabled?: boolean;
  event_type?: string;
  status_reason?: string;
  last_verified_at?: string;
  success_rate?: number;
  attendance_status?: "present" | "absent";
  attendance_ratio?: number;
  attendance_samples?: number;
  joined_seconds?: number;
  joined_ratio?: number;
}

interface MonitoringUpdateMessage {
  type: "student_status_update";
  room_id?: number;
  room_name?: string;
  total_students?: number;
  verified_count?: number;
  updates?: StudentStatusUpdate[];
}

interface SingleStudentUpdateMessage {
  type: "student_status_update";
  student_id: number;
  face_detection_status?: FaceDetectionStatus;
  confidence?: number;
  hand_raised?: boolean;
  audio_enabled?: boolean;
  event_type?: string;
  status_reason?: string;
  last_verified_at?: string;
  success_rate?: number;
  attendance_status?: "present" | "absent";
  attendance_ratio?: number;
  attendance_samples?: number;
  joined_seconds?: number;
  joined_ratio?: number;
}

export interface MonitoringRoomParticipant {
  user_id: number;
  user_name: string;
  role: string;
  is_teacher: boolean;
  hand_raised: boolean;
}

export interface MonitoringRoomState {
  room_id: number;
  room_name: string;
  stage_user_id: number | null;
  resolved_stage_user_id: number | null;
  participants: MonitoringRoomParticipant[];
  timestamp: string;
}

interface RoomStateUpdateMessage extends MonitoringRoomState {
  type: "room_state_update";
}

interface MonitoringStartedMessage {
  type: "monitoring_started";
  data?: { updates?: StudentStatusUpdate[] };
  room_state?: RoomStateUpdateMessage;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RECONNECT_DELAY_MS = 2500;

function buildWebSocketUrl(path: string): string {
  const apiBase =
    import.meta.env.VITE_API_BASE ||
    import.meta.env.VITE_API_BASE_URL ||
    window.location.origin;

  const normalizedBase = String(apiBase).replace(/\/+$/, "");
  const baseUrl = new URL(normalizedBase);
  const protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
  const token = getAccessToken();
  const wsUrl = new URL(`${protocol}//${baseUrl.host}${path}`);
  if (token) wsUrl.searchParams.set("token", token);
  return wsUrl.toString();
}

function applyUpdatesToMap(
  previous: Map<number, StudentStatus>,
  updates: StudentStatusUpdate[]
): Map<number, StudentStatus> {
  const next = new Map(previous);
  updates.forEach((update) => {
    const existing = next.get(update.student_id);
    next.set(update.student_id, {
      faceStatus: update.face_detection_status ?? existing?.faceStatus ?? "CHECKING",
      confidence:
        update.confidence !== undefined ? Number(update.confidence) : existing?.confidence ?? 0,
      handRaised:
        update.hand_raised !== undefined
          ? Boolean(update.hand_raised)
          : existing?.handRaised ?? false,
      audioEnabled:
        update.audio_enabled !== undefined
          ? Boolean(update.audio_enabled)
          : existing?.audioEnabled ?? false,
      timestamp: Date.now(),
      statusReason: update.status_reason ?? existing?.statusReason,
      lastVerifiedAt: update.last_verified_at ?? existing?.lastVerifiedAt ?? null,
      successRate:
        update.success_rate !== undefined
          ? Number(update.success_rate)
          : existing?.successRate ?? null,
      attendanceStatus:
        update.attendance_status !== undefined
          ? update.attendance_status
          : existing?.attendanceStatus ?? null,
      attendanceRatio:
        update.attendance_ratio !== undefined
          ? Number(update.attendance_ratio)
          : existing?.attendanceRatio ?? null,
      attendanceSamples:
        update.attendance_samples !== undefined
          ? Number(update.attendance_samples)
          : existing?.attendanceSamples ?? null,
      joinedSeconds:
        update.joined_seconds !== undefined
          ? Number(update.joined_seconds)
          : existing?.joinedSeconds ?? null,
      joinedRatio:
        update.joined_ratio !== undefined
          ? Number(update.joined_ratio)
          : existing?.joinedRatio ?? null,
    });
  });
  return next;
}

// ─── useFaceVerification ──────────────────────────────────────────────────────
// Used by BOTH students AND teachers.
// • Connects to /ws/face-verify/{room}/
// • Sends webcam frames via verifyFrame()
// • Returns localFaceStatus — green/red border on the caller's own video tile

export const useFaceVerification = (roomName: string, enabled: boolean = true) => {
  const [studentStatuses, setStudentStatuses] = useState<Map<number, StudentStatus>>(new Map());
  const [connected, setConnected] = useState(false);

  // Own face detection status for local video border (teacher + student)
  const [localFaceStatus, setLocalFaceStatus] = useState<FaceDetectionStatus>("CHECKING");

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (!enabled || !roomName) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(buildWebSocketUrl(`/ws/face-verify/${roomName}/`));
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as VerificationResult;
        if (data.type !== "verification_result") return;

        // Derive status from server response and update local border
        const next: FaceDetectionStatus =
          data.face_detection_status ??
          (data.verified ? "DETECTED" : "NOT_DETECTED");
        setLocalFaceStatus(next);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = () => setConnected(false);

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      if (!enabled || !roomName) return;
      reconnectTimerRef.current = window.setTimeout(connect, RECONNECT_DELAY_MS);
    };
  }, [enabled, roomName]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const verifyFrame = useCallback((frameData: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    try {
      wsRef.current.send(
        JSON.stringify({
          type: "verify_frame",
          frame_data: frameData,
          timestamp: new Date().toISOString(),
        })
      );
    } catch {
      // ignore send errors — reconnect will handle it
    }
  }, []);

  return { studentStatuses, setStudentStatuses, connected, verifyFrame, localFaceStatus };
};

// ─── useStudentMonitoring ─────────────────────────────────────────────────────
// Teacher-side: receives real-time status updates for ALL room participants
// via /ws/live-monitoring/{room}/

export const useStudentMonitoring = (roomName: string, enabled: boolean = false) => {
  const [studentStatuses, setStudentStatuses] = useState<Map<number, StudentStatus>>(new Map());
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<MonitoringRoomState | null>(null);
  const [lastStatusEventAt, setLastStatusEventAt] = useState<string | null>(null);
  const [lastStatusReason, setLastStatusReason] = useState<string | null>(null);
  const [lastRoomStateEventAt, setLastRoomStateEventAt] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const applyIncomingUpdate = useCallback((updates: StudentStatusUpdate[]) => {
    setStudentStatuses((prev) => applyUpdatesToMap(prev, updates));
    setLastStatusEventAt(new Date().toISOString());
    for (let i = updates.length - 1; i >= 0; i -= 1) {
      const reason = updates[i].status_reason || updates[i].event_type;
      if (reason) {
        setLastStatusReason(reason);
        break;
      }
    }
  }, []);

  const applyRoomState = useCallback((payload: MonitoringRoomState) => {
    setRoomState(payload);
    setLastRoomStateEventAt(payload.timestamp || new Date().toISOString());
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !roomName) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(buildWebSocketUrl(`/ws/live-monitoring/${roomName}/`));
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data) as
          | MonitoringUpdateMessage
          | SingleStudentUpdateMessage
          | MonitoringStartedMessage
          | RoomStateUpdateMessage;

        if (raw.type === "monitoring_started") {
          const msg = raw as MonitoringStartedMessage;
          const updates = msg.data?.updates ?? [];
          if (updates.length) applyIncomingUpdate(updates);
          if (msg.room_state) applyRoomState(msg.room_state);
          return;
        }

        if (raw.type === "room_state_update") {
          applyRoomState(raw as MonitoringRoomState);
          return;
        }

        if (raw.type !== "student_status_update") return;

        if ("updates" in raw && Array.isArray((raw as MonitoringUpdateMessage).updates)) {
          applyIncomingUpdate((raw as MonitoringUpdateMessage).updates!);
          return;
        }

        if ("student_id" in raw) {
          const msg = raw as SingleStudentUpdateMessage;
          applyIncomingUpdate([{
            student_id: msg.student_id,
            face_detection_status: msg.face_detection_status ?? "CHECKING",
            confidence: msg.confidence ?? 0,
            hand_raised: msg.hand_raised ?? false,
            audio_enabled: msg.audio_enabled ?? false,
            event_type: msg.event_type,
            status_reason: msg.status_reason,
            last_verified_at: msg.last_verified_at,
            success_rate: msg.success_rate,
            attendance_status: msg.attendance_status,
            attendance_ratio: msg.attendance_ratio,
            attendance_samples: msg.attendance_samples,
            joined_seconds: msg.joined_seconds,
            joined_ratio: msg.joined_ratio,
          }]);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => setConnected(false);

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      if (!enabled || !roomName) return;
      reconnectTimerRef.current = window.setTimeout(connect, RECONNECT_DELAY_MS);
    };
  }, [applyIncomingUpdate, applyRoomState, enabled, roomName]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const requestUpdate = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "request_update", timestamp: new Date().toISOString() }));
  }, []);

  useEffect(() => {
    if (!connected || !enabled) return;
    const interval = window.setInterval(requestUpdate, 8000);
    return () => clearInterval(interval);
  }, [connected, enabled, requestUpdate]);

  useEffect(() => {
    if (!connected || !enabled) return;
    const ping = window.setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
    return () => clearInterval(ping);
  }, [connected, enabled]);

  const monitoringData = useMemo(
    () => ({
      total_students: studentStatuses.size,
      updates: Array.from(studentStatuses.entries()).map(([studentId, s]) => ({
        student_id: studentId,
        face_detection_status: s.faceStatus,
        confidence: s.confidence,
        hand_raised: s.handRaised,
        audio_enabled: s.audioEnabled,
      })),
    }),
    [studentStatuses]
  );

  return {
    studentStatuses,
    monitoringData,
    connected,
    requestUpdate,
    roomState,
    lastStatusEventAt,
    lastStatusReason,
    lastRoomStateEventAt,
  };
};
