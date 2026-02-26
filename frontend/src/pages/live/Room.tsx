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
import { useTranslation } from "react-i18next";
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
import i18next from "../../i18n";

import "./Room_NEW.css";
import "./styles/SidePanel.css";
import "./styles/StudentTile.css";
import "./styles/StudentGridSection.css";

const fallbackAgoraAppId = import.meta.env.VITE_AGORA_APP_ID as string | undefined;
const FACE_VERIFY_INTERVAL_MS = 4000;
const STAGE_PLAY_RETRY_MS = 180;
const STAGE_PLAY_MAX_RETRY = 2;

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

interface TokenMeta {
  appId: string;
  channel: string;
  uid: string;
  hasToken: boolean;
}

const normalizeUid = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value);
};

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

const toErrorText = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
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
    if (status === 403) return i18next.t("live.errors.forbidden");
    if (status === 404) return i18next.t("live.errors.notFound");
    if (status === 503) return i18next.t("live.errors.serviceUnavailable");
    if (axiosLike.message) return axiosLike.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function Room() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: me } = useMe();

  const debugEnabled = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("debug_live") === "1";
  }, []);

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
  const [tokenMeta, setTokenMeta] = useState<TokenMeta | null>(null);
  const [debugEvents, setDebugEvents] = useState<string[]>([]);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoRef = useRef<ILocalVideoTrack | null>(null);
  const localAudioRef = useRef<ILocalAudioTrack | null>(null);
  const videoTracksMap = useRef<Map<string, IRemoteVideoTrack>>(new Map());
  const stageVideoRef = useRef<HTMLDivElement | null>(null);
  const captureIntervalRef = useRef<number | null>(null);
  const captureVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const stagePlayTimerRef = useRef<number | null>(null);

  const pushDebug = useCallback(
    (label: string, payload?: unknown) => {
      if (!debugEnabled) return;
      const ts = new Date().toISOString().slice(11, 19);
      const suffix = payload === undefined ? "" : ` | ${toErrorText(payload)}`;
      const line = `${ts} ${label}${suffix}`;
      setDebugEvents((prev) => [line, ...prev].slice(0, 40));
    },
    [debugEnabled]
  );

  const isTeacher = me?.role === "teacher" || me?.role === "admin";
  const localUserUid = normalizeUid(me?.id);

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
    const resolvedStageUserId =
      liveState.stage_user_id ?? liveState.resolved_stage_user_id ?? null;

    setState((prev) => {
      const currentParticipant = liveState.participants.find(
        (participant) => normalizeUid(participant.user_id) === localUserUid
      );
      return {
        ...prev,
        participants: liveState.participants,
        stageUser: resolvedStageUserId ? normalizeUid(resolvedStageUserId) : null,
        handRaised: Boolean(currentParticipant?.hand_raised),
      };
    });

    pushDebug("live-state update", {
      participants: liveState.participants.length,
      stage_user_id: liveState.stage_user_id,
      resolved_stage_user_id: liveState.resolved_stage_user_id,
    });
  }, [liveState, localUserUid, pushDebug]);

  useEffect(() => {
    if (!lessonId || !me?.id) return;
    let cancelled = false;

    const initialize = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const roomData = await joinLiveLesson(Number(lessonId));
        if (!roomData.room_id) {
          throw new Error(t("live.errors.notFound"));
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

        if (!tokenData.channel || !tokenData.token) {
          throw new Error("Invalid Agora token response: missing channel/token");
        }
        if (tokenData.uid === null || tokenData.uid === undefined) {
          throw new Error("Invalid Agora token response: missing uid");
        }

        const resolvedAppId = tokenData.app_id || fallbackAgoraAppId;
        if (!resolvedAppId) {
          throw new Error(t("live.errors.missingAppId"));
        }

        const tokenUid = normalizeUid(tokenData.uid);
        setTokenMeta({
          appId: resolvedAppId,
          channel: tokenData.channel,
          uid: tokenUid,
          hasToken: Boolean(tokenData.token),
        });

        if (roomData.room && tokenData.channel && roomData.room !== tokenData.channel) {
          pushDebug("token channel mismatch", {
            room: roomData.room,
            token_channel: tokenData.channel,
          });
        }
        if (tokenUid && localUserUid && tokenUid !== localUserUid) {
          pushDebug("token uid mismatch", { token_uid: tokenUid, local_uid: localUserUid });
        }

        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;

        const syncRemoteVideoTrack = (user: IAgoraRTCRemoteUser, label: string) => {
          const remoteUid = normalizeUid(user.uid);
          if (user.videoTrack) {
            videoTracksMap.current.set(remoteUid, user.videoTrack);
            setTrackVersion((prev) => prev + 1);
            pushDebug(label, { uid: remoteUid, hasVideoTrack: true });
            return;
          }
          videoTracksMap.current.delete(remoteUid);
          setTrackVersion((prev) => prev + 1);
          pushDebug(label, { uid: remoteUid, hasVideoTrack: false });
        };

        const subscribeRemoteUser = async (
          user: IAgoraRTCRemoteUser,
          mediaType?: "audio" | "video"
        ) => {
          const remoteUid = normalizeUid(user.uid);
          try {
            const shouldTryVideo =
              mediaType === "video" ||
              (!mediaType && (Boolean(user.videoTrack) || Boolean(user.hasVideo)));
            const shouldTryAudio =
              mediaType === "audio" ||
              (!mediaType && (Boolean(user.audioTrack) || Boolean(user.hasAudio)));

            if (shouldTryVideo) {
              await client.subscribe(user, "video");
              syncRemoteVideoTrack(user, "video subscribed");
            }

            if (shouldTryAudio) {
              await client.subscribe(user, "audio");
              if (user.audioTrack) {
                user.audioTrack.play();
              }
            }
          } catch (error) {
            pushDebug("subscribe error", { uid: remoteUid, mediaType, error: toErrorText(error) });
          }
        };

        client.on("user-published", async (user: IAgoraRTCRemoteUser, mediaType) => {
          if (mediaType === "video" || mediaType === "audio") {
            pushDebug("user-published", { uid: normalizeUid(user.uid), mediaType });
            await subscribeRemoteUser(user, mediaType);
          }
        });

        client.on("user-unpublished", (user: IAgoraRTCRemoteUser, mediaType) => {
          if (mediaType === "video") {
            const remoteUid = normalizeUid(user.uid);
            videoTracksMap.current.delete(remoteUid);
            setTrackVersion((prev) => prev + 1);
            pushDebug("user-unpublished", { uid: remoteUid, mediaType });
          }
        });

        client.on("user-left", (user: IAgoraRTCRemoteUser) => {
          const remoteUid = normalizeUid(user.uid);
          videoTracksMap.current.delete(remoteUid);
          setTrackVersion((prev) => prev + 1);
          pushDebug("user-left", { uid: remoteUid });
        });

        client.on(
          "user-info-updated",
          ((uid: unknown, msg: unknown) => {
            const normalized = normalizeUid(uid);
            pushDebug("user-info-updated", { uid: normalized, msg });
            const remoteUser = client.remoteUsers.find(
              (user) => normalizeUid(user.uid) === normalized
            );
            if (remoteUser) {
              void subscribeRemoteUser(remoteUser);
            }
          }) as (...args: any[]) => void
        );

        client.on("connection-state-change", ((currentState: unknown, previousState: unknown, reason: unknown) => {
          pushDebug("connection-state-change", {
            previous: previousState,
            current: currentState,
            reason,
          });
        }) as (...args: any[]) => void);

        await client.join(resolvedAppId, tokenData.channel, tokenData.token, tokenData.uid || null);
        pushDebug("joined channel", { channel: tokenData.channel, uid: tokenUid || "(empty)" });

        pushDebug("initial remote scan", { count: client.remoteUsers.length });
        await Promise.allSettled(client.remoteUsers.map((remoteUser) => subscribeRemoteUser(remoteUser)));

        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        localVideoRef.current = videoTrack;
        pushDebug("local video track created");

        let audioTrack: ILocalAudioTrack | null = null;
        try {
          audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        } catch (audioError) {
          pushDebug("audio track init error", toErrorText(audioError));
          audioTrack = null;
        }
        localAudioRef.current = audioTrack;
        setLocalTrackVersion((prev) => prev + 1);

        if (audioTrack && !isTeacher) {
          await audioTrack.setEnabled(false);
        }

        const tracksToPublish = audioTrack ? [videoTrack, audioTrack] : [videoTrack];
        await client.publish(tracksToPublish);
        pushDebug("local tracks published", {
          video: true,
          audio: Boolean(audioTrack),
        });

        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          connected: true,
          loading: false,
          cameraOn: true,
          micOn: Boolean(isTeacher && audioTrack),
        }));
      } catch (error: unknown) {
        const message = getErrorMessage(error, t("live.errors.joinFailed"));
        pushDebug("initialize error", { message, raw: toErrorText(error) });
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
      if (stagePlayTimerRef.current) {
        clearTimeout(stagePlayTimerRef.current);
        stagePlayTimerRef.current = null;
      }
      captureVideoElementRef.current = null;
      localVideoRef.current?.close();
      localAudioRef.current?.close();
      videoTracksMap.current.clear();
      clientRef.current?.removeAllListeners();
      clientRef.current?.leave().catch(() => undefined);
      clientRef.current = null;
    };
  }, [lessonId, me?.id, isTeacher, localUserUid, pushDebug, t]);

  useEffect(() => {
    if (!liveState) return;
    if (!Array.isArray(liveState.participants)) {
      pushDebug("live-state invalid participants", liveState);
      setState((prev) => ({
        ...prev,
        error: t("live.errors.joinFailed"),
      }));
      return;
    }
    if (roomMeta?.roomName && liveState.room && roomMeta.roomName !== liveState.room) {
      pushDebug("live-state room mismatch", {
        room_meta: roomMeta.roomName,
        state_room: liveState.room,
      });
    }
  }, [liveState, pushDebug, roomMeta?.roomName, t]);

  useEffect(() => {
    if (!state.connected || !roomMeta?.roomId) return;
    if (isTeacher && monitoringConnected) {
      requestMonitoringUpdate();
    }
  }, [isTeacher, monitoringConnected, requestMonitoringUpdate, roomMeta?.roomId, state.connected]);

  const stageUserId = state.stageUser;
  const isStageUser = Boolean(stageUserId && stageUserId === localUserUid);

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
      pushDebug("camera toggled", { enabled: next });
    } catch (error) {
      pushDebug("camera toggle error", toErrorText(error));
    }
  }, [pushDebug, state.cameraOn]);

  const handleMicToggle = useCallback(async () => {
    const audioTrack = localAudioRef.current;
    if (!audioTrack) return;

    const next = !state.micOn;
    try {
      await audioTrack.setEnabled(next);
      setState((prev) => ({ ...prev, micOn: next }));
      pushDebug("mic toggled", { enabled: next });
    } catch (error) {
      pushDebug("mic toggle error", toErrorText(error));
    }
  }, [pushDebug, state.micOn]);

  const handleHandRaise = useCallback(async () => {
    if (!roomMeta?.roomId) return;

    const next = !state.handRaised;
    try {
      await raiseHand(roomMeta.roomId, next);
      setState((prev) => ({ ...prev, handRaised: next }));
      pushDebug("hand raise", { raised: next });
    } catch (error) {
      pushDebug("hand raise error", toErrorText(error));
    }
  }, [pushDebug, roomMeta?.roomId, state.handRaised]);

  const handleSetStage = useCallback(
    async (userId: number) => {
      if (!isTeacher || !roomMeta?.roomId) return;
      try {
        await setStageUser(roomMeta.roomId, userId);
        setState((prev) => ({
          ...prev,
          stageUser: normalizeUid(userId),
          participants: prev.participants.map((participant) =>
            participant.user_id === userId
              ? { ...participant, hand_raised: false }
              : participant
          ),
        }));
        pushDebug("set stage user", { userId });
      } catch (error) {
        pushDebug("set stage error", toErrorText(error));
      }
    },
    [isTeacher, pushDebug, roomMeta?.roomId]
  );

  const handleExitRoom = useCallback(async () => {
    try {
      if (roomMeta?.roomId) {
        await leaveLiveRoom(roomMeta.roomId);
      }
    } catch (error) {
      pushDebug("leave room error", toErrorText(error));
    } finally {
      localVideoRef.current?.close();
      localAudioRef.current?.close();
      await clientRef.current?.leave().catch(() => undefined);
      navigate(-1);
    }
  }, [navigate, pushDebug, roomMeta?.roomId]);

  const handleEndRoom = useCallback(async () => {
    if (!isTeacher || !roomMeta?.roomId) return;
    try {
      await endLiveRoom(roomMeta.roomId);
    } catch (error) {
      pushDebug("end room error", toErrorText(error));
    } finally {
      await handleExitRoom();
    }
  }, [handleExitRoom, isTeacher, pushDebug, roomMeta?.roomId]);

  const stageVideoTrack = useMemo(() => {
    const teacherParticipant = state.participants.find((participant) => participant.is_teacher);

    if (stageUserId) {
      const stageRemoteTrack = videoTracksMap.current.get(stageUserId);
      if (stageRemoteTrack) {
        return stageRemoteTrack;
      }
    }

    if (isTeacher && localVideoRef.current) {
      return localVideoRef.current;
    }

    if (teacherParticipant) {
      const teacherUid = normalizeUid(teacherParticipant.user_id);
      const teacherRemoteTrack = videoTracksMap.current.get(teacherUid);
      if (teacherRemoteTrack) {
        return teacherRemoteTrack;
      }
    }

    const firstRemote = videoTracksMap.current.values().next().value as IRemoteVideoTrack | undefined;
    return firstRemote || null;
  }, [isTeacher, localTrackVersion, stageUserId, state.participants, trackVersion]);

  useEffect(() => {
    if (!stageVideoRef.current) return;

    const container = stageVideoRef.current;

    const clearStage = () => {
      container.innerHTML = "";
    };

    if (!stageVideoTrack) {
      clearStage();
      return;
    }

    const scheduleRetry = (attempt: number, error: unknown) => {
      pushDebug("stage play error", { attempt, error: toErrorText(error) });
      if (attempt < STAGE_PLAY_MAX_RETRY) {
        stagePlayTimerRef.current = window.setTimeout(
          () => playWithRetry(attempt + 1),
          STAGE_PLAY_RETRY_MS
        );
      }
    };

    const playWithRetry = (attempt: number) => {
      if (!stageVideoRef.current) return;
      try {
        clearStage();
        const playResult = stageVideoTrack.play(stageVideoRef.current);
        Promise.resolve(playResult)
          .then(() => {
            pushDebug("stage play success", { attempt });
          })
          .catch((error) => {
            scheduleRetry(attempt, error);
          });
      } catch (error) {
        scheduleRetry(attempt, error);
      }
    };

    playWithRetry(0);

    return () => {
      if (stagePlayTimerRef.current) {
        clearTimeout(stagePlayTimerRef.current);
        stagePlayTimerRef.current = null;
      }
      clearStage();
    };
  }, [pushDebug, stageVideoTrack]);

  const sortedParticipants = useMemo(
    () => sortStudents(state.participants, studentStatuses),
    [state.participants, studentStatuses]
  );

  const stageParticipant = useMemo(() => {
    if (stageUserId) {
      return (
        state.participants.find(
          (participant) => normalizeUid(participant.user_id) === stageUserId
        ) || null
      );
    }
    const teacherParticipant = state.participants.find((participant) => participant.is_teacher);
    return teacherParticipant || null;
  }, [stageUserId, state.participants]);

  const stageName = useMemo(() => {
    if (stageParticipant?.user_name) return stageParticipant.user_name;
    const meName = `${me?.first_name || ""} ${me?.last_name || ""}`.trim();
    return meName || me?.username || t("live.room.lecturer");
  }, [me?.first_name, me?.last_name, me?.username, stageParticipant?.user_name, t]);

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
          {!stageVideoTrack && <div className="stage-empty">{t("live.room.noVideo")}</div>}
          <div className="stage-overlay">
            <div className="stage-top-info">
              <div className="stage-title">{roomMeta?.roomName || t("live.room.defaultRoomTitle")}</div>
              <div className="stage-subtitle">
                {t("live.room.participants", { count: state.participants.length })}
                {monitoringIsConnected ? ` | ${t("live.room.monitoringActive")}` : ""}
              </div>
            </div>
            <div className="stage-bottom-info">
              <div className="stage-user-label">
                {getInitials(stageName)} | {stageName}
              </div>
            </div>
          </div>

          {debugEnabled && (
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                width: 360,
                maxHeight: 220,
                overflow: "auto",
                background: "rgba(0,0,0,0.72)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 8,
                padding: 10,
                fontSize: 12,
                lineHeight: 1.4,
                pointerEvents: "auto",
              }}
            >
              <div><strong>debug_live</strong></div>
              <div>role: {me?.role || "-"}</div>
              <div>local_uid: {localUserUid || "-"}</div>
              <div>app_id: {tokenMeta?.appId || "-"}</div>
              <div>token_uid: {tokenMeta?.uid || "-"}</div>
              <div>channel: {tokenMeta?.channel || "-"}</div>
              <div>local_video_track: {localVideoRef.current ? "yes" : "no"}</div>
              <div>remote_video_count: {videoTracksMap.current.size}</div>
              <div>stage_user_id: {stageUserId || "-"}</div>
              <div>resolved_stage_user_id: {liveState?.resolved_stage_user_id ?? "-"}</div>
              <div>participants: {state.participants.length}</div>
              <div style={{ marginTop: 6, opacity: 0.9 }}>
                last_event: {debugEvents[0] || "-"}
              </div>
            </div>
          )}
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
