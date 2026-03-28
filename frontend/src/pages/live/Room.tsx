import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ILocalAudioTrack,
  ILocalVideoTrack,
  IRemoteVideoTrack,
} from "agora-rtc-sdk-ng";
import { Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  AudioOutlined,
  AudioMutedOutlined,
  DesktopOutlined,
  VideoCameraOutlined,
  StopOutlined,
  HighlightOutlined,
  LogoutOutlined,
  RollbackOutlined,
  TeamOutlined,
} from "@ant-design/icons";

import {
  fetchAgoraToken,
  fetchLiveState,
  joinLiveLesson,
  leaveLiveRoom,
  raiseHand,
  sendLiveHeartbeat,
  sendLiveLeaveKeepalive,
  setStageUser,
} from "../../api/live";
import type { LiveParticipantState } from "../../api/live";
import { useMe } from "../../hooks/useMe";
import { Button } from "../../components/ui";

import SidePanel from "./components/SidePanel";
import StudentGridSection from "./components/StudentGridSection";
import { useFaceVerification, useStudentMonitoring } from "./hooks/useFaceVerification";
import {
  getStudentAttendanceNote,
  getStudentEligibilityBadge,
  getStudentMetricChips,
  resolveStudentGroup,
  resolveVisualStatus,
  sortStudents,
  summarizeEligibility,
  getFaceStatusDisplay,
} from "./utils/studentSorting";
import i18next from "../../i18n";

import "./Room_NEW.css";

const fallbackAgoraAppId = import.meta.env.VITE_AGORA_APP_ID as string | undefined;
const FACE_VERIFY_INTERVAL_MS = 5000;
const PARTICIPANT_HEARTBEAT_MS = 15000;
const STAGE_PLAY_RETRY_MS = 180;
const STAGE_PLAY_MAX_RETRY = 2;
const SIDEBAR_ACTIVE_VIDEO_CAP = 10;
const REMOTE_TRACK_RECOVERY_INTERVAL_MS = 12000;
const MONITORING_STALE_THRESHOLD_MS = 15000;
const VIDEO_RECOVERY_BACKOFF_MS = [400, 900, 1800] as const;
const CAMERA_ENCODER_CONFIG = {
  width: 1280,
  height: 720,
  frameRate: 24,
  bitrateMin: 900,
  bitrateMax: 2200,
} as const;
const LOW_STREAM_PARAMETER = {
  width: 320,
  height: 180,
  framerate: 15,
  bitrate: 240,
} as const;

interface RoomState {
  connected: boolean;
  loading: boolean;
  error: string | null;
  stageUser: string | null;
  participants: LiveParticipantState[];
  cameraOn: boolean;
  micOn: boolean;
  screenSharing: boolean;
  handRaised: boolean;
  showStudentsGrid: boolean;
}

interface RoomMeta {
  roomId: number;
  roomName: string;
  subjectName: string;
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
    screenSharing: false,
    handRaised: false,
    showStudentsGrid: false,
  });
  const [roomMeta, setRoomMeta] = useState<RoomMeta | null>(null);
  const [trackVersion, setTrackVersion] = useState(0);
  const [localTrackVersion, setLocalTrackVersion] = useState(0);
  const [tokenMeta, setTokenMeta] = useState<TokenMeta | null>(null);
  const [debugEvents, setDebugEvents] = useState<string[]>([]);
  const [videoPublished, setVideoPublished] = useState(false);
  const [publishRetries, setPublishRetries] = useState(0);
  const [cameraStreamUnavailable, setCameraStreamUnavailable] = useState(false);
  const [localTrackReadyState, setLocalTrackReadyState] = useState("-");
  const [stageMountVersion, setStageMountVersion] = useState(0);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024
  );

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoRef = useRef<ILocalVideoTrack | null>(null);
  const localAudioRef = useRef<ILocalAudioTrack | null>(null);
  const screenVideoRef = useRef<ILocalVideoTrack | null>(null);
  const videoTracksMap = useRef<Map<string, IRemoteVideoTrack>>(new Map());
  const remoteStreamTypeMapRef = useRef<Map<string, 0 | 1>>(new Map());
  const videoSubscribeInFlightRef = useRef<Set<string>>(new Set());
  const audioSubscribeInFlightRef = useRef<Set<string>>(new Set());
  const stageVideoRef = useRef<HTMLDivElement | null>(null);
  const captureIntervalRef = useRef<number | null>(null);
  const captureVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const stagePlayTimerRef = useRef<number | null>(null);
  const subscribeRemoteUserRef = useRef<(
    (user: IAgoraRTCRemoteUser, mediaType?: "audio" | "video") => Promise<void>
  ) | null>(null);
  const localTrackEndedHandlerRef = useRef<(() => void) | null>(null);
  const screenTrackEndedHandlerRef = useRef<(() => void) | null>(null);
  const videoPublishedRef = useRef(false);
  const publishRecoveryInFlightRef = useRef(false);
  const cameraOnRef = useRef(true);
  const initialPublishDoneRef = useRef(false);

  const setStageVideoContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (stageVideoRef.current === node) return;
    stageVideoRef.current = node;
    setStageMountVersion((prev) => prev + 1);
  }, []);

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
  const createOptimizedCameraTrack = useCallback(async () => {
    try {
      return await AgoraRTC.createCameraVideoTrack({
        encoderConfig: CAMERA_ENCODER_CONFIG,
      });
    } catch (error) {
      pushDebug("optimized camera init failed, fallback default", toErrorText(error));
      return AgoraRTC.createCameraVideoTrack();
    }
  }, [pushDebug]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop) {
        setState((prev) =>
          prev.showStudentsGrid ? { ...prev, showStudentsGrid: false } : prev
        );
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const roomName = roomMeta?.roomName ?? "";
  const {
    connected: faceConnected,
    wsUnavailable: faceWsUnavailable,
    verifyFrame,
    localFaceStatus,
  } = useFaceVerification(roomName, Boolean(state.connected && roomName && !isTeacher));
  const {
    studentStatuses: monitoringStatuses,
    connected: monitoringConnected,
    requestUpdate: requestMonitoringUpdate,
    roomState: monitoringRoomState,
    lastStatusEventAt,
    lastStatusReason,
    lastRoomStateEventAt,
  } = useStudentMonitoring(roomName, Boolean(state.connected && roomName && isTeacher));

  // Merge the local user's live face status into the shared map so their own tile gets a border
  const studentStatuses = useMemo(() => {
    const myId = me?.id;
    if (!myId || localFaceStatus === "CHECKING") return monitoringStatuses;
    const merged = new Map(monitoringStatuses);
    const existing = merged.get(myId);
    merged.set(myId, {
      faceStatus: localFaceStatus,
      confidence: localFaceStatus === "DETECTED" ? 1.0 : 0.0,
      handRaised: existing?.handRaised ?? false,
      audioEnabled: existing?.audioEnabled ?? false,
      timestamp: Date.now(),
      statusReason: existing?.statusReason,
      lastVerifiedAt: existing?.lastVerifiedAt ?? null,
      successRate: existing?.successRate ?? null,
      attendanceStatus: existing?.attendanceStatus ?? null,
      attendanceRatio: existing?.attendanceRatio ?? null,
      attendanceSamples: existing?.attendanceSamples ?? null,
      joinedSeconds: existing?.joinedSeconds ?? null,
      joinedRatio: existing?.joinedRatio ?? null,
      eligibilityStatus: existing?.eligibilityStatus ?? null,
      eligibilityReason: existing?.eligibilityReason ?? null,
    });
    return merged;
  }, [monitoringStatuses, localFaceStatus, me?.id]);

  useEffect(() => {
    cameraOnRef.current = state.cameraOn;
  }, [state.cameraOn]);

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
    refetchInterval: monitoringConnected ? 30000 : 5000,
  });

  useEffect(() => {
    if (monitoringConnected && monitoringRoomState) return;
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
  }, [liveState, localUserUid, monitoringConnected, monitoringRoomState, pushDebug]);

  useEffect(() => {
    if (!monitoringRoomState) return;
    const resolvedStageUserId =
      monitoringRoomState.stage_user_id ?? monitoringRoomState.resolved_stage_user_id ?? null;

    setState((prev) => {
      const currentParticipant = monitoringRoomState.participants.find(
        (participant) => normalizeUid(participant.user_id) === localUserUid
      );
      return {
        ...prev,
        participants: monitoringRoomState.participants,
        stageUser: resolvedStageUserId ? normalizeUid(resolvedStageUserId) : null,
        handRaised: Boolean(currentParticipant?.hand_raised),
      };
    });

    pushDebug("room_state_update", {
      participants: monitoringRoomState.participants.length,
      stage_user_id: monitoringRoomState.stage_user_id,
      resolved_stage_user_id: monitoringRoomState.resolved_stage_user_id,
    });
  }, [localUserUid, monitoringRoomState, pushDebug]);

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
          subjectName:
            (roomData as { lesson_topic?: string; subject_name?: string }).subject_name ||
            (roomData as { lesson_topic?: string; subject_name?: string }).lesson_topic ||
            roomData.room,
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
        initialPublishDoneRef.current = false;
        remoteStreamTypeMapRef.current.clear();

        try {
          client.setLowStreamParameter(LOW_STREAM_PARAMETER);
        } catch (error) {
          pushDebug("set low stream parameter failed", toErrorText(error));
        }
        await client.enableDualStream().catch((error) => {
          pushDebug("enable dual stream failed", toErrorText(error));
        });
        await client.setRemoteDefaultVideoStreamType(1).catch((error) => {
          pushDebug("set default remote stream type failed", toErrorText(error));
        });

        const sleep = (ms: number) =>
          new Promise<void>((resolve) => {
            window.setTimeout(resolve, ms);
          });

        const detachTrackEndedHandler = (track: ILocalVideoTrack | null) => {
          const handler = localTrackEndedHandlerRef.current;
          if (!track || !handler) return;
          const trackWithEvents = track as unknown as {
            off?: (event: string, cb: () => void) => void;
          };
          trackWithEvents.off?.("track-ended", handler);
        };

        const bindLocalVideoTrack = (track: ILocalVideoTrack, debugLabel: string) => {
          const previousTrack = localVideoRef.current;
          if (previousTrack && previousTrack !== track) {
            detachTrackEndedHandler(previousTrack);
          }
          localVideoRef.current = track;
          const readyState = track.getMediaStreamTrack?.()?.readyState ?? "unknown";
          setLocalTrackReadyState(readyState);
          setLocalTrackVersion((prev) => prev + 1);
          pushDebug(debugLabel, { readyState });
        };

        const attachTrackEndedHandler = (track: ILocalVideoTrack) => {
          const onTrackEnded = () => {
            setLocalTrackReadyState("ended");
            videoPublishedRef.current = false;
            setVideoPublished(false);
            setCameraStreamUnavailable(true);
            pushDebug("local video track ended");
            void republishVideoTrack("track-ended");
          };
          localTrackEndedHandlerRef.current = onTrackEnded;
          const trackWithEvents = track as unknown as {
            on?: (event: string, cb: () => void) => void;
          };
          trackWithEvents.on?.("track-ended", onTrackEnded);
        };

        const syncRemoteVideoTrack = (user: IAgoraRTCRemoteUser, label: string) => {
          const remoteUid = normalizeUid(user.uid);
          if (user.videoTrack) {
            videoTracksMap.current.set(remoteUid, user.videoTrack);
            console.debug("[Room] Video track synced:", { remoteUid, label, hasTrack: true });
            setTrackVersion((prev) => prev + 1);
            pushDebug(label, { uid: remoteUid, hasVideoTrack: true });
            return;
          }
          videoTracksMap.current.delete(remoteUid);
          console.debug("[Room] Video track removed:", { remoteUid, label, hasTrack: false });
          setTrackVersion((prev) => prev + 1);
          pushDebug(label, { uid: remoteUid, hasVideoTrack: false });
        };

        const subscribeRemoteUser = async (
          user: IAgoraRTCRemoteUser,
          mediaType?: "audio" | "video"
        ) => {
          const remoteUid = normalizeUid(user.uid);
          try {
            const shouldTryVideo = mediaType !== "audio";
            const shouldTryAudio =
              mediaType === "audio" ||
              (!mediaType && (Boolean(user.audioTrack) || Boolean(user.hasAudio)));

            if (shouldTryVideo) {
              const existingTrack = videoTracksMap.current.get(remoteUid);
              const alreadySyncedVideo = Boolean(existingTrack && user.videoTrack);
              if (alreadySyncedVideo) {
                syncRemoteVideoTrack(user, "video already subscribed");
              }
              const videoInFlight = videoSubscribeInFlightRef.current;
              if (!alreadySyncedVideo && !videoInFlight.has(remoteUid)) {
                videoInFlight.add(remoteUid);
                try {
                  console.debug("[Room] Subscribing to video:", { remoteUid });
                  await client.subscribe(user, "video");
                  console.debug("[Room] Video subscribe success:", { remoteUid, hasTrack: !!user.videoTrack });
                  syncRemoteVideoTrack(user, "video subscribed");
                } catch (subscribeError) {
                  console.error("[Room] Video subscribe failed:", { remoteUid, error: toErrorText(subscribeError) });
                  throw subscribeError;
                } finally {
                  videoInFlight.delete(remoteUid);
                }
              }
            }

            if (shouldTryAudio) {
              const currentAudioTrack = user.audioTrack;
              if (currentAudioTrack) {
                currentAudioTrack.play();
              }
              const audioInFlight = audioSubscribeInFlightRef.current;
              if (!currentAudioTrack && !audioInFlight.has(remoteUid)) {
                audioInFlight.add(remoteUid);
                try {
                  await client.subscribe(user, "audio");
                  const subscribedAudioTrack = user.audioTrack;
                  if (subscribedAudioTrack) {
                    subscribedAudioTrack.play();
                  }
                } finally {
                  audioInFlight.delete(remoteUid);
                }
              }
            }
          } catch (error) {
            pushDebug("subscribe error", { uid: remoteUid, mediaType, error: toErrorText(error) });
          }
        };
        subscribeRemoteUserRef.current = subscribeRemoteUser;

        const refreshAgoraToken = async (reason: string) => {
          try {
            const refreshed = await fetchAgoraToken({
              room_id: roomData.room_id,
              lesson_id: Number(lessonId),
            });
            if (!refreshed.token) {
              pushDebug("token refresh skipped: empty token", { reason });
              return;
            }
            await client.renewToken(refreshed.token);
            pushDebug("token renewed", {
              reason,
              expires_in: refreshed.expires_in,
            });
          } catch (error) {
            pushDebug("token renew failed", { reason, error: toErrorText(error) });
          }
        };

        async function republishVideoTrack(reason: string): Promise<boolean> {
          if (publishRecoveryInFlightRef.current || cancelled) return false;
          const activeClient = clientRef.current;
          if (!activeClient) return false;

          publishRecoveryInFlightRef.current = true;
          videoPublishedRef.current = false;
          setVideoPublished(false);
          setCameraStreamUnavailable(true);

          for (let attempt = 0; attempt < VIDEO_RECOVERY_BACKOFF_MS.length; attempt += 1) {
            const retryNumber = attempt + 1;
            setPublishRetries(retryNumber);
            try {
              const oldTrack = localVideoRef.current;
              if (oldTrack) {
                detachTrackEndedHandler(oldTrack);
                await activeClient.unpublish(oldTrack).catch(() => undefined);
                oldTrack.close();
                localVideoRef.current = null;
                setLocalTrackReadyState("recovering");
                setLocalTrackVersion((prev) => prev + 1);
              }

              const freshVideoTrack = await createOptimizedCameraTrack();
              await freshVideoTrack.setEnabled(true).catch(() => undefined);
              attachTrackEndedHandler(freshVideoTrack);
              bindLocalVideoTrack(freshVideoTrack, "local video track recovered");

              await activeClient.publish(freshVideoTrack);
              videoPublishedRef.current = true;
              setVideoPublished(true);
              setCameraStreamUnavailable(false);
              pushDebug("video republish success", { reason, retry: retryNumber });
              publishRecoveryInFlightRef.current = false;
              return true;
            } catch (republishError) {
              pushDebug("video republish attempt failed", {
                reason,
                retry: retryNumber,
                error: toErrorText(republishError),
              });
              if (attempt < VIDEO_RECOVERY_BACKOFF_MS.length - 1) {
                await sleep(VIDEO_RECOVERY_BACKOFF_MS[attempt]);
              }
            }
          }

          pushDebug("video republish exhausted", { reason });
          publishRecoveryInFlightRef.current = false;
          return false;
        }

        client.on("user-published", async (user: IAgoraRTCRemoteUser, mediaType) => {
          if (mediaType === "video" || mediaType === "audio") {
            pushDebug("user-published", { uid: normalizeUid(user.uid), mediaType });
            await subscribeRemoteUser(user, mediaType);
          }
        });

        client.on("user-joined", (user: IAgoraRTCRemoteUser) => {
          pushDebug("user-joined", { uid: normalizeUid(user.uid) });
        });

        client.on("user-unpublished", (user: IAgoraRTCRemoteUser, mediaType) => {
          if (mediaType === "video") {
            const remoteUid = normalizeUid(user.uid);
            videoTracksMap.current.delete(remoteUid);
            remoteStreamTypeMapRef.current.delete(remoteUid);
            videoSubscribeInFlightRef.current.delete(remoteUid);
            setTrackVersion((prev) => prev + 1);
            pushDebug("user-unpublished", { uid: remoteUid, mediaType });
            return;
          }
          if (mediaType === "audio") {
            audioSubscribeInFlightRef.current.delete(normalizeUid(user.uid));
          }
        });

        client.on("user-left", (user: IAgoraRTCRemoteUser) => {
          const remoteUid = normalizeUid(user.uid);
          videoTracksMap.current.delete(remoteUid);
          remoteStreamTypeMapRef.current.delete(remoteUid);
          videoSubscribeInFlightRef.current.delete(remoteUid);
          audioSubscribeInFlightRef.current.delete(remoteUid);
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
            if (remoteUser && remoteUser.hasVideo && !videoTracksMap.current.has(normalized)) {
              void subscribeRemoteUser(remoteUser, "video");
            }
          }) as (...args: any[]) => void
        );

        client.on("connection-state-change", ((currentState: unknown, previousState: unknown, reason: unknown) => {
          pushDebug("connection-state-change", {
            previous: previousState,
            current: currentState,
            reason,
          });
          if (
            String(currentState) === "CONNECTED" &&
            initialPublishDoneRef.current &&
            cameraOnRef.current &&
            !screenVideoRef.current &&
            !videoPublishedRef.current
          ) {
            void republishVideoTrack("connection-state-change");
          }
        }) as (...args: any[]) => void);

        client.on("token-privilege-will-expire", (() => {
          void refreshAgoraToken("will-expire");
        }) as (...args: any[]) => void);

        client.on("token-privilege-did-expire", (() => {
          void refreshAgoraToken("did-expire");
        }) as (...args: any[]) => void);

        await client.join(resolvedAppId, tokenData.channel, tokenData.token, tokenData.uid || null);
        pushDebug("joined channel", { channel: tokenData.channel, uid: tokenUid || "(empty)" });

        pushDebug("initial remote scan", { count: client.remoteUsers.length });
        const initialResults = await Promise.allSettled(client.remoteUsers.map((remoteUser) => subscribeRemoteUser(remoteUser)));
        const initialErrors = initialResults.filter(r => r.status === 'rejected');
        if (initialErrors.length > 0) {
          console.error("[Room] Initial subscribe errors:", initialErrors.map(e => ('reason' in e) ? e.reason : 'unknown'));
          pushDebug("initial subscribe errors", { count: initialErrors.length });
        }
        console.debug("[Room] Initial subscribe results:", { total: initialResults.length, succeeded: initialResults.filter(r => r.status === 'fulfilled').length });

        const videoTrack = await createOptimizedCameraTrack();
        await videoTrack.setEnabled(true).catch(() => undefined);
        attachTrackEndedHandler(videoTrack);
        bindLocalVideoTrack(videoTrack, "local video track created");

        let audioTrack: ILocalAudioTrack | null = null;
        try {
          audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        } catch (audioError) {
          pushDebug("audio track init error", toErrorText(audioError));
          audioTrack = null;
        }
        localAudioRef.current = audioTrack;

        await client.publish(videoTrack);
        pushDebug("local video published");

        if (audioTrack) {
          try {
            await client.publish(audioTrack);
            pushDebug("local audio published");
          } catch (audioPublishError) {
            pushDebug("local audio publish failed, continue video-only", toErrorText(audioPublishError));
            audioTrack.close();
            localAudioRef.current = null;
            audioTrack = null;
          }
        }

        videoPublishedRef.current = true;
        initialPublishDoneRef.current = true;
        setVideoPublished(true);
        setPublishRetries(0);
        setCameraStreamUnavailable(false);

        if (audioTrack && !isTeacher) {
          await audioTrack.setEnabled(false);
          pushDebug("student mic disabled after publish");
        }

        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          connected: true,
          loading: false,
          error: null,
          cameraOn: true,
          micOn: Boolean(isTeacher && audioTrack),
          screenSharing: false,
        }));
      } catch (error: unknown) {
        const message = getErrorMessage(error, t("live.errors.joinFailed"));
        pushDebug("initialize error", { message, raw: toErrorText(error) });
        videoPublishedRef.current = false;
        setVideoPublished(false);
        setCameraStreamUnavailable(true);
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
      if (localVideoRef.current && localTrackEndedHandlerRef.current) {
        const trackWithEvents = localVideoRef.current as unknown as {
          off?: (event: string, cb: () => void) => void;
        };
        trackWithEvents.off?.("track-ended", localTrackEndedHandlerRef.current);
      }
      localVideoRef.current?.close();
      localAudioRef.current?.close();
      if (screenVideoRef.current && screenTrackEndedHandlerRef.current) {
        const trackWithEvents = screenVideoRef.current as unknown as {
          off?: (event: string, cb: () => void) => void;
        };
        trackWithEvents.off?.("track-ended", screenTrackEndedHandlerRef.current);
      }
      screenVideoRef.current?.close();
      screenTrackEndedHandlerRef.current = null;
      videoTracksMap.current.clear();
      remoteStreamTypeMapRef.current.clear();
      videoSubscribeInFlightRef.current.clear();
      audioSubscribeInFlightRef.current.clear();
      subscribeRemoteUserRef.current = null;
      videoPublishedRef.current = false;
      publishRecoveryInFlightRef.current = false;
      localTrackEndedHandlerRef.current = null;
      initialPublishDoneRef.current = false;
      clientRef.current?.removeAllListeners();
      clientRef.current?.leave().catch(() => undefined);
      clientRef.current = null;
    };
  }, [createOptimizedCameraTrack, isTeacher, lessonId, localUserUid, me?.id, pushDebug, t]);

  useEffect(() => {
    if (!state.connected || !roomMeta?.roomId) return;

    let cancelled = false;
    const sendHeartbeat = async () => {
      try {
        await sendLiveHeartbeat(roomMeta.roomId);
      } catch (error) {
        if (!cancelled) {
          pushDebug("participant heartbeat failed", toErrorText(error));
        }
      }
    };

    void sendHeartbeat();
    const interval = window.setInterval(() => {
      void sendHeartbeat();
    }, PARTICIPANT_HEARTBEAT_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pushDebug, roomMeta?.roomId, state.connected]);

  useEffect(() => {
    if (!state.connected || !roomMeta?.roomId) return;

    const sendBestEffortLeave = () => {
      sendLiveLeaveKeepalive(roomMeta.roomId);
    };

    window.addEventListener("pagehide", sendBestEffortLeave);
    window.addEventListener("beforeunload", sendBestEffortLeave);

    return () => {
      window.removeEventListener("pagehide", sendBestEffortLeave);
      window.removeEventListener("beforeunload", sendBestEffortLeave);
    };
  }, [roomMeta?.roomId, state.connected]);

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
    if (monitoringConnected) {
      requestMonitoringUpdate();
    }
  }, [monitoringConnected, requestMonitoringUpdate, roomMeta?.roomId, state.connected]);

  useEffect(() => {
    if (!isTeacher || !monitoringConnected) return;

    const interval = window.setInterval(() => {
      const last = lastStatusEventAt ? Date.parse(lastStatusEventAt) : 0;
      const stale = !last || Number.isNaN(last) || Date.now() - last >= MONITORING_STALE_THRESHOLD_MS;
      if (stale) {
        requestMonitoringUpdate();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isTeacher, lastStatusEventAt, monitoringConnected, requestMonitoringUpdate]);

  useEffect(() => {
    if (!state.connected) return;
    const interval = window.setInterval(() => {
      const client = clientRef.current;
      const subscribeRemoteUser = subscribeRemoteUserRef.current;
      if (!client || !subscribeRemoteUser) return;
      if ((client as { connectionState?: string }).connectionState !== "CONNECTED") return;

      const missingVideoUsers = client.remoteUsers.filter(
        (remoteUser) =>
          (remoteUser.hasVideo || Boolean(remoteUser.videoTrack)) &&
          !videoTracksMap.current.has(normalizeUid(remoteUser.uid))
      );
      if (!missingVideoUsers.length) return;

      pushDebug("recover missing remote tracks", { count: missingVideoUsers.length });
      missingVideoUsers.forEach((remoteUser) => {
        void subscribeRemoteUser(remoteUser, "video");
      });
    }, REMOTE_TRACK_RECOVERY_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [pushDebug, state.connected]);

  const stageUserId = state.stageUser;
  const isStageUser = Boolean(stageUserId && stageUserId === localUserUid);
  const teacherStageOwnerId = useMemo(() => {
    const localTeacher = state.participants.find(
      (participant) =>
        participant.is_teacher && normalizeUid(participant.user_id) === localUserUid
    );
    if (localTeacher) return localTeacher.user_id;
    const anyTeacher = state.participants.find((participant) => participant.is_teacher);
    return anyTeacher ? anyTeacher.user_id : null;
  }, [localUserUid, state.participants]);
  const teacherStageOwnerUid = teacherStageOwnerId
    ? normalizeUid(teacherStageOwnerId)
    : null;
  const canReturnStageToTeacher = Boolean(
    isTeacher &&
    stageUserId &&
    teacherStageOwnerUid &&
    stageUserId !== teacherStageOwnerUid
  );
  const canShareScreen = Boolean(state.connected && isStageUser);

  useEffect(() => {
    if (!state.connected) return;
    const client = clientRef.current;
    if (!client) return;
    if ((client as { connectionState?: string }).connectionState !== "CONNECTED") return;

    const teacherParticipant = state.participants.find((participant) => participant.is_teacher);
    const preferredHighUid =
      stageUserId || (teacherParticipant ? normalizeUid(teacherParticipant.user_id) : null);
    if (!preferredHighUid) return;

    const syncStreamPriority = async () => {
      await Promise.allSettled(
        client.remoteUsers.map(async (remoteUser) => {
          const remoteUid = normalizeUid(remoteUser.uid);
          const nextType: 0 | 1 = remoteUid === preferredHighUid ? 0 : 1;
          const prevType = remoteStreamTypeMapRef.current.get(remoteUid);
          if (prevType === nextType) return;

          try {
            await client.setRemoteVideoStreamType(remoteUser.uid, nextType);
            remoteStreamTypeMapRef.current.set(remoteUid, nextType);
          } catch (error) {
            pushDebug("set remote stream type failed", {
              uid: remoteUid,
              streamType: nextType,
              error: toErrorText(error),
            });
          }
        })
      );
    };

    void syncStreamPriority();
  }, [pushDebug, stageUserId, state.connected, state.participants, trackVersion]);

  useEffect(() => {
    if (isTeacher) return;
    const audioTrack = localAudioRef.current;
    if (!audioTrack) return;
    void audioTrack.setEnabled(isStageUser);
    setState((prev) => ({ ...prev, micOn: isStageUser }));
  }, [isTeacher, isStageUser]);

  useEffect(() => {
    // Teacher and student both send frames: teacher → presence-only, student → embedding compare
    if (!state.connected || !faceConnected) return;
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
  }, [faceConnected, state.connected, verifyFrame, localTrackVersion]);

  const detachScreenTrackEndedHandler = useCallback((track: ILocalVideoTrack | null) => {
    const handler = screenTrackEndedHandlerRef.current;
    if (!track || !handler) return;
    const trackWithEvents = track as unknown as {
      off?: (event: string, cb: () => void) => void;
    };
    trackWithEvents.off?.("track-ended", handler);
  }, []);

  const stopScreenShare = useCallback(
    async (reason: string, restoreCamera: boolean) => {
      const client = clientRef.current;
      const screenTrack = screenVideoRef.current;
      if (!screenTrack) return;

      detachScreenTrackEndedHandler(screenTrack);
      screenVideoRef.current = null;
      screenTrackEndedHandlerRef.current = null;

      try {
        if (client) {
          await client.unpublish(screenTrack).catch(() => undefined);
        }
      } catch (error) {
        pushDebug("screen unpublish error", toErrorText(error));
      }
      screenTrack.close();

      setState((prev) => ({ ...prev, screenSharing: false }));
      setLocalTrackVersion((prev) => prev + 1);
      pushDebug("screen share stopped", { reason });

      if (
        restoreCamera &&
        client &&
        state.connected &&
        cameraOnRef.current &&
        localVideoRef.current
      ) {
        try {
          await client.publish(localVideoRef.current);
          videoPublishedRef.current = true;
          setVideoPublished(true);
          setCameraStreamUnavailable(false);
          setPublishRetries(0);
          pushDebug("camera republished after screen share");
        } catch (error) {
          videoPublishedRef.current = false;
          setVideoPublished(false);
          setCameraStreamUnavailable(true);
          pushDebug("camera republish after screen share failed", toErrorText(error));
        }
      }
    },
    [detachScreenTrackEndedHandler, pushDebug, state.connected]
  );

  const handleScreenShareToggle = useCallback(async () => {
    if (!state.connected || !isStageUser) return;
    const client = clientRef.current;
    if (!client) return;

    if (screenVideoRef.current) {
      await stopScreenShare("manual-stop", true);
      return;
    }

    try {
      const screenTrackResult = await AgoraRTC.createScreenVideoTrack({});
      const screenTrack = Array.isArray(screenTrackResult)
        ? screenTrackResult[0]
        : screenTrackResult;

      const onTrackEnded = () => {
        void stopScreenShare("track-ended", true);
      };
      screenTrackEndedHandlerRef.current = onTrackEnded;
      const trackWithEvents = screenTrack as unknown as {
        on?: (event: string, cb: () => void) => void;
      };
      trackWithEvents.on?.("track-ended", onTrackEnded);

      if (videoPublishedRef.current && localVideoRef.current) {
        await client.unpublish(localVideoRef.current).catch(() => undefined);
        videoPublishedRef.current = false;
        setVideoPublished(false);
      }

      await client.publish(screenTrack);
      screenVideoRef.current = screenTrack;
      setState((prev) => ({ ...prev, screenSharing: true }));
      setLocalTrackVersion((prev) => prev + 1);
      pushDebug("screen share started");
    } catch (error) {
      pushDebug("screen share start error", toErrorText(error));
    }
  }, [isStageUser, pushDebug, state.connected, stopScreenShare]);

  useEffect(() => {
    if (!screenVideoRef.current) return;
    if (state.connected && isStageUser) return;
    void stopScreenShare("stage-access-revoked", true);
  }, [isStageUser, state.connected, stopScreenShare]);

  const handleCameraToggle = useCallback(async () => {
    const videoTrack = localVideoRef.current;
    if (!videoTrack) return;

    const next = !state.cameraOn;
    try {
      await videoTrack.setEnabled(next);
      setState((prev) => ({ ...prev, cameraOn: next }));
      setLocalTrackReadyState(videoTrack.getMediaStreamTrack?.()?.readyState ?? "unknown");
      if (!next) {
        setCameraStreamUnavailable(false);
      }
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
        requestMonitoringUpdate();
        pushDebug("set stage user", { userId });
      } catch (error) {
        pushDebug("set stage error", toErrorText(error));
      }
    },
    [isTeacher, pushDebug, requestMonitoringUpdate, roomMeta?.roomId]
  );

  const handleReturnStageToTeacher = useCallback(async () => {
    if (!isTeacher || !roomMeta?.roomId || !teacherStageOwnerId) return;
    try {
      await setStageUser(roomMeta.roomId, null);
      setState((prev) => ({
        ...prev,
        stageUser: normalizeUid(teacherStageOwnerId),
      }));
      requestMonitoringUpdate();
      pushDebug("stage reset to teacher", { userId: teacherStageOwnerId });
    } catch (error) {
      pushDebug("stage reset failed", toErrorText(error));
    }
  }, [isTeacher, pushDebug, requestMonitoringUpdate, roomMeta?.roomId, teacherStageOwnerId]);

  const handleExitRoom = useCallback(async () => {
    try {
      if (screenVideoRef.current) {
        await stopScreenShare("leave-room", false);
      }
      if (roomMeta?.roomId) {
        await leaveLiveRoom(roomMeta.roomId);
      }
    } catch (error) {
      pushDebug("leave room error", toErrorText(error));
    } finally {
      if (localVideoRef.current && localTrackEndedHandlerRef.current) {
        const trackWithEvents = localVideoRef.current as unknown as {
          off?: (event: string, cb: () => void) => void;
        };
        trackWithEvents.off?.("track-ended", localTrackEndedHandlerRef.current);
      }
      localVideoRef.current?.close();
      localAudioRef.current?.close();
      if (screenVideoRef.current && screenTrackEndedHandlerRef.current) {
        const trackWithEvents = screenVideoRef.current as unknown as {
          off?: (event: string, cb: () => void) => void;
        };
        trackWithEvents.off?.("track-ended", screenTrackEndedHandlerRef.current);
      }
      screenVideoRef.current?.close();
      screenVideoRef.current = null;
      screenTrackEndedHandlerRef.current = null;
      videoPublishedRef.current = false;
      setVideoPublished(false);
      localTrackEndedHandlerRef.current = null;
      initialPublishDoneRef.current = false;
      await clientRef.current?.leave().catch(() => undefined);
      navigate(-1);
    }
  }, [navigate, pushDebug, roomMeta?.roomId, stopScreenShare]);

  const stageVideoTrack = useMemo(() => {
    const teacherParticipant = state.participants.find((participant) => participant.is_teacher);

    if (isTeacher && screenVideoRef.current) {
      return screenVideoRef.current;
    }

    if (isTeacher && state.cameraOn && localVideoRef.current) {
      return localVideoRef.current;
    }

    if (stageUserId) {
      const stageRemoteTrack = videoTracksMap.current.get(stageUserId);
      if (stageRemoteTrack) {
        return stageRemoteTrack;
      }
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
  }, [isTeacher, localTrackVersion, stageUserId, state.cameraOn, state.participants, trackVersion]);

  useEffect(() => {
    if (!state.connected) return;
    if (!stageVideoRef.current) return;

    const container = stageVideoRef.current;
    let localFallbackVideo: HTMLVideoElement | null = null;

    const clearStage = () => {
      if (localFallbackVideo) {
        localFallbackVideo.pause();
        localFallbackVideo.srcObject = null;
        localFallbackVideo = null;
      }
      container.innerHTML = "";
    };

    if (!stageVideoTrack) {
      clearStage();
      return;
    }

    const mountLocalPreview = () => {
      if (!isTeacher) return false;
      const localTrack = localVideoRef.current;
      if (!localTrack || stageVideoTrack !== localTrack) return false;

      const mediaTrack = localTrack.getMediaStreamTrack?.();
      if (!mediaTrack || !stageVideoRef.current) return false;

      clearStage();
      const videoElement = document.createElement("video");
      videoElement.autoplay = true;
      videoElement.muted = true;
      videoElement.playsInline = true;
      videoElement.srcObject = new MediaStream([mediaTrack]);
      videoElement.style.width = "100%";
      videoElement.style.height = "100%";
      videoElement.style.objectFit = "cover";
      videoElement.style.transform = "scaleX(-1)";
      stageVideoRef.current.appendChild(videoElement);
      localFallbackVideo = videoElement;
      Promise.resolve(videoElement.play()).catch(() => undefined);
      pushDebug("stage local preview mounted");
      return true;
    };

    const scheduleRetry = (attempt: number, error: unknown) => {
      pushDebug("stage play error", { attempt, error: toErrorText(error) });
      if (attempt < STAGE_PLAY_MAX_RETRY) {
        stagePlayTimerRef.current = window.setTimeout(
          () => playWithRetry(attempt + 1),
          STAGE_PLAY_RETRY_MS
        );
        return;
      }
      void mountLocalPreview();
    };

    const playWithRetry = (attempt: number) => {
      if (!stageVideoRef.current) return;
      if (mountLocalPreview()) return;
      try {
        clearStage();
        const playResult = stageVideoTrack.play(stageVideoRef.current, {
          fit: "cover",
          mirror: false,
        });
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
  }, [
    isTeacher,
    pushDebug,
    stageMountVersion,
    stageVideoTrack,
    state.connected,
  ]);

  const sortedParticipants = useMemo(
    () => sortStudents(state.participants, studentStatuses),
    [state.participants, studentStatuses]
  );

  const activeVideoUids = useMemo(() => {
    const visualPriority: Record<ReturnType<typeof resolveVisualStatus>, number> = {
      engaged: 0,
      unverified: 1,
      verified: 2,
      checking: 3,
    };

    const ranked = state.participants
      .filter((participant) => !participant.is_teacher)
      .map((participant) => {
        const status = studentStatuses.get(participant.user_id);
        const visualStatus = resolveVisualStatus(participant, status);
        const uid = normalizeUid(participant.user_id);
        const hasVideo = videoTracksMap.current.has(uid);
        return {
          uid,
          hasVideo,
          visualStatus,
          confidence: status?.confidence ?? 0,
          name: participant.user_name || "",
        };
      })
      .sort((a, b) => {
        if (a.hasVideo !== b.hasVideo) return a.hasVideo ? -1 : 1;
        const priorityDelta = visualPriority[a.visualStatus] - visualPriority[b.visualStatus];
        if (priorityDelta !== 0) return priorityDelta;
        if (a.confidence !== b.confidence) return b.confidence - a.confidence;
        return a.name.localeCompare(b.name, "uz", { sensitivity: "base" });
      });

    return new Set(
      ranked
        .slice(0, SIDEBAR_ACTIVE_VIDEO_CAP)
        .filter((entry) => entry.hasVideo)
        .map((entry) => entry.uid)
    );
  }, [state.participants, studentStatuses, trackVersion]);

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
  const stageStatus = useMemo(() => {
    if (!stageParticipant) return undefined;
    return studentStatuses.get(stageParticipant.user_id);
  }, [stageParticipant, studentStatuses]);
  const stageMetricChips = useMemo(
    () => (stageParticipant?.is_teacher ? [] : getStudentMetricChips(stageStatus)),
    [stageParticipant?.is_teacher, stageStatus]
  );
  const stageAttendanceNote = useMemo(
    () => (stageParticipant?.is_teacher ? "" : getStudentAttendanceNote(stageStatus)),
    [stageParticipant?.is_teacher, stageStatus]
  );
  const stageEligibilityBadge = useMemo(
    () => (stageParticipant?.is_teacher ? null : getStudentEligibilityBadge(stageStatus)),
    [stageParticipant?.is_teacher, stageStatus]
  );
  const stageFaceStatus = useMemo(() => {
    if (!stageParticipant || stageParticipant.is_teacher) return undefined;
    return stageStatus?.faceStatus || "CHECKING";
  }, [stageParticipant, stageStatus]);
  const stageFaceStatusDisplay = useMemo(() => {
    if (!stageFaceStatus) return undefined;
    return getFaceStatusDisplay(stageFaceStatus);
  }, [stageFaceStatus]);
  const eligibilitySummary = useMemo(
    () => summarizeEligibility(state.participants, studentStatuses),
    [state.participants, studentStatuses]
  );

  const showCameraUnavailable =
    isTeacher &&
    state.connected &&
    state.cameraOn &&
    !state.screenSharing &&
    (cameraStreamUnavailable || !localVideoRef.current || !videoPublished);
  const participantsPanelOpen = state.showStudentsGrid;
  const participantsCount = state.participants.length;
  const studentCount = sortedParticipants.length;
  const roomDisplayName = roomMeta?.roomName || t("live.room.defaultRoomTitle");
  const isDemoMode = useMemo(() => {
    const errorText = (state.error || "").toLowerCase();
    return errorText.includes("demo") || errorText.includes("invalid authorization token");
  }, [state.error]);
  const stageGroupLabel = useMemo(() => {
    if (!stageParticipant) return "";
    const group = resolveStudentGroup(stageParticipant);
    if (group && group !== "Guruh belgilanmagan") return group;
    return stageParticipant.is_teacher ? "O'qituvchi" : "Talaba";
  }, [stageParticipant]);

  return (
    <div className={`live-page ${isDesktop ? "sidebar-open" : "sidebar-closed"}`}>
      <header className="room-meta-bar">
        <div className="room-meta-main">
          <span className="room-meta-subject">{roomMeta?.subjectName || roomDisplayName}</span>
          <span className="room-meta-dot" />
          <span className="room-meta-date">
            {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>

        <div className="header-controls">
          {/* Face status (faqat talaba) */}
          {state.connected && !isTeacher && (
            <div className={`face-status-badge face-status-${
              faceWsUnavailable ? "unavailable"
              : !faceConnected ? "checking"
              : localFaceStatus.toLowerCase()
            }`}>
              <span className="face-status-dot" />
              <span className="face-status-label">
                {faceWsUnavailable
                  ? "AI xizmati mavjud emas"
                  : !faceConnected
                  ? "Ulanmoqda..."
                  : localFaceStatus === "DETECTED"
                  ? "Yuz aniqlandi ✓"
                  : localFaceStatus === "NOT_DETECTED"
                  ? "Yuz aniqlanmadi"
                  : localFaceStatus === "MULTIPLE"
                  ? "Ko'p yuz"
                  : "Tekshirilmoqda..."}
              </span>
            </div>
          )}

          <Button
            variant="ghost"
            className={`control-btn ${state.micOn ? "is-active" : "is-off"}`}
            onClick={handleMicToggle}
            icon={state.micOn ? <AudioOutlined /> : <AudioMutedOutlined />}
            disabled={!state.connected || (!isTeacher && !isStageUser)}
          />

          <Button
            variant="ghost"
            className={`control-btn ${state.cameraOn ? "is-active" : "is-off"}`}
            onClick={handleCameraToggle}
            icon={state.cameraOn ? <VideoCameraOutlined /> : <StopOutlined />}
            disabled={!state.connected || state.screenSharing}
          />

          {(isStageUser || state.screenSharing) && (
            <Button
              variant="ghost"
              className={`control-btn ${state.screenSharing ? "is-active" : ""}`}
              onClick={handleScreenShareToggle}
              icon={<DesktopOutlined />}
              disabled={!canShareScreen}
            />
          )}

          {isTeacher && canReturnStageToTeacher && (
            <Button
              variant="ghost"
              className="control-btn"
              onClick={handleReturnStageToTeacher}
              icon={<RollbackOutlined />}
              disabled={!state.connected}
            />
          )}

          {!isTeacher && (
            <Button
              variant="ghost"
              className={`control-btn ${state.handRaised ? "is-active" : ""}`}
              onClick={handleHandRaise}
              icon={<HighlightOutlined />}
              disabled={!state.connected}
            />
          )}

          {!isDesktop && (
            <Button
              variant="ghost"
              className={`control-btn ${participantsPanelOpen ? "is-active" : ""}`}
              onClick={() =>
                setState((prev) => ({ ...prev, showStudentsGrid: !prev.showStudentsGrid }))
              }
              icon={<TeamOutlined />}
            />
          )}

          <Button
            variant="ghost"
            className="control-btn exit-btn"
            onClick={handleExitRoom}
            icon={<LogoutOutlined />}
          />
        </div>

        {isDemoMode && <div className="room-mode-pill">Demo rejim</div>}
      </header>

      {/* summary-bar olib tashlandi */}

      {state.error && (
        <div className="room-alert room-alert-error">{state.error}</div>
      )}

      {!state.error && !state.loading && !state.connected && (
        <div className="room-alert room-alert-warning">
          Signal ulanishi mavjud emas. Ulanish qayta tiklanmoqda.
        </div>
      )}

      <div className="main-content">
        <div className="stage-section">
          <div className="stage-video-container" ref={setStageVideoContainerRef} />
          {state.loading && (
            <div className="stage-loading">
              <Spin size="large" />
              <span>{t("common.loading")}</span>
            </div>
          )}
          {!state.loading && !stageVideoTrack && (
            <div className="stage-empty">{t("live.room.noVideo")}</div>
          )}
          {showCameraUnavailable && (
            <div className="stage-warning">{t("live.room.cameraUnavailable")}</div>
          )}

          <div className="stage-overlay">
            {/* Top info — faqat talaba sahnadagida metrikalar ko'rsatiladi */}
            {stageParticipant && !stageParticipant.is_teacher && (
              stageMetricChips.length > 0 || stageAttendanceNote || stageEligibilityBadge || (stageFaceStatus && stageFaceStatus !== "CHECKING")
            ) ? (
            <div className="stage-top-info">
              {(stageMetricChips.length > 0 || Boolean(stageAttendanceNote) || Boolean(stageEligibilityBadge)) && (
                <div className="stage-metrics">
                  {stageMetricChips.map((chip) => (
                    <span key={chip.key} className="stage-metric-pill">
                      {chip.label} {chip.value}
                    </span>
                  ))}
                  {stageAttendanceNote && (
                    <span className="stage-metric-pill stage-metric-note">
                      {stageAttendanceNote}
                    </span>
                  )}
                  {stageEligibilityBadge && (
                    <span
                      className={`stage-metric-pill stage-eligibility-pill ${stageEligibilityBadge.className}`}
                      title={stageEligibilityBadge.reason}
                    >
                      {stageEligibilityBadge.label}
                    </span>
                  )}
                </div>
              )}
              
              {/* Face verification status badge */}
              {stageFaceStatus && stageFaceStatus !== "CHECKING" && (
                <div className="stage-face-status">
                  <div
                    className={`face-badge face-badge-${stageFaceStatus.toLowerCase()}`}
                    title={`Yuz holati: ${stageFaceStatus}`}
                  >
                    {stageFaceStatusDisplay?.label}
                  </div>
                </div>
              )}
            </div>
            ) : null}
            <div className="stage-bottom-info">
              <div className="stage-user-label">
                {stageName}
              </div>
              <div className="stage-role-label">
                {stageGroupLabel}
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
              <div>video_published: {videoPublished ? "yes" : "no"}</div>
              <div>local_track_ready_state: {localTrackReadyState}</div>
              <div>publish_retries: {publishRetries}</div>
              <div>remote_video_count: {videoTracksMap.current.size}</div>
              <div>active_video_cap: {SIDEBAR_ACTIVE_VIDEO_CAP}</div>
              <div>active_video_count: {activeVideoUids.size}</div>
              <div>stage_user_id: {stageUserId || "-"}</div>
              <div>resolved_stage_user_id: {liveState?.resolved_stage_user_id ?? "-"}</div>
              <div>participants: {state.participants.length}</div>
              <div>last_room_state_event: {lastRoomStateEventAt || "-"}</div>
              <div>last_status_event: {lastStatusEventAt || "-"}</div>
              <div>last_status_reason: {lastStatusReason || "-"}</div>
              <div style={{ marginTop: 6, opacity: 0.9 }}>
                last_event: {debugEvents[0] || "-"}
              </div>
            </div>
          )}
        </div>

        {!isDesktop && state.showStudentsGrid && (
          <StudentGridSection
            participants={sortedParticipants}
            studentStatuses={studentStatuses}
            videoTracks={videoTracksMap.current}
            isTeacher={isTeacher}
            onClose={() => setState((prev) => ({ ...prev, showStudentsGrid: false }))}
            onAudioToggle={isTeacher ? handleSetStage : undefined}
            onStudentSelect={isTeacher ? handleSetStage : undefined}
            stageUserId={stageUserId}
          />
        )}
      </div>

      {isDesktop && (
        <SidePanel
          participants={sortedParticipants}
          studentStatuses={studentStatuses}
          videoTracks={videoTracksMap.current}
          activeVideoUids={activeVideoUids}
          isTeacher={isTeacher}
          onStudentAudioToggle={isTeacher ? handleSetStage : undefined}
          onStudentSelect={isTeacher ? handleSetStage : undefined}
          stageUserId={stageUserId}
        />
      )}

      {/* kontrol tugmalari header ichiga ko'chirildi */}
    </div>
  );
}
