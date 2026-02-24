import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ILocalVideoTrack,
} from "agora-rtc-sdk-ng";
import { Spin, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import {
  AudioOutlined,
  AudioMutedOutlined,
  VideoCameraOutlined,
  StopOutlined,
  HighlightOutlined,
  LogoutOutlined,
  TeamOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from "@ant-design/icons";

import {
  endLiveRoom,
  fetchAgoraToken,
  fetchLiveState,
  joinLiveLesson,
  leaveLiveRoom,
  raiseHand,
  setStageUser,
  togglePushToTalk,
  fetchLiveMonitoring,
} from "../../api/live";
import type { LiveParticipantState, LiveMonitoringData, LiveFaceSession } from "../../api/live";
import { sendPresence } from "../../api/attendance";
import { fetchLessons } from "../../api/lessons";
import { useMe } from "../../hooks/useMe";
import { Button } from "../../components/ui";

// New imports for real-time monitoring
import SidePanel from "./components/SidePanel";
import StudentGridSection from "./components/StudentGridSection";
import { useFaceVerification, useStudentMonitoring } from "./hooks/useFaceVerification";
import { sortStudents, type StudentStatus } from "./utils/studentSorting";

import "./Room_NEW.css";
import "./styles/SidePanel.css";
import "./styles/StudentTile.css";
import "./styles/StudentGridSection.css";

const appId = import.meta.env.VITE_AGORA_APP_ID as string | undefined;

interface RoomState {
  connected: boolean;
  loading: boolean;
  error: string | null;
  stageUser: string | null;
  participants: LiveParticipantState[];
  cameraOn: boolean;
  micOn: boolean;
  screenShare: boolean;
  handRaised: boolean;
  pushToTalk: boolean;
  showStudentsGrid: boolean;
}

const getInitials = (value: string) => {
  const cleaned = value.trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => (part[0] ? part[0].toUpperCase() : "")).join("");
};

export default function Room() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const me = useMe();

  // State management
  const [state, setState] = useState<RoomState>({
    connected: false,
    loading: true,
    error: null,
    stageUser: null,
    participants: [],
    cameraOn: true,
    micOn: true,
    screenShare: false,
    handRaised: false,
    pushToTalk: false,
    showStudentsGrid: false,
  });

  // Refs
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoRef = useRef<ILocalVideoTrack | null>(null);
  const localAudioRef = useRef<any>(null);
  const stageVideoRef = useRef<HTMLDivElement | null>(null);
  const remoteMap = useRef<Map<string | number, IAgoraRTCRemoteUser>>(new Map());

  // User type detection
  const isTeacher = me?.role === "teacher" || me?.role === "admin";
  const userId = me?.id?.toString() || "unknown";

  // Real-time monitoring hooks
  const { studentStatuses: faceStatuses, connected: faceConnected } = useFaceVerification(roomId || "", isTeacher);
  const { studentStatuses: monitoringStatuses, connected: monitoringConnected, requestUpdate: requestMonitoringUpdate } = useStudentMonitoring(roomId || "", isTeacher);

  // Combine student statuses - use monitoring for teachers, face verification for students
  const studentStatuses = isTeacher ? monitoringStatuses : faceStatuses;
  const monitoringConnected_ = isTeacher ? monitoringConnected : faceConnected;

  // Fetch live state
  const { data: liveState } = useQuery({
    queryKey: ["live-state", roomId],
    queryFn: async () => {
      if (!roomId) throw new Error("No room ID");
      return fetchLiveState(roomId);
    },
    enabled: !!roomId,
    refetchInterval: 2000,
  });

  // Initialize Agora
  useEffect(() => {
    if (!appId || !roomId || !me?.id) return;

    const initAgora = async () => {
      try {
        const client = AgoraRTC.createClient({ mode: "live", codec: "vp9" });
        clientRef.current = client;

        // Handle user joined
        client.on("user-joined", async (user) => {
          remoteMap.current.set(user.uid, user);
          await client.subscribe(user, "video");
          setState((prev) => ({
            ...prev,
            participants: [...prev.participants, { user_id: String(user.uid), user_name: "User", audio_enabled: true, video_enabled: true }],
          }));
        });

        // Handle user left
        client.on("user-left", (user) => {
          remoteMap.current.delete(user.uid);
          setState((prev) => ({
            ...prev,
            participants: prev.participants.filter((p) => p.user_id !== String(user.uid)),
          }));
        });

        // Join channel
        const token = await fetchAgoraToken(roomId, me.id);
        await client.join(appId, roomId, token, me.id);

        // Create local tracks
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        const videoTrack = await AgoraRTC.createCameraVideoTrack();

        localAudioRef.current = audioTrack;
        localVideoRef.current = videoTrack;

        // Publish tracks
        await client.publish([audioTrack, videoTrack]);

        // Join lesson API
        await joinLiveLesson(roomId, me.id);

        // Send presence
        await sendPresence(roomId, "online");

        setState((prev) => ({
          ...prev,
          connected: true,
          loading: false,
          cameraOn: true,
          micOn: true,
        }));
      } catch (error: any) {
        console.error("Agora initialization error:", error);
        setState((prev) => ({
          ...prev,
          error: error.message,
          loading: false,
        }));
      }
    };

    initAgora();

    return () => {
      clientRef.current?.leave();
    };
  }, [appId, roomId, me?.id]);

  // Handle camera toggle
  const handleCameraToggle = useCallback(async () => {
    if (!localVideoRef.current || !clientRef.current) return;

    try {
      if (state.cameraOn) {
        await clientRef.current.unpublish(localVideoRef.current);
        localVideoRef.current.close();
      } else {
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        localVideoRef.current = videoTrack;
        await clientRef.current.publish(videoTrack);
      }

      setState((prev) => ({
        ...prev,
        cameraOn: !prev.cameraOn,
      }));
    } catch (error) {
      console.error("Camera toggle error:", error);
    }
  }, [state.cameraOn]);

  // Handle microphone toggle
  const handleMicToggle = useCallback(async () => {
    if (!localAudioRef.current || !clientRef.current) return;

    try {
      if (state.micOn) {
        await clientRef.current.unpublish(localAudioRef.current);
      } else {
        await clientRef.current.publish(localAudioRef.current);
      }

      setState((prev) => ({
        ...prev,
        micOn: !prev.micOn,
      }));
    } catch (error) {
      console.error("Mic toggle error:", error);
    }
  }, [state.micOn]);

  // Handle hand raise
  const handleHandRaise = useCallback(async () => {
    if (!roomId || !me?.id) return;

    try {
      await raiseHand(roomId, me.id, !state.handRaised);
      setState((prev) => ({
        ...prev,
        handRaised: !prev.handRaised,
      }));
    } catch (error) {
      console.error("Hand raise error:", error);
    }
  }, [roomId, me?.id, state.handRaised]);

  // Handle stage user set
  const handleSetStage = useCallback(async (userId: string) => {
    if (!roomId) return;

    try {
      await setStageUser(roomId, userId);
      setState((prev) => ({
        ...prev,
        stageUser: userId,
      }));
    } catch (error) {
      console.error("Set stage error:", error);
    }
  }, [roomId]);

  // Handle audio toggle for teacher (control student audio)
  const handleAudioToggle = useCallback(async (studentId: string, enabled: boolean) => {
    if (!isTeacher || !roomId) return;

    try {
      // This would require backend implementation to control remote audio
      // For now, just log the action
      console.log(`Audio toggle for student ${studentId}: ${enabled}`);
    } catch (error) {
      console.error("Audio toggle error:", error);
    }
  }, [isTeacher, roomId]);

  // Handle exit room
  const handleExitRoom = useCallback(async () => {
    if (!roomId || !me?.id) return;

    try {
      localVideoRef.current?.close();
      localAudioRef.current?.close();
      await clientRef.current?.leave();
      await leaveLiveRoom(roomId, me.id);
      await sendPresence(roomId, "offline");
      navigate("/lessons");
    } catch (error) {
      console.error("Exit room error:", error);
      navigate("/lessons");
    }
  }, [roomId, me?.id, navigate]);

  // Get stage user video track
  const stageVideoTrack = useMemo(() => {
    if (!state.stageUser || !remoteMap.current.has(state.stageUser)) {
      return null;
    }
    const user = remoteMap.current.get(state.stageUser) as IAgoraRTCRemoteUser;
    return user?.videoTrack;
  }, [state.stageUser]);

  // Sort participants by face status
  const sortedParticipants = useMemo(() => {
    return sortStudents(state.participants, studentStatuses);
  }, [state.participants, studentStatuses]);

  if (state.loading) {
    return (
      <div className="live-page">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="live-page">
        <Typography.Text type="danger">{state.error}</Typography.Text>
      </div>
    );
  }

  return (
    <div className="live-page">
      {/* Main Content */}
      <div className="main-content">
        {/* Stage Section */}
        <div className="stage-section">
          <div className="stage-video-container" ref={stageVideoRef} />
          <div className="stage-overlay">
            <div className="stage-top-info">
              <div className="stage-title">{liveState?.room_name || "Live Class"}</div>
              <div className="stage-subtitle">
                {state.participants.length} participants
                {monitoringConnected_ && ` • Monitoring Active`}
              </div>
            </div>
            <div className="stage-bottom-info">
              <div className="stage-user-label">
                {getInitials(me?.full_name || "?")} • {me?.full_name}
              </div>
            </div>
          </div>
        </div>

        {/* Student Grid Section - Toggleable on tablet/mobile */}
        {state.showStudentsGrid && (
          <StudentGridSection
            participants={state.participants}
            studentStatuses={studentStatuses}
            videoTracks={remoteMap.current}
            isTeacher={isTeacher}
            onClose={() => setState((prev) => ({ ...prev, showStudentsGrid: false }))}
            onAudioToggle={handleAudioToggle}
          />
        )}
      </div>

      {/* Side Panel - Desktop only, always visible */}
      <SidePanel
        participants={state.participants}
        studentStatuses={studentStatuses}
        isTeacher={isTeacher}
        onStudentAudioToggle={handleAudioToggle}
      />

      {/* Live Controls */}
      <div className="live-controls">
        <Button
          className={`control-btn ${state.micOn ? "is-active" : "is-off"}`}
          onClick={handleMicToggle}
          type="primary"
          icon={state.micOn ? <AudioOutlined /> : <AudioMutedOutlined />}
        />

        <Button
          className={`control-btn ${state.cameraOn ? "is-active" : "is-off"}`}
          onClick={handleCameraToggle}
          type="primary"
          icon={state.cameraOn ? <VideoCameraOutlined /> : <StopOutlined />}
        />

        {!isTeacher && (
          <Button
            className={`control-btn ${state.handRaised ? "is-active" : ""}`}
            onClick={handleHandRaise}
            type="primary"
            icon={<HighlightOutlined />}
          />
        )}

        {isTeacher && (
          <Button
            className={`control-btn ${state.showStudentsGrid ? "is-active" : ""}`}
            onClick={() => setState((prev) => ({ ...prev, showStudentsGrid: !prev.showStudentsGrid }))}
            type="primary"
            icon={state.showStudentsGrid ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          />
        )}

        <Button
          className="control-btn exit-btn"
          onClick={handleExitRoom}
          type="primary"
          icon={<LogoutOutlined />}
        />
      </div>
    </div>
  );
}
