import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  ParticipantTile,
  TrackLoop,
  LayoutContextProvider,
  VideoTrack,
  useTracks,
  useParticipants,
  useRoomContext,
  useLocalParticipant,
  useCreateLayoutContext,
  useTrackRefContext,
  Chat,
} from "@livekit/components-react";
import type { TrackReference, TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { ConnectionState, Track, RoomEvent, type Participant } from "livekit-client";
import { Button, Spin, Typography, message } from "antd";
import { useQuery } from "@tanstack/react-query";

import { joinLiveLesson, leaveLiveRoom, endLiveRoom } from "../../api/live";
import { sendPresence } from "../../api/attendance";
import { fetchLessons } from "../../api/lessons";
import { useMe } from "../../hooks/useMe";
import "./Room.css";

type RaisePayload = { type: "raise_hand"; value: boolean };
type AllowSpeakPayload = { type: "allow_speak"; identity: string | null };
type DataPayload = RaisePayload | AllowSpeakPayload;

type ParticipantMeta = {
  role?: string;
  full_name?: string;
  group_name?: string;
};

const isTrackReference = (track: TrackReferenceOrPlaceholder): track is TrackReference =>
  Boolean(track.publication);

const decodePayload = (payload: Uint8Array): DataPayload | null => {
  try {
    const text = new TextDecoder().decode(payload);
    return JSON.parse(text) as DataPayload;
  } catch {
    return null;
  }
};

const encodePayload = (payload: DataPayload) => new TextEncoder().encode(JSON.stringify(payload));

const parseParticipantMeta = (participant?: Participant | null): ParticipantMeta => {
  if (!participant?.metadata) return {};
  try {
    return JSON.parse(participant.metadata) as ParticipantMeta;
  } catch {
    return { role: participant.metadata };
  }
};

const getDisplayName = (participant?: Participant | null) => {
  const meta = parseParticipantMeta(participant);
  return meta.full_name || participant?.name || participant?.identity || "User";
};

const getGroupName = (participant?: Participant | null) => {
  const meta = parseParticipantMeta(participant);
  return meta.group_name || "";
};

const getRole = (participant?: Participant | null) => {
  const meta = parseParticipantMeta(participant);
  return meta.role || "";
};

const getInitials = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => (part[0] ? part[0].toUpperCase() : ""))
    .join("");
  return initials || "?";
};

const LiveRoomHeader = ({
  title,
  subtitle,
  raisedCount,
}: {
  title: string;
  subtitle: string;
  raisedCount: number;
}) => {
  const participants = useParticipants();
  const room = useRoomContext();
  const status =
    room?.state === ConnectionState.Connected ? "Ulangan" : room?.state === ConnectionState.Connecting ? "Ulanmoqda" : "Uzildi";
  const statusClass =
    room?.state === ConnectionState.Connected
      ? "is-ok"
      : room?.state === ConnectionState.Connecting
        ? "is-warn"
        : "is-bad";

  return (
    <div className="live-room__header-main">
      <div className="live-room__title">Live dars</div>
      <div className="live-room__subtitle">{title || subtitle}</div>
      <div className="live-room__meta">
        <span className="live-room__pill live-room__pill--live">JONLI</span>
        <span className="live-room__pill">{participants.length} ishtirokchi</span>
        {raisedCount > 0 && <span className="live-room__pill live-room__pill--hand">{raisedCount} qo'l</span>}
        <span className={`live-room__pill live-room__pill--status ${statusClass}`}>{status}</span>
      </div>
    </div>
  );
};

const LiveRoomActions = ({
  roomId,
  onLeave,
  canModerate,
  speakerIdentity,
  onSpeakerChange,
  raisedMap,
  setRaised,
}: {
  roomId?: number;
  onLeave: () => void;
  canModerate: boolean;
  speakerIdentity: string | null;
  onSpeakerChange: (identity: string | null) => void;
  raisedMap: Record<string, boolean>;
  setRaised: Dispatch<SetStateAction<Record<string, boolean>>>;
}) => {
  const room = useRoomContext();
  const identity = room?.localParticipant.identity || "me";
  const raised = raisedMap[identity] || false;

  const toggleAudioOnly = async () => {
    if (!room) return;
    const enabled = room.localParticipant.isCameraEnabled;
    await room.localParticipant.setCameraEnabled(!enabled);
  };

  const handleRaise = () => {
    if (!room) return;
    const next = !raised;
    setRaised((prev) => ({ ...prev, [identity]: next }));
    room.localParticipant.publishData(encodePayload({ type: "raise_hand", value: next }), { reliable: true });
  };

  const handleEnd = async () => {
    if (!roomId) return;
    await endLiveRoom(roomId);
    onLeave();
  };

  return (
    <div className="live-room__actions">
      <Button size="small" className="live-room__action" onClick={toggleAudioOnly}>
        Faqat audio
      </Button>
      <Button size="small" className="live-room__action" onClick={handleRaise}>
        {raised ? "Qo'lni tushirish" : "Qo'lni ko'tarish"}
      </Button>
      {canModerate && speakerIdentity && (
        <Button size="small" className="live-room__action" onClick={() => onSpeakerChange(null)}>
          Talabani to'xtatish
        </Button>
      )}
      {canModerate && (
        <Button size="small" danger className="live-room__action live-room__action--danger" onClick={handleEnd}>
          Darsni yakunlash
        </Button>
      )}
      <Button size="small" className="live-room__action live-room__action--ghost" onClick={onLeave}>
        Chiqish
      </Button>
    </div>
  );
};

const FocusTile = () => {
  const trackRef = useTrackRefContext();
  if (!trackRef?.participant) return null;
  const participant = trackRef.participant;
  const label = getDisplayName(participant);
  const group = getGroupName(participant);
  const role = getRole(participant);

  return (
    <div className="live-room__focus-tile">
      <ParticipantTile trackRef={trackRef} className="live-room__focus-video" />
      <div className="live-room__focus-meta">
        <div className="live-room__focus-name">{label}</div>
        {group && <div className="live-room__focus-group">{group}</div>}
        {role === "teacher" && <span className="live-room__focus-badge">O'qituvchi</span>}
      </div>
    </div>
  );
};

const FocusStage = ({ focusIdentity }: { focusIdentity: string | null }) => {
  const tracks = useTracks(
    [
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.Camera, withPlaceholder: true },
    ],
    { onlySubscribed: false }
  );

  const focusTrack = useMemo(() => {
    if (!focusIdentity) return null;
    const screen = tracks.find(
      (track) => track.participant.identity === focusIdentity && track.source === Track.Source.ScreenShare
    );
    if (screen) return screen;
    return tracks.find(
      (track) => track.participant.identity === focusIdentity && track.source === Track.Source.Camera
    );
  }, [tracks, focusIdentity]);

  if (!focusTrack) {
    return <div className="live-room__empty">Asosiy video yo'q</div>;
  }

  return (
    <TrackLoop tracks={[focusTrack]}>
      <FocusTile />
    </TrackLoop>
  );
};

const SelfPreview = ({ focusIdentity }: { focusIdentity: string | null }) => {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], { onlySubscribed: false });
  const { localParticipant } = useLocalParticipant();

  const localTrack = useMemo(() => {
    if (!localParticipant) return null;
    return tracks.find(
      (track) => track.participant.identity === localParticipant.identity && track.source === Track.Source.Camera
    );
  }, [tracks, localParticipant]);

  if (!localTrack || localTrack.participant.identity === focusIdentity) {
    return null;
  }

  return (
    <div className="live-room__self live-room__self--left">
      <TrackLoop tracks={[localTrack]}>
        <ParticipantTile className="live-room__self-video" />
      </TrackLoop>
      <div className="live-room__self-label">Siz</div>
    </div>
  );
};

const SpeakerPreview = ({
  speakerIdentity,
  focusIdentity,
}: {
  speakerIdentity: string | null;
  focusIdentity: string | null;
}) => {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], { onlySubscribed: false });

  const speakerTrack = useMemo(() => {
    if (!speakerIdentity) return null;
    return tracks.find(
      (track) => track.participant.identity === speakerIdentity && track.source === Track.Source.Camera
    );
  }, [tracks, speakerIdentity]);

  if (!speakerTrack || speakerTrack.participant.identity === focusIdentity) {
    return null;
  }

  const label = getDisplayName(speakerTrack.participant);

  return (
    <div className="live-room__self live-room__self--left">
      <ParticipantTile trackRef={speakerTrack} className="live-room__self-video" />
      <div className="live-room__self-label">{label}</div>
    </div>
  );
};

const StudentTile = ({
  participant,
  trackRef,
  raisedMap,
  focusIdentity,
  canModerate,
  onFocus,
}: {
  participant: Participant;
  trackRef?: TrackReference | null;
  raisedMap: Record<string, boolean>;
  focusIdentity: string | null;
  canModerate: boolean;
  onFocus: (identity: string) => void;
}) => {
  const label = getDisplayName(participant);
  const group = getGroupName(participant);
  const role = getRole(participant);
  const raised = raisedMap[participant.identity];
  const isFocused = focusIdentity === participant.identity;
  const initials = getInitials(label);
  const hasVideo = Boolean(trackRef?.publication?.track);

  return (
    <div className={`live-room__student ${isFocused ? "is-focused" : ""}`}>
      <div className="live-room__student-video">
        {hasVideo && trackRef ? (
          <VideoTrack trackRef={trackRef} />
        ) : (
          <div className="live-room__student-placeholder">{initials}</div>
        )}
      </div>
      <div className="live-room__student-info">
        <div className="live-room__student-name">{label}</div>
        {group && <div className="live-room__student-group">{group}</div>}
        {role === "teacher" && <div className="live-room__student-role">O'qituvchi</div>}
      </div>
      {raised && <span className="live-room__student-badge">Qo'l</span>}
      {canModerate && raised && (
        <button className="live-room__student-action" onClick={() => onFocus(participant.identity)}>
          Ruxsat berish
        </button>
      )}
    </div>
  );
};

const StudentSidebar = ({
  focusIdentity,
  raisedMap,
  canModerate,
  onFocus,
  localIdentity,
}: {
  focusIdentity: string | null;
  raisedMap: Record<string, boolean>;
  canModerate: boolean;
  onFocus: (identity: string) => void;
  localIdentity: string | null;
}) => {
  const participants = useParticipants();
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }], { onlySubscribed: false });

  const trackByIdentity = useMemo(() => {
    const map = new Map<string, TrackReference>();
    tracks.forEach((track) => {
      if (track.source === Track.Source.Camera) {
        if (isTrackReference(track)) {
          map.set(track.participant.identity, track);
        }
      }
    });
    return map;
  }, [tracks]);

  const students = useMemo(() => {
    return participants.filter((participant) => {
      if (participant.identity === focusIdentity) return false;
      if (localIdentity && participant.identity === localIdentity) return false;
      const role = getRole(participant);
      if (role === "teacher" || role === "admin") return false;
      return true;
    });
  }, [participants, focusIdentity, localIdentity]);

  return (
    <aside className="live-room__left">
      <div className="live-room__panel-title">Ishtirokchilar</div>
      <div className="live-room__students">
        {students.length > 0 ? (
          students.map((participant) => (
            <StudentTile
              key={participant.identity}
              participant={participant}
              trackRef={trackByIdentity.get(participant.identity)}
              raisedMap={raisedMap}
              focusIdentity={focusIdentity}
              canModerate={canModerate}
              onFocus={onFocus}
            />
          ))
        ) : (
          <div className="live-room__empty live-room__empty--small">Talabalar hali yo'q</div>
        )}
      </div>
    </aside>
  );
};

const LiveRoomDataBridge = ({
  setRaised,
  setCanSpeak,
  setSpeakerIdentity,
  localIdentity,
  userRole,
}: {
  setRaised: Dispatch<SetStateAction<Record<string, boolean>>>;
  setCanSpeak: Dispatch<SetStateAction<boolean>>;
  setSpeakerIdentity: Dispatch<SetStateAction<string | null>>;
  localIdentity: string | null;
  userRole: string;
}) => {
  const room = useRoomContext();

  useEffect(() => {
    if (!room) return;
    const handler = (payload: Uint8Array, participant?: Participant) => {
      const msg = decodePayload(payload);
      if (!msg) return;
      if (msg.type === "raise_hand" && participant) {
        setRaised((prev) => ({ ...prev, [participant.identity]: !!msg.value }));
      }
      if (msg.type === "allow_speak") {
        const identity = msg.identity;
        if (identity) {
          setRaised((prev) => ({ ...prev, [identity]: false }));
        }
        setSpeakerIdentity(identity || null);
        if (userRole === "student" && localIdentity) {
          setCanSpeak(identity === localIdentity);
        }
      }
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room, setRaised, setCanSpeak, setSpeakerIdentity, localIdentity, userRole]);

  return null;
};

const LiveRoomContent = ({
  title,
  roomId,
  lessonId,
  userRole,
  onLeave,
}: {
  title: string;
  roomId?: number;
  lessonId?: number;
  userRole: string;
  onLeave: () => void;
}) => {
  const layoutContext = useCreateLayoutContext();
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [cameraInitDone, setCameraInitDone] = useState(false);
  const [raised, setRaised] = useState<Record<string, boolean>>({});
  const [focusIdentity, setFocusIdentity] = useState<string | null>(null);
  const [speakerIdentity, setSpeakerIdentity] = useState<string | null>(null);
  const [canSpeak, setCanSpeak] = useState(userRole !== "student");
  const localPreviewRef = useRef<HTMLVideoElement | null>(null);
  const presenceBusyRef = useRef(false);
  const [presenceWarned, setPresenceWarned] = useState(false);

  const localTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], { onlySubscribed: false });
  const localVideoTrack = useMemo(() => {
    if (!localParticipant) return null;
    const trackRef = localTracks.find(
      (track) => track.participant.identity === localParticipant.identity && track.source === Track.Source.Camera
    );
    return trackRef?.publication?.track || null;
  }, [localTracks, localParticipant]);
  const teacherIdentity = useMemo(() => {
    const teacher = participants.find((participant) => getRole(participant) === "teacher");
    if (teacher) return teacher.identity;
    if (userRole === "teacher" && localParticipant) return localParticipant.identity;
    return null;
  }, [participants, userRole, localParticipant]);

  useEffect(() => {
    if (teacherIdentity && focusIdentity !== teacherIdentity) {
      setFocusIdentity(teacherIdentity);
      return;
    }
    if (!focusIdentity || !participants.some((p) => p.identity === focusIdentity)) {
      if (teacherIdentity) {
        setFocusIdentity(teacherIdentity);
      } else if (localParticipant) {
        setFocusIdentity(localParticipant.identity);
      }
    }
  }, [focusIdentity, participants, teacherIdentity, localParticipant]);

  useEffect(() => {
    if (!room || userRole !== "student") return;
    if (!canSpeak) {
      room.localParticipant.setMicrophoneEnabled(false);
    } else {
      room.localParticipant.setMicrophoneEnabled(true);
    }
  }, [room, userRole, canSpeak]);

  useEffect(() => {
    if (!room || cameraInitDone || room.state !== ConnectionState.Connected) return;
    setCameraInitDone(true);
    if (!room.localParticipant.isCameraEnabled) {
      room.localParticipant.setCameraEnabled(true).catch(() => {
        message.error("Kamera ishga tushmadi. Brauzer ruxsatini tekshiring.");
      });
    }
  }, [room, cameraInitDone]);

  useEffect(() => {
    if (!localVideoTrack) return;
    const element = (localVideoTrack as any).attach() as HTMLVideoElement;
    element.muted = true;
    element.playsInline = true;
    element.style.position = "fixed";
    element.style.left = "-9999px";
    element.style.top = "-9999px";
    localPreviewRef.current = element;
    document.body.appendChild(element);
    return () => {
      (localVideoTrack as any).detach(element);
      element.remove();
      localPreviewRef.current = null;
    };
  }, [localVideoTrack]);

  useEffect(() => {
    if (!room || !lessonId || userRole !== "student") return;
    if (room.state !== ConnectionState.Connected) return;

    let cancelled = false;
    const captureFrame = async () => {
      const videoEl = localPreviewRef.current;
      if (!videoEl || !videoEl.videoWidth || !videoEl.videoHeight) return null;
      const canvas = document.createElement("canvas");
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.7);
      });
    };

    const tick = async () => {
      if (presenceBusyRef.current) return;
      if (!room.localParticipant.isCameraEnabled) return;
      const frame = await captureFrame();
      if (!frame) return;
      presenceBusyRef.current = true;
      try {
        await sendPresence(lessonId, frame);
      } catch {
        if (!cancelled && !presenceWarned) {
          message.warning("Davomat tekshiruvi ishlamadi. AI xizmatini tekshiring.");
          setPresenceWarned(true);
        }
      } finally {
        presenceBusyRef.current = false;
      }
    };

    tick();
    const timer = window.setInterval(tick, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [room, lessonId, userRole, presenceWarned]);

  const publish = (payload: DataPayload) => {
    if (!room) return;
    room.localParticipant.publishData(encodePayload(payload), { reliable: true });
  };

  const handleSpeakerChange = (identity: string | null) => {
    const allowTarget = identity || null;
    setSpeakerIdentity(allowTarget);
    publish({ type: "allow_speak", identity: allowTarget });
    if (allowTarget) {
      setRaised((prev) => ({ ...prev, [allowTarget]: false }));
    }
  };

  const raisedCount = Object.values(raised).filter(Boolean).length;
  const canModerate = userRole === "teacher" || userRole === "admin";
  const localIdentity = localParticipant?.identity || null;

  const controls = {
    microphone: userRole !== "student" || canSpeak,
    camera: true,
    screenShare: canModerate,
    chat: true,
    leave: true,
    settings: true,
  };

  return (
    <LayoutContextProvider value={layoutContext}>
      <header className="live-room__header">
        <LiveRoomHeader title={title} subtitle="Live dars" raisedCount={raisedCount} />
        <LiveRoomActions
          roomId={roomId}
          onLeave={onLeave}
          canModerate={canModerate}
          speakerIdentity={speakerIdentity}
          onSpeakerChange={handleSpeakerChange}
          raisedMap={raised}
          setRaised={setRaised}
        />
      </header>

      <LiveRoomDataBridge
        setRaised={setRaised}
        setCanSpeak={setCanSpeak}
        setSpeakerIdentity={setSpeakerIdentity}
        localIdentity={localIdentity}
        userRole={userRole}
      />

      <div className="live-room__body">
        <StudentSidebar
          focusIdentity={focusIdentity}
          raisedMap={raised}
          canModerate={canModerate}
          onFocus={handleSpeakerChange}
          localIdentity={localIdentity}
        />
        <div className="live-room__stage">
          <FocusStage focusIdentity={focusIdentity} />
          <SelfPreview focusIdentity={focusIdentity} />
          {userRole !== "student" && (
            <SpeakerPreview speakerIdentity={speakerIdentity} focusIdentity={focusIdentity} />
          )}
        </div>
        <aside className="live-room__right">
          <div className="live-room__panel-title">Chat</div>
          <Chat className="live-room__chat-box" />
        </aside>
      </div>

      <div className="live-room__controls">
        <ControlBar className="live-room__controlbar" controls={controls} />
      </div>
    </LayoutContextProvider>
  );
};

const LiveRoomPage = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { data: user } = useMe();
  const { data: lessons } = useQuery({ queryKey: ["lessons"], queryFn: fetchLessons });
  const lesson = useMemo(
    () => lessons?.find((l: any) => String(l.id) === String(lessonId)),
    [lessons, lessonId]
  );

  const [loading, setLoading] = useState(true);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!lessonId) return;
      setLoading(true);
      setError(null);
      try {
        const info = await joinLiveLesson(Number(lessonId));
        if (mounted) {
          setRoomInfo(info);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.response?.data?.error || "Live xonaga ulanishda xatolik");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [lessonId]);

  const handleLeave = async () => {
    if (roomInfo?.room_id) {
      try {
        await leaveLiveRoom(roomInfo.room_id);
      } catch {
        // ignore
      }
    }
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="live-room__loading">
        <Spin size="large" />
      </div>
    );
  }

  if (error || !roomInfo?.token) {
    return (
      <div className="live-room__error">
        <Typography.Title level={4}>Live xatolik</Typography.Title>
        <Typography.Text>{error || "Live xonaga kirib bo'lmadi"}</Typography.Text>
        <div style={{ marginTop: 16 }}>
          <Button onClick={() => navigate(-1)}>Orqaga</Button>
        </div>
      </div>
    );
  }

  const title = lesson
    ? `${lesson.subject_name || ""} ${lesson.topic ? `| ${lesson.topic}` : ""}`
    : `Live dars #${lessonId}`;
  const userRole = user?.role || "student";

  return (
    <div className="live-room">
      <LiveKitRoom
        token={roomInfo.token}
        serverUrl={roomInfo.livekit_url}
        connectOptions={{ autoSubscribe: true }}
        audio
        video
        options={{ publishDefaults: { red: false } }}
        data-lk-theme="default"
        onDisconnected={handleLeave}
      >
        <RoomAudioRenderer />
        <LiveRoomContent
          title={title}
          roomId={roomInfo.room_id}
          lessonId={lessonId ? Number(lessonId) : undefined}
          userRole={userRole}
          onLeave={handleLeave}
        />
      </LiveKitRoom>
    </div>
  );
};

export default LiveRoomPage;
