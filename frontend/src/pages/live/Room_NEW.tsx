/**
 * Refactored Live Room with new layout
 * - Desktop: Main stage + side panel (always visible) + mini grid (toggleable) + controls
 * - Tablet/Mobile: Responsive
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ILocalVideoTrack,
} from "agora-rtc-sdk-ng";
import { Spin } from "antd";
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
} from "@ant-design/icons";

import {
  endLiveRoom,
  fetchAgoraToken,
  fetchLiveState,
  joinLiveLesson,
  leaveLiveRoom,
  raiseHand,
  setStageUser,
} from "../../api/live";
import type { LiveParticipantState } from "../../api/live";
import { sendPresence } from "../../api/attendance";
import { fetchLessons } from "../../api/lessons";
import { useMe } from "../../hooks/useMe";
import { Button } from "../../components/ui";

// NEW: Import components
import { SidePanel } from "./components/SidePanel";
import { StudentGridSection } from "./components/StudentGridSection";
import { useFaceVerification, useStudentMonitoring } from "./hooks/useFaceVerification";
import { sortStudents } from "./utils/studentSorting";

// NEW: Import CSS
import "./Room.css";
import "./styles/SidePanel.css";
import "./styles/StudentTile.css";
import "./styles/StudentGridSection.css";

const appId = import.meta.env.VITE_AGORA_APP_ID as string | undefined;

const LiveRoomPage = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { data: user } = useMe();
  const { data: lessons } = useQuery({ queryKey: ["lessons"], queryFn: fetchLessons });

  const lesson = useMemo(
    () => lessons?.find((l: any) => String(l.id) === String(lessonId)),
    [lessons, lessonId]
  );

  // State
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Ulanmoqda");
  const [error, setError] = useState<string | null>(null);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [agoraInfo, setAgoraInfo] = useState<any>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [localTracks, setLocalTracks] = useState<any>({});
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [stageUserId, setStageUserId] = useState<number | null>(null);
  const [participants, setParticipants] = useState<LiveParticipantState[]>([]);
  const [handRaised, setHandRaised] = useState(false);
  const [screenTrack, setScreenTrack] = useState<ILocalVideoTrack | null>(null);

  // NEW: Mini grid toggle
  const [showStudentsGrid, setShowStudentsGrid] = useState(false);

  // NEW: Student monitoring hooks
  const userRole = user?.role || "student";
  const isTeacher = userRole === "teacher" || user?.is_superuser;
  const localUserId = user?.id ? Number(user.id) : null;

  // Face verification (students)
  const { studentStatuses: faceStatuses, verifyFrame } = useFaceVerification(
    roomInfo?.room_name || "",
    !isTeacher
  );

  // Student monitoring (teachers)
  const { studentStatuses: monitoringStatuses } = useStudentMonitoring(
    roomInfo?.room_name || "",
    isTeacher
  );

  // Combine statuses
  const studentStatuses = isTeacher ? monitoringStatuses : faceStatuses;

  // Refs
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const stageVideoRef = useRef<HTMLDivElement | null>(null);

  // Sync remote users
  const syncRemoteUsers = useCallback(() => {
    if (!clientRef.current) return;
    setRemoteUsers([...clientRef.current.remoteUsers]);
  }, []);

  // Create remote user map
  const remoteMap = useMemo(() => {
    const map = new Map<number, IAgoraRTCRemoteUser>();
    remoteUsers.forEach((remote) => {
      const uid = Number(remote.uid);
      if (!Number.isNaN(uid)) map.set(uid, remote);
    });
    return map;
  }, [remoteUsers]);

  // Calculate effective stage user
  const effectiveStageUserId = stageUserId ?? (isTeacher ? localUserId : null);
  const isStageUser = Boolean(localUserId && effectiveStageUserId === localUserId);

  // Refresh state
  const refreshState = useCallback(async () => {
    if (!roomInfo?.room_id) return;
    try {
      const data = await fetchLiveState({ room_id: roomInfo.room_id });
      setParticipants(data.participants || []);
      const teacher = (data.participants || []).find((p: any) => p.is_teacher);
      setStageUserId(data.stage_user_id ?? teacher?.user_id ?? null);
      const me = (data.participants || []).find((p: any) => p.user_id === localUserId);
      setHandRaised(Boolean(me?.hand_raised));
    } catch (err) {
      console.error("Failed to refresh state:", err);
    }
  }, [roomInfo?.room_id, localUserId]);

  // Initialize Agora
  useEffect(() => {
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = client;

    client.on("user-published", async (u, type) => {
      await client.subscribe(u, type);
      if (type === "audio") u.audioTrack?.play();
      syncRemoteUsers();
    });

    client.on("user-unpublished", (u) => {
      u.audioTrack?.stop();
      u.videoTrack?.stop();
      syncRemoteUsers();
    });

    client.on("user-joined", syncRemoteUsers);
    client.on("user-left", syncRemoteUsers);

    return () => client.removeAllListeners();
  }, [syncRemoteUsers]);

  // Join lesson
  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!lessonId) return;
      try {
        if (!appId) throw new Error("Agora App ID missing");
        const info = await joinLiveLesson(Number(lessonId));
        const tokenInfo = await fetchAgoraToken({
          room_id: info.room_id,
          lesson_id: Number(lessonId),
        });

        if (mounted) {
          setRoomInfo({ room_id: info.room_id, room_name: info.room });
          setAgoraInfo(tokenInfo);
        }
      } catch (err: any) {
        if (mounted)
          setError(err?.response?.data?.error || err?.message || "Error joining");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [lessonId]);

  // Join Agora
  useEffect(() => {
    let cancelled = false;

    const joinAgora = async () => {
      if (!roomInfo || !agoraInfo || !clientRef.current) return;

      try {
        const client = clientRef.current;
        await client.join(appId!, agoraInfo.channel, agoraInfo.token, agoraInfo.uid || null);
        const [audio, video] = await AgoraRTC.createMicrophoneAndCameraTracks();

        if (cancelled) {
          audio.close();
          video.close();
          return;
        }

        await client.publish([audio, video]);
        setLocalTracks({ audio, video });
        setStatus("Ulangan");
      } catch (err) {
        console.error("Agora join error:", err);
        setError("Agora connection failed");
      }
    };

    joinAgora();
    return () => {
      cancelled = true;
    };
  }, [roomInfo, agoraInfo]);

  // Periodic state refresh
  useEffect(() => {
    if (!roomInfo?.room_id) return;

    refreshState();
    const timer = setInterval(refreshState, 4000);
    return () => clearInterval(timer);
  }, [roomInfo?.room_id, refreshState]);

  // Mic enable/disable for students
  useEffect(() => {
    if (!localTracks.audio) return;

    if (userRole === "student") {
      localTracks.audio
        .setEnabled(isStageUser)
        .then(() => setMicEnabled(isStageUser))
        .catch(() => {});
    }
  }, [isStageUser, userRole, localTracks.audio]);

  // Send presence (face frames)
  useEffect(() => {
    if (!localTracks.video || userRole !== "student" || !lessonId) return;

    let cancelled = false;

    const videoEl = document.createElement("video");
    videoEl.muted = true;
    videoEl.playsInline = true;

    const stream = new MediaStream([localTracks.video.getMediaStreamTrack()]);
    videoEl.srcObject = stream;

    const tick = async () => {
      if (cancelled || !videoEl.videoWidth) return;

      const canvas = document.createElement("canvas");
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      canvas.getContext("2d")?.drawImage(videoEl, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          sendPresence(Number(lessonId), blob).catch((err) =>
            console.error("Presence send error:", err)
          );
        }
      }, "image/jpeg", 0.6);
    };

    const timer = setInterval(tick, 25000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [localTracks.video, userRole, lessonId]);

  // Handlers
  const handleLeave = async () => {
    if (roomInfo?.room_id) {
      await leaveLiveRoom(roomInfo.room_id).catch(() => {});
    }
    localTracks.audio?.close();
    localTracks.video?.close();
    screenTrack?.close();
    await clientRef.current?.leave().catch(() => {});
    navigate(-1);
  };

  const handleEnd = async () => {
    if (roomInfo?.room_id) {
      await endLiveRoom(roomInfo.room_id).catch(() => {});
    }
    handleLeave();
  };

  const handleStageSelect = useCallback(
    async (userId?: number | null) => {
      if (!roomInfo?.room_id) return;
      try {
        await setStageUser(roomInfo.room_id, userId ?? null);
        setStageUserId(userId ?? null);
      } catch (err) {
        console.error("Failed to set stage user:", err);
      }
    },
    [roomInfo?.room_id]
  );

  const handleAudioToggle = useCallback(
    (studentId: number) => {
      if (isTeacher) {
        handleStageSelect(studentId);
      }
    },
    [isTeacher, handleStageSelect]
  );

  // Get stage video track
  const stageVideoTrack = useMemo(() => {
    if (effectiveStageUserId) {
      if (localUserId === effectiveStageUserId) {
        return screenTrack ?? localTracks.video;
      }
      return remoteMap.get(effectiveStageUserId)?.videoTrack;
    }

    const fallbackRemote = remoteUsers.find((u) => u.videoTrack);
    return fallbackRemote?.videoTrack;
  }, [effectiveStageUserId, localUserId, localTracks.video, remoteMap, screenTrack, remoteUsers]);

  // Play stage video
  useEffect(() => {
    if (!stageVideoTrack || !stageVideoRef.current) return;

    stageVideoTrack.play(stageVideoRef.current);
    return () => stageVideoTrack.stop();
  }, [stageVideoTrack]);

  // Get sorted students
  const sortedStudents = useMemo(
    () => sortStudents(participants, studentStatuses),
    [participants, studentStatuses]
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-center h-screen flex-direction-column">
        <h2 className="text-error">Xatolik</h2>
        <p>{error}</p>
        <Button onClick={() => navigate(-1)}>Orqaga</Button>
      </div>
    );
  }

  return (
    <div className="live-page">
      <div className="main-content">
        {/* STAGE SECTION */}
        <div className="stage-section">
          <div ref={stageVideoRef} className="stage-video-container" />
          <div className="stage-overlay">
            <div className="stage-top-info">
              <div className="stage-title">{lesson?.subject_name || "Live dars"}</div>
              <div className="stage-subtitle">{lesson?.topic}</div>
            </div>
            <div className="stage-bottom-info">
              <div className="stage-user-label">
                {participants.find((p) => p.user_id === effectiveStageUserId)?.user_name ||
                  (isStageUser ? "Siz" : "Ma'ruzachi")}
              </div>
            </div>
          </div>
        </div>

        {/* MINI GRID SECTION (Toggleable) */}
        {showStudentsGrid && (
          <StudentGridSection
            participants={participants}
            studentStatuses={studentStatuses}
            videoTracks={remoteMap}
            isTeacher={isTeacher}
            onClose={() => setShowStudentsGrid(false)}
            onAudioToggle={handleAudioToggle}
          />
        )}
      </div>

      {/* SIDE PANEL (Always visible on desktop) */}
      <SidePanel
        participants={participants}
        studentStatuses={studentStatuses}
        isTeacher={isTeacher}
        onStudentAudioToggle={handleAudioToggle}
      />

      {/* CONTROLS BAR */}
      <div className="live-controls">
        <Button
          variant="ghost"
          className={`control-btn ${!micEnabled ? "is-off" : ""}`}
          icon={micEnabled ? <AudioOutlined /> : <AudioMutedOutlined />}
          onClick={() => {
            const next = !micEnabled;
            localTracks.audio?.setEnabled(next);
            setMicEnabled(next);
          }}
          disabled={userRole === "student" && !isStageUser}
          title="Mikrofon"
        />

        <Button
          variant="ghost"
          className={`control-btn ${!camEnabled ? "is-off" : ""}`}
          icon={camEnabled ? <VideoCameraOutlined /> : <StopOutlined />}
          onClick={() => {
            const next = !camEnabled;
            localTracks.video?.setEnabled(next);
            setCamEnabled(next);
          }}
          title="Kamera"
        />

        {!isTeacher && (
          <Button
            variant="ghost"
            className={`control-btn ${handRaised ? "is-active" : ""}`}
            icon={<HighlightOutlined />}
            onClick={async () => {
              const next = !handRaised;
              await raiseHand(roomInfo.room_id, next);
              setHandRaised(next);
            }}
            title="Qol ko'tarish"
          />
        )}

        {/* NEW: Toggle mini grid button */}
        <Button
          variant="ghost"
          className={`control-btn ${showStudentsGrid ? "is-active" : ""}`}
          icon={<EyeOutlined />}
          onClick={() => setShowStudentsGrid(!showStudentsGrid)}
          title="Talabalar ko'rsatish/yashirish"
        />

        <Button
          variant="error"
          className="control-btn exit-btn"
          icon={<LogoutOutlined />}
          onClick={isTeacher ? handleEnd : handleLeave}
          title="Chiqish"
        />
      </div>
    </div>
  );
};

export default LiveRoomPage;
