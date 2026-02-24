import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAccessToken } from "../../../utils/token";
import type { StudentStatus } from "../utils/studentSorting";

type FaceDetectionStatus = "DETECTED" | "NOT_DETECTED" | "MULTIPLE" | "CHECKING";

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
  face_detection_status: FaceDetectionStatus;
  confidence?: number;
  hand_raised?: boolean;
  audio_enabled?: boolean;
  last_verified_at?: string;
  success_rate?: number;
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
  face_detection_status: FaceDetectionStatus;
  confidence?: number;
  hand_raised?: boolean;
  audio_enabled?: boolean;
}

interface MonitoringStartedMessage {
  type: "monitoring_started";
  data?: {
    updates?: StudentStatusUpdate[];
  };
}

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
  if (token) {
    wsUrl.searchParams.set("token", token);
  }
  return wsUrl.toString();
}

function applyUpdatesToMap(
  previous: Map<number, StudentStatus>,
  updates: StudentStatusUpdate[]
): Map<number, StudentStatus> {
  const next = new Map(previous);
  updates.forEach((update) => {
    next.set(update.student_id, {
      faceStatus: update.face_detection_status ?? "CHECKING",
      confidence: Number(update.confidence ?? 0),
      handRaised: Boolean(update.hand_raised),
      audioEnabled: Boolean(update.audio_enabled),
      timestamp: Date.now(),
    });
  });
  return next;
}

export const useFaceVerification = (
  roomName: string,
  enabled: boolean = true
) => {
  const [studentStatuses, setStudentStatuses] = useState<Map<number, StudentStatus>>(
    new Map()
  );
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (!enabled || !roomName) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const wsUrl = buildWebSocketUrl(`/ws/face-verify/${roomName}/`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as VerificationResult;
        if (data.type !== "verification_result") return;
        setStudentStatuses((prev) => {
          const next = new Map(prev);
          return next;
        });
      } catch (error) {
        console.error("Face verification message parse error:", error);
      }
    };

    ws.onerror = () => {
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      if (!enabled || !roomName) return;
      reconnectTimerRef.current = window.setTimeout(() => {
        connect();
      }, RECONNECT_DELAY_MS);
    };
  }, [enabled, roomName]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
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
    } catch (error) {
      console.error("Face verification frame send error:", error);
    }
  }, []);

  return {
    studentStatuses,
    setStudentStatuses,
    connected,
    verifyFrame,
  };
};

export const useStudentMonitoring = (
  roomName: string,
  isTeacher: boolean = false
) => {
  const [studentStatuses, setStudentStatuses] = useState<Map<number, StudentStatus>>(
    new Map()
  );
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const applyIncomingUpdate = useCallback((updates: StudentStatusUpdate[]) => {
    setStudentStatuses((previous) => applyUpdatesToMap(previous, updates));
  }, []);

  const connect = useCallback(() => {
    if (!isTeacher || !roomName) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const wsUrl = buildWebSocketUrl(`/ws/live-monitoring/${roomName}/`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data) as
          | MonitoringUpdateMessage
          | SingleStudentUpdateMessage
          | MonitoringStartedMessage;

        if (raw.type === "monitoring_started") {
          const updates = raw.data?.updates ?? [];
          if (updates.length) applyIncomingUpdate(updates);
          return;
        }

        if (raw.type !== "student_status_update") return;

        if ("updates" in raw && Array.isArray(raw.updates)) {
          applyIncomingUpdate(raw.updates);
          return;
        }

        if ("student_id" in raw) {
          applyIncomingUpdate([
            {
              student_id: raw.student_id,
              face_detection_status: raw.face_detection_status ?? "CHECKING",
              confidence: raw.confidence ?? 0,
              hand_raised: raw.hand_raised ?? false,
              audio_enabled: raw.audio_enabled ?? false,
            },
          ]);
        }
      } catch (error) {
        console.error("Monitoring message parse error:", error);
      }
    };

    ws.onerror = () => {
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      if (!isTeacher || !roomName) return;
      reconnectTimerRef.current = window.setTimeout(() => {
        connect();
      }, RECONNECT_DELAY_MS);
    };
  }, [applyIncomingUpdate, isTeacher, roomName]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const requestUpdate = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: "request_update",
        timestamp: new Date().toISOString(),
      })
    );
  }, []);

  useEffect(() => {
    if (!connected) return;
    const interval = window.setInterval(() => {
      requestUpdate();
    }, 3000);
    return () => clearInterval(interval);
  }, [connected, requestUpdate]);

  useEffect(() => {
    if (!connected) return;
    const pingInterval = window.setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(JSON.stringify({ type: "ping" }));
    }, 30000);
    return () => clearInterval(pingInterval);
  }, [connected]);

  const monitoringData = useMemo(
    () => ({
      total_students: studentStatuses.size,
      updates: Array.from(studentStatuses.entries()).map(([studentId, status]) => ({
        student_id: studentId,
        face_detection_status: status.faceStatus,
        confidence: status.confidence,
        hand_raised: status.handRaised,
        audio_enabled: status.audioEnabled,
      })),
    }),
    [studentStatuses]
  );

  return {
    studentStatuses,
    monitoringData,
    connected,
    requestUpdate,
  };
};

