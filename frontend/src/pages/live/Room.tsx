import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ILocalAudioTrack,
  ILocalVideoTrack,
  IRemoteVideoTrack,
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
  EyeOutlined,
  EyeInvisibleOutlined,
  TeamOutlined,
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
import { useMe } from "../../hooks/useMe";
import { Button } from "../../components/ui";

import SidePanel from "./components/SidePanel";
import StudentGridSection from "./components/StudentGridSection";
import { useFaceVerification, useStudentMonitoring } from "./hooks/useFaceVerification";
import { sortStudents } from "./utils/studentSorting";

import "./Room_NEW.css";
import "./styles/SidePanel.css";
import "./styles/StudentTile.css";
import "./styles/StudentGridSection.css";

const fallbackAgoraAppId = import.meta.env.VITE_AGORA_APP_ID as string | undefined;
const FACE_VERIFY_INTERVAL_MS = 4000;

interface RoomState {
  connected: boolean;
  loading: boolean;
  error: string | null;
  stageUser: string | null;
  participants: LiveParticipantState[];
  cameraOn: boolean;
  micOn: boolean;
  handRaised: boolean;
  showStudentsGrid: boolean;
}

interface RoomMeta {
  roomId: number;
  roomName: string;
}

const getInitials = (value: string) => {
  const cleaned = value.trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => (part[0] ? part[0].toUpperCase() : ""))
    .join("");
};

type ApiErrorPayload = {
  error?: string;
  detail?: string;
  message?: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null) {
    const axiosLike = error as {
      message?: string;
      response?: {
        status?: number;
        data?: ApiErrorPayload;
      };
    };
    const payloadMessage =
      axiosLike.response?.data?.error ||
      axiosLike.response?.data?.detail ||
      axiosLike.response?.data?.message;
    if (payloadMessage) return payloadMessage;

    const status = axiosLike.response?.status;
    if (status === 403) return "Bu darsga kirish uchun ruxsat yo'q.";
    if (status === 404) return "Live xona topilmadi.";
    if (status === 503) return "Live servis sozlanmagan (Agora konfiguratsiyasini tekshiring).";
    if (axiosLike.message) return axiosLike.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function Room() {
  const navigate = useNavigate();
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: me } = useMe();

  const [state, setState] = useState<RoomState>({
    connected: false,
    loading: true,
    error: null,
    stageUser: null,
    participants: [],
    cameraOn: true,
    micOn: true,
    handRaised: false,
    showStudentsGrid: false,
  });
  const [roomMeta, setRoomMeta] = useState<RoomMeta | null>(null);
  const [trackVersion, setTrackVersion] = useState(0);
  const [localTrackVersion, setLocalTrackVersion] = useState(0);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoRef = useRef<ILocalVideoTrack | null>(null);
  const localAudioRef = useRef<ILocalAudioTrack | null>(null);
  const videoTracksMap = useRef<Map<number, IRemoteVideoTrack>>(new Map());
  const stageVideoRef = useRef<HTMLDivElement | null>(null);
  const captureIntervalRef = useRef<number | null>(null);
  const captureVideoElementRef = useRef<HTMLVideoElement | null>(null);

  const isTeacher = me?.role === "teacher" || me?.role === "admin";
  const localUserId = Number(me?.id ?? 0);

  const roomName = roomMeta?.roomName ?? "";
  const {
    studentStatuses: studentFaceStatuses,
    connected: faceConnected,
    verifyFrame,
  } = useFaceVerification(roomName, Boolean(!isTeacher && state.connected && roomName));
  const {
    studentStatuses: monitoringStatuses,
    connected: monitoringConnected,
    requestUpdate: requestMonitoringUpdate,
  } = useStudentMonitoring(roomName, Boolean(isTeacher && state.connected && roomName));

  const studentStatuses = isTeacher ? monitoringStatuses : studentFaceStatuses;
  const monitoringIsConnected = isTeacher ? monitoringConnected : faceConnected;

  const { data: liveState } = useQuery({
    queryKey: ["live-state", roomMeta?.roomId, lessonId],
    queryFn: async () => {
      if (roomMeta?.roomId) {
        return fetchLiveState({ room_id: roomMeta.roomId });
      }
      if (!lessonId) {
        throw new Error("No lesson ID");
      }
      return fetchLiveState({ lesson_id: Number(lessonId) });
    },
    enabled: Boolean(lessonId),
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (!liveState) return;
    setState((prev) => {
      const currentParticipant = liveState.participants.find(
        (participant) => participant.user_id === localUserId
      );
      return {
        ...prev,
        participants: liveState.participants,
        stageUser: liveState.stage_user_id ? String(liveState.stage_user_id) : null,
        handRaised: Boolean(currentParticipant?.hand_raised),
      };
    });
  }, [liveState, localUserId]);

  useEffect(() => {
    if (!lessonId || !me?.id) return;
    let cancelled = false;

    const initialize = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const roomData = await joinLiveLesson(Number(lessonId));
        if (!roomData.room_id) {
          throw new Error("Live xona topilmadi");
        }
        if (cancelled) return;

        setRoomMeta({
          roomId: roomData.room_id,
          roomName: roomData.room,
        });

        const tokenData = await fetchAgoraToken({
          room_id: roomData.room_id,
          lesson_id: Number(lessonId),
        });
        if (cancelled) return;
        const resolvedAppId = tokenData.app_id || fallbackAgoraAppId;
        if (!resolvedAppId) {
          throw new Error(
            "Agora App ID topilmadi. Backend `AGORA_APP_ID` yoki frontend `VITE_AGORA_APP_ID` sozlamasini tekshiring."
          );
        }

        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;

        const subscribeRemoteUser = async (
          user: IAgoraRTCRemoteUser,
          mediaType?: "audio" | "video"
        ) => {
          try {
            if (!mediaType || mediaType === "video") {
              if (user.hasVideo) {
                await client.subscribe(user, "video");
                if (user.videoTrack) {
                  videoTracksMap.current.set(Number(user.uid), user.videoTrack);
                  setTrackVersion((prev) => prev + 1);
                }
              } else {
                videoTracksMap.current.delete(Number(user.uid));
                setTrackVersion((prev) => prev + 1);
              }
            }

            if ((!mediaType || mediaType === "audio") && user.hasAudio) {
              await client.subscribe(user, "audio");
              if (user.audioTrack) {
                user.audioTrack.play();
              }
            }
          } catch (error) {
            console.error("Subscribe error:", error);
          }
        };

        client.on("user-published", async (user: IAgoraRTCRemoteUser, mediaType) => {
          if (mediaType === "video" || mediaType === "audio") {
            await subscribeRemoteUser(user, mediaType);
          }
        });

        client.on("user-unpublished", (user: IAgoraRTCRemoteUser, mediaType) => {
          if (mediaType === "video") {
            videoTracksMap.current.delete(Number(user.uid));
            setTrackVersion((prev) => prev + 1);
          }
        });

        client.on("user-left", (user: IAgoraRTCRemoteUser) => {
          videoTracksMap.current.delete(Number(user.uid));
          setTrackVersion((prev) => prev + 1);
        });

        await client.join(resolvedAppId, tokenData.channel, tokenData.token, tokenData.uid || null);

        // Existing publishers may already be in the room before this user joins.
        await Promise.all(client.remoteUsers.map((remoteUser) => subscribeRemoteUser(remoteUser)));

        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        localVideoRef.current = videoTrack;

        let audioTrack: ILocalAudioTrack | null = null;
        try {
          audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        } catch (audioError) {
          console.error("Audio track init error:", audioError);
          audioTrack = null;
        }
        localAudioRef.current = audioTrack;
        setLocalTrackVersion((prev) => prev + 1);

        if (audioTrack && !isTeacher) {
          await audioTrack.setEnabled(false);
        }

        const tracksToPublish = audioTrack ? [videoTrack, audioTrack] : [videoTrack];
        await client.publish(tracksToPublish);

        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          connected: true,
          loading: false,
          cameraOn: true,
          micOn: Boolean(isTeacher && audioTrack),
        }));
      } catch (error: unknown) {
        const message = getErrorMessage(error, "Live darsga ulanishda xatolik yuz berdi");
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            error: message,
            loading: false,
          }));
        }
      }
    };

    void initialize();

    return () => {
      cancelled = true;
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
      captureVideoElementRef.current = null;
      localVideoRef.current?.close();
      localAudioRef.current?.close();
      videoTracksMap.current.clear();
      clientRef.current?.leave().catch(() => undefined);
      clientRef.current = null;
    };
  }, [lessonId, me?.id, isTeacher]);

  useEffect(() => {
    if (!state.connected || !roomMeta?.roomId) return;
    if (isTeacher && monitoringConnected) {
      requestMonitoringUpdate();
    }
  }, [isTeacher, monitoringConnected, requestMonitoringUpdate, roomMeta?.roomId, state.connected]);

  const stageUserId = state.stageUser ? Number(state.stageUser) : null;
  const isStageUser = stageUserId === localUserId;

  useEffect(() => {
    if (isTeacher) return;
    const audioTrack = localAudioRef.current;
    if (!audioTrack) return;
    void audioTrack.setEnabled(isStageUser);
    setState((prev) => ({ ...prev, micOn: isStageUser }));
  }, [isTeacher, isStageUser]);

  useEffect(() => {
    if (isTeacher || !state.connected || !faceConnected) return;
    const localTrack = localVideoRef.current;
    if (!localTrack) return;

    const mediaTrack = localTrack.getMediaStreamTrack?.();
    if (!mediaTrack) return;

    const videoElement = document.createElement("video");
    videoElement.muted = true;
    videoElement.autoplay = true;
    videoElement.playsInline = true;
    videoElement.srcObject = new MediaStream([mediaTrack]);
    captureVideoElementRef.current = videoElement;
    void videoElement.play().catch(() => undefined);

    const runVerification = () => {
      if (videoElement.videoWidth <= 0 || videoElement.videoHeight <= 0) return;
      const canvas = document.createElement("canvas");
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(videoElement, 0, 0);
      verifyFrame(canvas.toDataURL("image/jpeg", 0.65));
    };

    runVerification();
    captureIntervalRef.current = window.setInterval(runVerification, FACE_VERIFY_INTERVAL_MS);

    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
      if (captureVideoElementRef.current) {
        captureVideoElementRef.current.pause();
        captureVideoElementRef.current.srcObject = null;
        captureVideoElementRef.current = null;
      }
    };
  }, [faceConnected, isTeacher, state.connected, verifyFrame]);

  const handleCameraToggle = useCallback(async () => {
    const videoTrack = localVideoRef.current;
    if (!videoTrack) return;

    const next = !state.cameraOn;
    try {
      await videoTrack.setEnabled(next);
      setState((prev) => ({ ...prev, cameraOn: next }));
      setLocalTrackVersion((prev) => prev + 1);
    } catch (error) {
      console.error("Camera toggle error:", error);
    }
  }, [state.cameraOn]);

  const handleMicToggle = useCallback(async () => {
    const audioTrack = localAudioRef.current;
    if (!audioTrack) return;

    const next = !state.micOn;
    try {
      await audioTrack.setEnabled(next);
      setState((prev) => ({ ...prev, micOn: next }));
    } catch (error) {
      console.error("Mic toggle error:", error);
    }
  }, [state.micOn]);

  const handleHandRaise = useCallback(async () => {
    if (!roomMeta?.roomId) return;

    const next = !state.handRaised;
    try {
      await raiseHand(roomMeta.roomId, next);
      setState((prev) => ({ ...prev, handRaised: next }));
    } catch (error) {
      console.error("Hand raise error:", error);
    }
  }, [roomMeta?.roomId, state.handRaised]);

  const handleSetStage = useCallback(
    async (userId: number) => {
      if (!isTeacher || !roomMeta?.roomId) return;
      try {
        await setStageUser(roomMeta.roomId, userId);
        setState((prev) => ({
          ...prev,
          stageUser: String(userId),
          participants: prev.participants.map((participant) =>
            participant.user_id === userId
              ? { ...participant, hand_raised: false }
              : participant
          ),
        }));
      } catch (error) {
        console.error("Stage set error:", error);
      }
    },
    [isTeacher, roomMeta?.roomId]
  );

  const handleExitRoom = useCallback(async () => {
    try {
      if (roomMeta?.roomId) {
        await leaveLiveRoom(roomMeta.roomId);
      }
    } catch (error) {
      console.error("Leave room error:", error);
    } finally {
      localVideoRef.current?.close();
      localAudioRef.current?.close();
      await clientRef.current?.leave().catch(() => undefined);
      navigate(-1);
    }
  }, [navigate, roomMeta?.roomId]);

  const handleEndRoom = useCallback(async () => {
    if (!isTeacher || !roomMeta?.roomId) return;
    try {
      await endLiveRoom(roomMeta.roomId);
    } catch (error) {
      console.error("End room error:", error);
    } finally {
      await handleExitRoom();
    }
  }, [handleExitRoom, isTeacher, roomMeta?.roomId]);

  const stageVideoTrack = useMemo(() => {
    let track: ILocalVideoTrack | IRemoteVideoTrack | null = null;

    if (stageUserId) {
      if (stageUserId === localUserId) {
        track = localVideoRef.current;
      } else {
        track = videoTracksMap.current.get(stageUserId) || null;
      }
    }

    if (!track) {
      const teacherParticipant = state.participants.find((participant) => participant.is_teacher);
      if (teacherParticipant) {
        if (teacherParticipant.user_id === localUserId) {
          track = localVideoRef.current;
        } else {
          track = videoTracksMap.current.get(teacherParticipant.user_id) || null;
        }
      }
    }

    if (!track && isTeacher) {
      track = localVideoRef.current;
    }

    return track;
  }, [isTeacher, localTrackVersion, localUserId, stageUserId, state.participants, trackVersion]);

  useEffect(() => {
    if (!stageVideoRef.current) return;
    if (!stageVideoTrack) {
      stageVideoRef.current.innerHTML = "";
      return;
    }

    stageVideoTrack.play(stageVideoRef.current);
    return () => {
      // WHY: the same remote video track can be rendered in multiple places (stage/grid).
      // stop() tears down playback across all bound elements, causing random blank videos.
      // Clearing only this container prevents cross-component side effects.
      if (stageVideoRef.current) {
        stageVideoRef.current.innerHTML = "";
      }
    };
  }, [stageVideoTrack]);

  const sortedParticipants = useMemo(
    () => sortStudents(state.participants, studentStatuses),
    [state.participants, studentStatuses]
  );

  const stageParticipant = useMemo(() => {
    if (stageUserId) {
      return state.participants.find((participant) => participant.user_id === stageUserId) || null;
    }
    const teacherParticipant = state.participants.find((participant) => participant.is_teacher);
    return teacherParticipant || null;
  }, [stageUserId, state.participants]);

  const stageName = useMemo(() => {
    if (stageParticipant?.user_name) return stageParticipant.user_name;
    const meName = `${me?.first_name || ""} ${me?.last_name || ""}`.trim();
    return meName || me?.username || "Ma'ruzachi";
  }, [me?.first_name, me?.last_name, me?.username, stageParticipant?.user_name]);

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
      <div className="main-content">
        <div className="stage-section">
          <div className="stage-video-container" ref={stageVideoRef} />
          {!stageVideoTrack && <div className="stage-empty">Video yo'q</div>}
          <div className="stage-overlay">
            <div className="stage-top-info">
              <div className="stage-title">{roomMeta?.roomName || "Live class"}</div>
              <div className="stage-subtitle">
                {state.participants.length} ishtirokchi
                {monitoringIsConnected ? " | Monitoring active" : ""}
              </div>
            </div>
            <div className="stage-bottom-info">
              <div className="stage-user-label">
                {getInitials(stageName)} | {stageName}
              </div>
            </div>
          </div>
        </div>

        {state.showStudentsGrid && (
          <StudentGridSection
            participants={sortedParticipants}
            studentStatuses={studentStatuses}
            videoTracks={videoTracksMap.current}
            isTeacher={isTeacher}
            onClose={() => setState((prev) => ({ ...prev, showStudentsGrid: false }))}
            onStudentSelect={isTeacher ? handleSetStage : undefined}
            stageUserId={stageUserId}
          />
        )}
      </div>

      <SidePanel
        participants={sortedParticipants}
        studentStatuses={studentStatuses}
        isTeacher={isTeacher}
        onStudentSelect={isTeacher ? handleSetStage : undefined}
        stageUserId={stageUserId}
      />

      <div className="live-controls">
        <Button
          className={`control-btn ${state.micOn ? "is-active" : "is-off"}`}
          onClick={handleMicToggle}
          icon={state.micOn ? <AudioOutlined /> : <AudioMutedOutlined />}
          disabled={!isTeacher && !isStageUser}
        />

        <Button
          className={`control-btn ${state.cameraOn ? "is-active" : "is-off"}`}
          onClick={handleCameraToggle}
          icon={state.cameraOn ? <VideoCameraOutlined /> : <StopOutlined />}
        />

        {!isTeacher && (
          <Button
            className={`control-btn ${state.handRaised ? "is-active" : ""}`}
            onClick={handleHandRaise}
            icon={<HighlightOutlined />}
          />
        )}

        {isTeacher && (
          <Button
            className={`control-btn ${state.showStudentsGrid ? "is-active" : ""}`}
            onClick={() =>
              setState((prev) => ({ ...prev, showStudentsGrid: !prev.showStudentsGrid }))
            }
            icon={state.showStudentsGrid ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          />
        )}

        {isTeacher && (
          <Button className="control-btn is-off" onClick={handleEndRoom} icon={<TeamOutlined />} />
        )}

        <Button className="control-btn exit-btn" onClick={handleExitRoom} icon={<LogoutOutlined />} />
      </div>
    </div>
  );
}
