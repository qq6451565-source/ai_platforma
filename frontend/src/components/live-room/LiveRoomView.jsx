import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";

import {
  fetchLiveMonitoring,
  fetchLiveState,
  joinLiveLesson,
  leaveLiveRoom,
  raiseHand,
  setStageUser,
} from "../../api/live";

import styles from "./LiveRoom.module.css";
import StageView from "./StageView";
import ParticipantsSidebar from "./ParticipantsSidebar";
import ControlsToolbar from "./ControlsToolbar";
import { useLiveRoomStore } from "./useLiveRoomStore";

const MOCK_TEACHER_ID = "teacher-demo";

const normalizeId = (value) => (value === null || value === undefined ? "" : String(value));

const parseNumericId = (value) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  return null;
};

const parseMetadata = (metadata) => {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
};

const getTrackFromPublicationMap = (publicationMap, source) => {
  if (!publicationMap) return null;

  for (const publication of publicationMap.values()) {
    if (publication.source === source && publication.track) {
      return publication.track;
    }
  }

  return null;
};

const mapLiveKitParticipant = (participant, teacherId) => {
  const metadata = parseMetadata(participant.metadata);
  const participantId = normalizeId(participant.identity || participant.sid);
  const isTeacher =
    participantId === normalizeId(teacherId) ||
    metadata.role === "teacher" ||
    metadata.role === "admin" ||
    metadata.isTeacher === true;

  return {
    id: participantId,
    name:
      participant.name ||
      metadata.full_name ||
      metadata.fullName ||
      participant.identity ||
      "Noma'lum",
    group:
      metadata.group_name ||
      metadata.group ||
      metadata.groupName ||
      "Talabalar guruhi",
    isTeacher,
    videoTrack: getTrackFromPublicationMap(participant.videoTrackPublications, Track.Source.Camera),
    screenTrack: getTrackFromPublicationMap(participant.videoTrackPublications, Track.Source.ScreenShare),
    audioTrack: getTrackFromPublicationMap(participant.audioTrackPublications, Track.Source.Microphone),
  };
};

const buildMockParticipants = (teacher) => [
  {
    id: normalizeId(teacher.id),
    name: teacher.name,
    group: teacher.group,
    isTeacher: true,
    isVerified: true,
    isRequestingToSpeak: false,
    videoTrack: null,
    screenTrack: null,
    audioTrack: null,
  },
  {
    id: "student-101",
    name: "Ziyodullo Karimov",
    group: "SE-201",
    isTeacher: false,
    isVerified: true,
    isRequestingToSpeak: false,
    videoTrack: null,
    screenTrack: null,
    audioTrack: null,
  },
  {
    id: "student-102",
    name: "Mohira Safarova",
    group: "SE-201",
    isTeacher: false,
    isVerified: false,
    isRequestingToSpeak: true,
    videoTrack: null,
    screenTrack: null,
    audioTrack: null,
  },
  {
    id: "student-103",
    name: "Abdulaziz Qudratov",
    group: "SE-202",
    isTeacher: false,
    isVerified: true,
    isRequestingToSpeak: false,
    videoTrack: null,
    screenTrack: null,
    audioTrack: null,
  },
];

export default function LiveRoom({ lessonId, currentUser }) {
  const roomRef = useRef(null);
  const roomMetaRef = useRef({ roomId: null, roomName: "" });

  const [isConnected, setIsConnected] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [roomLabel, setRoomLabel] = useState("");

  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);

  const participants = useLiveRoomStore((state) => state.participants);
  const setParticipants = useLiveRoomStore((state) => state.setParticipants);
  const setTeacherId = useLiveRoomStore((state) => state.setTeacherId);
  const setActiveSpeaker = useLiveRoomStore((state) => state.setActiveSpeaker);
  const setVerificationStatus = useLiveRoomStore((state) => state.setVerificationStatus);
  const setRequestingToSpeak = useLiveRoomStore((state) => state.setRequestingToSpeak);
  const resetLiveRoom = useLiveRoomStore((state) => state.resetLiveRoom);

  const isTeacherView = currentUser.role === "teacher";
  const normalizedCurrentUserId = normalizeId(currentUser.id);
  const preferredTeacherId = useMemo(
    () => (isTeacherView ? normalizedCurrentUserId : null),
    [isTeacherView, normalizedCurrentUserId]
  );

  const enableDemoMode = useCallback(
    (reason) => {
      const fallbackTeacherId = preferredTeacherId || MOCK_TEACHER_ID;
      setConnectionError(reason);
      setIsConnected(false);
      setIsDemoMode(true);
      setRoomLabel("Demo live dars");
      roomMetaRef.current = { roomId: null, roomName: "demo-live-room" };
      setTeacherId(fallbackTeacherId);
      setParticipants(
        buildMockParticipants({
          id: fallbackTeacherId,
          name: isTeacherView ? currentUser.name : "O'qituvchi",
          group: isTeacherView ? currentUser.group : "Mentor",
        })
      );
    },
    [currentUser.group, currentUser.name, isTeacherView, preferredTeacherId, setParticipants, setTeacherId]
  );

  const syncParticipantsFromRoom = useCallback(
    (room) => {
      if (!room) return;

      let mapped = [
        mapLiveKitParticipant(room.localParticipant, preferredTeacherId),
        ...Array.from(room.remoteParticipants.values()).map((participant) =>
          mapLiveKitParticipant(participant, preferredTeacherId)
        ),
      ];

      const hasTeacher = mapped.some((participant) => participant.isTeacher);
      if (!hasTeacher && mapped.length) {
        const fallbackTeacherId = isTeacherView
          ? normalizedCurrentUserId
          : mapped.find((participant) => participant.id !== normalizedCurrentUserId)?.id || mapped[0].id;

        mapped = mapped.map((participant) =>
          participant.id === fallbackTeacherId
            ? { ...participant, isTeacher: true }
            : participant
        );
      }

      const resolvedTeacher = mapped.find((participant) => participant.isTeacher);
      if (resolvedTeacher) {
        setTeacherId(resolvedTeacher.id);
      }

      setParticipants(mapped);
    },
    [isTeacherView, normalizedCurrentUserId, preferredTeacherId, setParticipants, setTeacherId]
  );

  const applyLiveState = useCallback(
    (liveState) => {
      if (!liveState) return;

      const stageId = normalizeId(liveState.stage_user_id ?? liveState.resolved_stage_user_id);
      if (stageId) {
        setActiveSpeaker(stageId);
      }

      if (Array.isArray(liveState.participants)) {
        liveState.participants.forEach((participant) => {
          const participantId = normalizeId(participant.user_id);
          if (!participantId) return;
          if (participant.is_teacher) {
            setTeacherId(participantId);
          }
          setRequestingToSpeak(participantId, Boolean(participant.hand_raised));
        });
      }
    },
    [setActiveSpeaker, setRequestingToSpeak, setTeacherId]
  );

  const applyMonitoringState = useCallback(
    (monitoringData) => {
      if (!monitoringData || !Array.isArray(monitoringData.sessions)) return;

      const verifiedUserIds = new Set(
        monitoringData.sessions
          .filter((session) => session.status === "verified" && Number(session.success_rate || 0) >= 70)
          .map((session) => normalizeId(session.user))
      );

      const snapshot = useLiveRoomStore.getState();
      const currentTeacherId = normalizeId(snapshot.teacherId);

      snapshot.participants.forEach((participant) => {
        const participantId = normalizeId(participant.id);
        if (!participantId || participantId === currentTeacherId) return;
        setVerificationStatus(participantId, verifiedUserIds.has(participantId));
      });
    },
    [setVerificationStatus]
  );

  useEffect(() => {
    if (preferredTeacherId) {
      setTeacherId(preferredTeacherId);
    }
  }, [preferredTeacherId, setTeacherId]);

  useEffect(() => {
    let cancelled = false;
    let pollingTimer = null;

    const connectRoom = async () => {
      setConnectionError("");
      setIsDemoMode(false);
      setRoomLabel("Live darsga ulanmoqda...");

      let joinResponse;
      try {
        joinResponse = await joinLiveLesson(Number(lessonId));
      } catch (error) {
        const message = error?.response?.data?.error || error?.message || "Live darsga kirishda xatolik";
        enableDemoMode(`${message}. Demo qatnashuvchilar yoqildi.`);
        return;
      }

      const roomId = joinResponse?.room_id ?? null;
      const roomName = joinResponse?.room || "Live dars";
      const livekitUrl = joinResponse?.livekit_url || joinResponse?.ws_url || import.meta.env.VITE_LIVEKIT_URL;
      const token = joinResponse?.token || import.meta.env.VITE_LIVEKIT_TOKEN;

      roomMetaRef.current = { roomId, roomName };
      setRoomLabel(roomName);

      if (!livekitUrl || !token) {
        enableDemoMode("LiveKit token yoki URL topilmadi");
        return;
      }

      if (
        typeof window !== "undefined" &&
        /^wss?:\/\/(127\\.0\\.0\\.1|localhost)/i.test(livekitUrl) &&
        !["localhost", "127.0.0.1"].includes(window.location.hostname)
      ) {
        enableDemoMode("LIVEKIT_URL localhostga sozlangan. Production uchun public wss:// URL kerak.");
        return;
      }

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      const sync = () => {
        if (!cancelled) {
          syncParticipantsFromRoom(room);
        }
      };

      room.on(RoomEvent.ParticipantConnected, sync);
      room.on(RoomEvent.ParticipantDisconnected, sync);
      room.on(RoomEvent.TrackSubscribed, sync);
      room.on(RoomEvent.TrackUnsubscribed, sync);
      room.on(RoomEvent.LocalTrackPublished, sync);
      room.on(RoomEvent.LocalTrackUnpublished, sync);
      room.on(RoomEvent.Reconnected, sync);

      try {
        await room.connect(livekitUrl, token);
        await room.localParticipant.setMicrophoneEnabled(true);
        await room.localParticipant.setCameraEnabled(true);

        if (cancelled) return;

        setMicEnabled(true);
        setCameraEnabled(true);
        setScreenShareEnabled(false);
        setIsConnected(true);
        setIsDemoMode(false);
        setConnectionError("");
        syncParticipantsFromRoom(room);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "LiveKit ulanishida xatolik";
        const guidance = /invalid authorization token/i.test(message)
          ? " LIVEKIT_API_KEY/API_SECRET va server mosligini tekshiring."
          : "";
        enableDemoMode(`${message}.${guidance} Demo qatnashuvchilar yoqildi.`);
        return;
      }

      const syncServerState = async () => {
        if (cancelled) return;

        const meta = roomMetaRef.current;
        const statePayload = meta.roomId
          ? { room_id: meta.roomId }
          : { lesson_id: Number(lessonId) };

        try {
          const liveState = await fetchLiveState(statePayload);
          applyLiveState(liveState);
        } catch {
          // keep local livekit state if API poll fails
        }

        try {
          if (meta.roomName) {
            const monitoring = await fetchLiveMonitoring(meta.roomName);
            applyMonitoringState(monitoring);
          }
        } catch {
          // face monitoring can be unavailable; UI continues without verification updates
        }
      };

      await syncServerState();
      pollingTimer = window.setInterval(() => {
        void syncServerState();
      }, 4000);
    };

    void connectRoom();

    return () => {
      cancelled = true;

      if (pollingTimer) {
        window.clearInterval(pollingTimer);
      }

      const activeRoomId = roomMetaRef.current.roomId;
      if (activeRoomId) {
        leaveLiveRoom(activeRoomId).catch(() => undefined);
      }

      if (roomRef.current) {
        roomRef.current.disconnect(true);
        roomRef.current = null;
      }

      roomMetaRef.current = { roomId: null, roomName: "" };
      resetLiveRoom();
      setIsConnected(false);
      setIsDemoMode(false);
    };
  }, [
    applyLiveState,
    applyMonitoringState,
    enableDemoMode,
    lessonId,
    resetLiveRoom,
    syncParticipantsFromRoom,
  ]);

  const toggleMicrophone = async () => {
    const room = roomRef.current;
    const next = !micEnabled;

    if (!room) {
      setMicEnabled(next);
      return;
    }

    try {
      await room.localParticipant.setMicrophoneEnabled(next);
      setMicEnabled(next);
    } catch {
      // keep previous state on failure
    }
  };

  const toggleCamera = async () => {
    const room = roomRef.current;
    const next = !cameraEnabled;

    if (!room) {
      setCameraEnabled(next);
      return;
    }

    try {
      await room.localParticipant.setCameraEnabled(next);
      setCameraEnabled(next);
    } catch {
      // keep previous state on failure
    }
  };

  const toggleScreenShare = async () => {
    const room = roomRef.current;
    const next = !screenShareEnabled;

    if (!room) {
      setScreenShareEnabled(next);
      return;
    }

    try {
      await room.localParticipant.setScreenShareEnabled(next);
      setScreenShareEnabled(next);
      syncParticipantsFromRoom(room);
    } catch {
      // keep previous state on failure
    }
  };

  const handleRequestToSpeak = async () => {
    const roomId = roomMetaRef.current.roomId;
    if (!roomId || isTeacherView) return;

    try {
      await raiseHand(roomId, true);
      setRequestingToSpeak(normalizedCurrentUserId, true);
    } catch {
      setRequestingToSpeak(normalizedCurrentUserId, false);
    }
  };

  const handleSelectParticipant = async (participant) => {
    if (!isTeacherView) return;

    const roomId = roomMetaRef.current.roomId;
    const participantId = normalizeId(participant?.id);
    if (!participantId) return;

    setActiveSpeaker(participantId);
    setRequestingToSpeak(participantId, false);

    if (!roomId) return;

    const numericUserId = parseNumericId(participantId);
    if (numericUserId === null) return;

    try {
      await setStageUser(roomId, numericUserId);
    } catch {
      // stage update fallback stays local
    }
  };

  const handleResetStageToTeacher = async () => {
    const snapshot = useLiveRoomStore.getState();
    const currentTeacherId = normalizeId(snapshot.teacherId);
    if (!currentTeacherId) return;

    setActiveSpeaker(currentTeacherId);

    const roomId = roomMetaRef.current.roomId;
    if (!isTeacherView || !roomId) return;

    const numericTeacherId = parseNumericId(currentTeacherId);
    if (numericTeacherId === null) return;

    try {
      await setStageUser(roomId, numericTeacherId);
    } catch {
      // ignore API errors; local stage still resets visually
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Live Dars</h2>
          <p className={styles.subtitle}>
            {roomLabel || "Virtual sinf"} | {participants.length} ishtirokchi
          </p>
        </div>
        <span
          className={`${styles.badge} ${isDemoMode ? styles.offline : isConnected ? styles.online : styles.offline}`}
        >
          {isDemoMode ? "Demo rejim" : isConnected ? "Ulangan" : "Ulanmoqda"}
        </span>
      </div>

      {connectionError && <div className={styles.alert}>{connectionError}</div>}

      <div className={styles.layout}>
        <StageView onResetStage={handleResetStageToTeacher} />
        <ParticipantsSidebar isTeacherView={isTeacherView} onParticipantSelect={handleSelectParticipant} />
      </div>

      <ControlsToolbar
        currentUserId={normalizedCurrentUserId}
        isTeacherView={isTeacherView}
        micEnabled={micEnabled}
        cameraEnabled={cameraEnabled}
        screenShareEnabled={screenShareEnabled}
        onToggleMic={toggleMicrophone}
        onToggleCamera={toggleCamera}
        onToggleScreenShare={toggleScreenShare}
        onRequestToSpeak={handleRequestToSpeak}
      />
    </div>
  );
}
