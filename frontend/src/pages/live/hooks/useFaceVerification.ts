/**
 * Hook for face verification real-time status updates
 */

import { useEffect, useState, useCallback, useRef } from "react";
import type { StudentStatus } from "../utils/studentSorting";

interface VerificationResult {
  type: "verification_result";
  verified: boolean;
  confidence: number;
  faces_detected: number;
  face_detection_status: "DETECTED" | "NOT_DETECTED" | "MULTIPLE" | "CHECKING";
  event_type: string;
  message: string;
  alert: boolean;
}

export const useFaceVerification = (roomName: string, enabled: boolean = true) => {
  const [studentStatuses, setStudentStatuses] = useState<
    Map<number, StudentStatus>
  >(new Map());
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Connect to face verification WebSocket
  useEffect(() => {
    if (!enabled || !roomName) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/face-verify/${roomName}/`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
        console.log("✅ Face verification WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as VerificationResult;

          if (data.type === "verification_result") {
            // Update status (will be set by monitoring WS)
            // This is just local confirmation
          }
        } catch (err) {
          console.error("Failed to parse verification message:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ Face verification WebSocket error:", error);
        setConnected(false);
      };

      ws.onclose = () => {
        setConnected(false);
        console.log("🔌 Face verification WebSocket disconnected");
      };

      wsRef.current = ws;

      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    } catch (err) {
      console.error("Failed to connect to face verification WS:", err);
    }
  }, [roomName, enabled]);

  // Send frame for verification
  const verifyFrame = useCallback((frameData: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected");
      return;
    }

    try {
      wsRef.current.send(
        JSON.stringify({
          type: "verify_frame",
          frame_data: frameData,
          timestamp: new Date().toISOString(),
        })
      );
    } catch (err) {
      console.error("Failed to send frame:", err);
    }
  }, []);

  return {
    studentStatuses,
    setStudentStatuses,
    connected,
    verifyFrame,
  };
};

/**
 * Hook for real-time student monitoring (teacher/admin)
 */
interface StudentStatusUpdate {
  student_id: number;
  student_name: string;
  face_detection_status: "DETECTED" | "NOT_DETECTED" | "MULTIPLE" | "CHECKING";
  confidence: number;
  hand_raised: boolean;
  audio_enabled: boolean;
  last_verified_at?: string;
  success_rate?: number;
}

interface MonitoringUpdate {
  type: "student_status_update";
  room_id: number;
  room_name: string;
  total_students: number;
  verified_count: number;
  updates: StudentStatusUpdate[];
  timestamp: string;
}

export const useStudentMonitoring = (roomName: string, isTeacher: boolean = false) => {
  const [studentStatuses, setStudentStatuses] = useState<
    Map<number, StudentStatus>
  >(new Map());
  const [monitoringData, setMonitoringData] = useState<MonitoringUpdate | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Connect to monitoring WebSocket (teacher only)
  useEffect(() => {
    if (!isTeacher || !roomName) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/live-monitoring/${roomName}/`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
        console.log("✅ Monitoring WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as MonitoringUpdate;

          if (data.type === "student_status_update") {
            setMonitoringData(data);

            // Update student statuses map
            const newStatuses = new Map(studentStatuses);
            data.updates.forEach((update) => {
              newStatuses.set(update.student_id, {
                faceStatus: update.face_detection_status,
                confidence: update.confidence,
                handRaised: update.hand_raised,
                audioEnabled: update.audio_enabled,
                timestamp: Date.now(),
              });
            });
            setStudentStatuses(newStatuses);
          }
        } catch (err) {
          console.error("Failed to parse monitoring message:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ Monitoring WebSocket error:", error);
        setConnected(false);
      };

      ws.onclose = () => {
        setConnected(false);
        console.log("🔌 Monitoring WebSocket disconnected");
      };

      wsRef.current = ws;

      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    } catch (err) {
      console.error("Failed to connect to monitoring WS:", err);
    }
  }, [roomName, isTeacher]);

  // Request update
  const requestUpdate = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      wsRef.current.send(
        JSON.stringify({
          type: "request_update",
          timestamp: new Date().toISOString(),
        })
      );
    } catch (err) {
      console.error("Failed to request update:", err);
    }
  }, []);

  // Keep-alive ping
  useEffect(() => {
    if (!connected || !wsRef.current) return;

    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: "ping" }));
        } catch (err) {
          console.error("Failed to send ping:", err);
        }
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(pingInterval);
  }, [connected]);

  return {
    studentStatuses,
    monitoringData,
    connected,
    requestUpdate,
  };
};
