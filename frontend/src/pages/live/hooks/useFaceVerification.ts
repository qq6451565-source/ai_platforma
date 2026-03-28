import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAccessToken } from "../../../utils/token";
import type { StudentStatus } from "../utils/studentSorting";

export type FaceDetectionStatus = "DETECTED" | "NOT_DETECTED" | "MULTIPLE" | "CHECKING";

export interface StudentStatusUpdate {
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
  eligibility_status?: "eligible" | "risk" | "blocked";
  eligibility_reason?: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────

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
  eligibility_status?: "eligible" | "risk" | "blocked";
  eligibility_reason?: string;
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
const MAX_RECONNECT_ATTEMPTS = 5; // 5 marta urinib ko'radi, keyin to'xtaydi
const WS_CONNECT_TIMEOUT_MS = 10_000; // 10s — agar WS ochilmasa, xato

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

export function applyUpdatesToMap(
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
      eligibilityStatus:
        update.eligibility_status !== undefined
          ? update.eligibility_status
          : existing?.eligibilityStatus ?? null,
      eligibilityReason:
        update.eligibility_reason !== undefined
          ? update.eligibility_reason
          : existing?.eligibilityReason ?? null,
    });
  });
  return next;
}

// ─── useFaceVerification ──────────────────────────────────────────────────────
// Used by BOTH students AND teachers.
// • Connects to /ws/face-verify/{room}/
// • Sends webcam frames via verifyFrame()
// • Returns localFaceStatus — green/red border on the caller's own video tile

const FACE_VERIFY_TIMEOUT_MS = 20_000; // 20s — agar shu vaqtda natija kelmasa NOT_DETECTED

export const useFaceVerification = (roomName: string, enabled: boolean = true) => {
  const [studentStatuses, setStudentStatuses] = useState<Map<number, StudentStatus>>(new Map());
  const [connected, setConnected] = useState(false);
  const [wsUnavailable, setWsUnavailable] = useState(false); // WS umuman ishlamaydi

  // Own face detection status for local video border
  const [localFaceStatus, setLocalFaceStatus] = useState<FaceDetectionStatus>("CHECKING");

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const connectTimeoutRef = useRef<number | null>(null);
  const lastResultAtRef = useRef<number>(0);
  const verifyTimeoutRef = useRef<number | null>(null);
  const frameSentCountRef = useRef<number>(0);
  const reconnectAttemptsRef = useRef<number>(0);
  const aiErrorCountRef = useRef<number>(0); // Ketma-ket AI xatolar soni

  const connect = useCallback(() => {
    if (!enabled || !roomName) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
    // Reconnect limiti
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.warn("[FaceVerify] max reconnect attempts reached — WS unavailable");
      setWsUnavailable(true);
      setLocalFaceStatus("NOT_DETECTED");
      return;
    }

    const ws = new WebSocket(buildWebSocketUrl(`/ws/face-verify/${roomName}/`));
    wsRef.current = ws;

    // Connection timeout — agar WS 10s ichida ochilmasa, yopamiz
    connectTimeoutRef.current = window.setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        console.warn("[FaceVerify] WS connect timeout");
        ws.close();
      }
    }, WS_CONNECT_TIMEOUT_MS);

    ws.onopen = () => {
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
      setConnected(true);
      setWsUnavailable(false);
      frameSentCountRef.current = 0;
      lastResultAtRef.current = Date.now();
      reconnectAttemptsRef.current = 0; // Muvaffaqiyatli ulanish — counter reset
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Session started — server accepted us
        if (data.type === "session_started") {
          return;
        }

        // Error from server (e.g. AI Gateway unreachable)
        if (data.type === "error") {
          console.warn("[FaceVerify] server error:", data.message);
          setLocalFaceStatus("NOT_DETECTED");
          return;
        }

        // Pong — ignore
        if (data.type === "pong") return;

        // Verification result — the main response
        if (data.type === "verification_result") {
          lastResultAtRef.current = Date.now();

          // AI Gateway xatosi — ketma-ket 3 ta bo'lsa, "unavailable" deb belgilaymiz
          if (data.event_type === "ai_error") {
            aiErrorCountRef.current += 1;
            if (aiErrorCountRef.current >= 3) {
              console.warn("[FaceVerify] 3 consecutive AI errors — marking unavailable");
              setWsUnavailable(true);
              setLocalFaceStatus("NOT_DETECTED");
              return;
            }
          } else {
            aiErrorCountRef.current = 0; // Muvaffaqiyatli natija — reset
          }

          const next: FaceDetectionStatus =
            data.face_detection_status ??
            (data.verified ? "DETECTED" : "NOT_DETECTED");
          setLocalFaceStatus(next);
          return;
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = () => {
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
      setConnected(false);
    };

    ws.onclose = () => {
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
      setConnected(false);
      wsRef.current = null;
      if (!enabled || !roomName) return;
      reconnectAttemptsRef.current += 1;
      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        console.warn("[FaceVerify] max reconnect attempts — stopping");
        setWsUnavailable(true);
        setLocalFaceStatus("NOT_DETECTED");
        return;
      }
      const delay = RECONNECT_DELAY_MS * Math.min(reconnectAttemptsRef.current, 4);
      reconnectTimerRef.current = window.setTimeout(connect, delay);
    };
  }, [enabled, roomName]);

  // Timeout: agar uzoq vaqt CHECKING da qolsa, NOT_DETECTED ga tushirish
  useEffect(() => {
    if (!enabled) return;

    const check = () => {
      const elapsed = Date.now() - lastResultAtRef.current;
      if (
        frameSentCountRef.current >= 2 &&
        elapsed > FACE_VERIFY_TIMEOUT_MS &&
        localFaceStatus === "CHECKING"
      ) {
        setLocalFaceStatus("NOT_DETECTED");
      }
    };

    verifyTimeoutRef.current = window.setInterval(check, 5000);
    return () => {
      if (verifyTimeoutRef.current) clearInterval(verifyTimeoutRef.current);
    };
  }, [enabled, localFaceStatus]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
      if (verifyTimeoutRef.current) clearInterval(verifyTimeoutRef.current);
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
      frameSentCountRef.current += 1;
    } catch {
      // ignore send errors — reconnect will handle it
    }
  }, []);

  return { studentStatuses, setStudentStatuses, connected, wsUnavailable, verifyFrame, localFaceStatus };
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

    ws.onopen = () => {
      setConnected(true);
      try {
        ws.send(JSON.stringify({ type: "request_update", timestamp: new Date().toISOString() }));
      } catch {
        // ignore send errors; periodic requestUpdate will retry
      }
    };

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
            eligibility_status: msg.eligibility_status,
            eligibility_reason: msg.eligibility_reason,
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
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
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
    try {
      wsRef.current.send(JSON.stringify({ type: "request_update", timestamp: new Date().toISOString() }));
    } catch {
      // ignore send failures
    }
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
