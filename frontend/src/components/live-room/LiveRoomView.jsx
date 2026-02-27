import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import styles from "./LiveRoom.module.css";
import StageView from "./StageView";
import ParticipantsSidebar from "./ParticipantsSidebar";
import ControlsToolbar from "./ControlsToolbar";
import { useLiveRoomStore } from "./useLiveRoomStore";

const MOCK_TEACHER_ID = "teacher-demo";
const MOCK_JOIN_RESPONSE = {
  token:
    "dev-static-token",
  url: "wss://demo.livekit.cloud",
  roomName: "demo-live-room",
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
  const isTeacher =
    participant.identity === teacherId ||
    metadata.role === "teacher" ||
    metadata.role === "admin" ||
    metadata.isTeacher === true;

  return {
    id: participant.identity || participant.sid,
    name: participant.name || metadata.fullName || participant.identity || "Noma'lum",
    group: metadata.group || metadata.groupName || "Talabalar guruhi",
    isTeacher,
    isVerified: false,
    isRequestingToSpeak: false,
    videoTrack: getTrackFromPublicationMap(participant.videoTrackPublications, Track.Source.Camera),
    screenTrack: getTrackFromPublicationMap(
      participant.videoTrackPublications,
      Track.Source.ScreenShare
    ),
    audioTrack: getTrackFromPublicationMap(participant.audioTrackPublications, Track.Source.Microphone),
  };
};

const buildMockParticipants = (teacher) => [
  {
    id: teacher.id,
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

export default function LiveRoom({
  lessonId,
  currentUser,
}) {
  const roomRef = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [roomLabel, setRoomLabel] = useState("");

  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);

  const participants = useLiveRoomStore((state) => state.participants);
  const setParticipants = useLiveRoomStore((state) => state.setParticipants);
  const setTeacherId = useLiveRoomStore((state) => state.setTeacherId);
  const setVerificationStatus = useLiveRoomStore((state) => state.setVerificationStatus);
  const resetLiveRoom = useLiveRoomStore((state) => state.resetLiveRoom);

  const isTeacherView = currentUser.role === "teacher";
  const teacherId = useMemo(
    () => (isTeacherView ? currentUser.id : null),
    [currentUser.id, isTeacherView]
  );

  const syncParticipantsFromRoom = useCallback(
    (room) => {
      if (!room) return;

      let mapped = [
        mapLiveKitParticipant(room.localParticipant, teacherId),
        ...Array.from(room.remoteParticipants.values()).map((participant) =>
          mapLiveKitParticipant(participant, teacherId)
        ),
      ];

      const hasTeacher = mapped.some((participant) => participant.isTeacher);
      if (!hasTeacher && mapped.length) {
        const fallbackTeacherId = isTeacherView
          ? currentUser.id
          : mapped.find((participant) => participant.id !== currentUser.id)?.id || mapped[0].id;

        mapped = mapped.map((participant) =>
          participant.id === fallbackTeacherId
            ? { ...participant, isTeacher: true }
            : participant
        );
      }

      const resolvedTeacherId = mapped.find((participant) => participant.isTeacher)?.id || null;
      if (resolvedTeacherId) {
        setTeacherId(resolvedTeacherId);
      }

      setParticipants(mapped);
    },
    [currentUser.id, isTeacherView, setParticipants, setTeacherId, teacherId]
  );

  useEffect(() => {
    setTeacherId(teacherId);
  }, [setTeacherId, teacherId]);

  useEffect(() => {
    let cancelled = false;
    let intervalRef = null;

    const connectRoom = async () => {
      setConnectionError("");
      setRoomLabel("Live darsga ulanmoqda...");

      let joinResponse = MOCK_JOIN_RESPONSE;

      try {
        const res = await fetch("/api/live/join-room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId }),
        });

        if (res.ok) {
          const payload = await res.json();
          joinResponse = {
            token: payload?.token || MOCK_JOIN_RESPONSE.token,
            url: payload?.url || payload?.wsUrl || MOCK_JOIN_RESPONSE.url,
            roomName: payload?.roomName || payload?.room_name || MOCK_JOIN_RESPONSE.roomName,
          };
        }
      } catch {
        // Token fetch is intentionally simulated; fallback is used.
      }

      setRoomLabel(joinResponse.roomName || "Live dars");

      const livekitUrl = import.meta.env.VITE_LIVEKIT_URL || joinResponse.url;
      const token = import.meta.env.VITE_LIVEKIT_TOKEN || joinResponse.token;

      if (!livekitUrl || !token) {
        setConnectionError("LiveKit URL yoki token topilmadi, demo holat yoqildi.");
        const fallbackTeacherId = teacherId || MOCK_TEACHER_ID;
        setParticipants(buildMockParticipants({
          id: fallbackTeacherId,
          name: isTeacherView ? currentUser.name : "O'qituvchi",
          group: isTeacherView ? currentUser.group : "Mentor",
        }));
        setTeacherId(fallbackTeacherId);
        return;
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

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
      room.on(RoomEvent.ActiveSpeakersChanged, sync);
      room.on(RoomEvent.Reconnected, sync);

      try {
        await room.connect(livekitUrl, token);
        await room.localParticipant.setMicrophoneEnabled(true);
        await room.localParticipant.setCameraEnabled(true);

        if (cancelled) return;

        setIsConnected(true);
        setMicEnabled(true);
        setCameraEnabled(true);
        setConnectionError("");
        syncParticipantsFromRoom(room);
      } catch (error) {
        if (cancelled) return;

        const message = error instanceof Error ? error.message : "LiveKit ulanishida xatolik";
        setConnectionError(`${message}. Demo qatnashuvchilar yoqildi.`);
        const fallbackTeacherId = teacherId || MOCK_TEACHER_ID;
        setParticipants(
          buildMockParticipants({
            id: fallbackTeacherId,
            name: isTeacherView ? currentUser.name : "O'qituvchi",
            group: isTeacherView ? currentUser.group : "Mentor",
          })
        );
        setTeacherId(fallbackTeacherId);
      }

      intervalRef = window.setInterval(() => {
        const students = useLiveRoomStore
          .getState()
          .participants.filter((participant) => participant.id !== teacherId);

        if (!students.length) return;

        const sampleSize = Math.max(1, Math.ceil(students.length / 3));
        const shuffled = [...students].sort(() => Math.random() - 0.5);

        shuffled.slice(0, sampleSize).forEach((student) => {
          setVerificationStatus(student.id, Math.random() >= 0.4);
        });
      }, 10_000);
    };

    connectRoom();

    return () => {
      cancelled = true;

      if (intervalRef) {
        window.clearInterval(intervalRef);
      }

      if (roomRef.current) {
        roomRef.current.disconnect(true);
        roomRef.current = null;
      }

      resetLiveRoom();
      setIsConnected(false);
    };
  }, [
    currentUser.group,
    currentUser.name,
    isTeacherView,
    lessonId,
    resetLiveRoom,
    setParticipants,
    setTeacherId,
    setVerificationStatus,
    syncParticipantsFromRoom,
    teacherId,
  ]);

  const toggleMicrophone = async () => {
    const room = roomRef.current;
    if (!room) {
      setMicEnabled((prev) => !prev);
      return;
    }

    const next = !micEnabled;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicEnabled(next);
  };

  const toggleCamera = async () => {
    const room = roomRef.current;
    if (!room) {
      setCameraEnabled((prev) => !prev);
      return;
    }

    const next = !cameraEnabled;
    await room.localParticipant.setCameraEnabled(next);
    setCameraEnabled(next);
  };

  const toggleScreenShare = async () => {
    const room = roomRef.current;
    if (!room) {
      setScreenShareEnabled((prev) => !prev);
      return;
    }

    const next = !screenShareEnabled;
    await room.localParticipant.setScreenShareEnabled(next);
    setScreenShareEnabled(next);
    syncParticipantsFromRoom(room);
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
        <span className={`${styles.badge} ${isConnected ? styles.online : styles.offline}`}>
          {isConnected ? "Ulangan" : "Demo rejim"}
        </span>
      </div>

      {connectionError && <div className={styles.alert}>{connectionError}</div>}

      <div className={styles.layout}>
        <StageView />
        <ParticipantsSidebar isTeacherView={isTeacherView} />
      </div>

      <ControlsToolbar
        currentUserId={currentUser.id}
        isTeacherView={isTeacherView}
        micEnabled={micEnabled}
        cameraEnabled={cameraEnabled}
        screenShareEnabled={screenShareEnabled}
        onToggleMic={toggleMicrophone}
        onToggleCamera={toggleCamera}
        onToggleScreenShare={toggleScreenShare}
      />
    </div>
  );
}
