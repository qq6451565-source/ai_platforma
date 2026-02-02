import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";
import { Button, Spin, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";

import { joinLiveLesson, leaveLiveRoom, endLiveRoom, fetchAgoraToken } from "../../api/live";
import { sendPresence } from "../../api/attendance";
import { fetchLessons } from "../../api/lessons";
import { useMe } from "../../hooks/useMe";
import "./Room.css";

type LocalTracks = {
  audio?: IMicrophoneAudioTrack;
  video?: ICameraVideoTrack;
};

type RoomInfo = {
  room_id?: number;
  room: string;
};

type AgoraInfo = {
  app_id: string;
  channel: string;
  uid: number;
  token: string;
  expires_in: number;
};

const appId = import.meta.env.VITE_AGORA_APP_ID;

const getInitials = (value: string) => {
  const cleaned = value.trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => (part[0] ? part[0].toUpperCase() : ""))
    .join("");
};

const RemoteVideoTile = ({ user }: { user: IAgoraRTCRemoteUser }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const label = typeof user.uid === "string" ? user.uid : `User ${user.uid}`;
  const initials = getInitials(label);

  useEffect(() => {
    if (!user.videoTrack || !ref.current) return;
    user.videoTrack.play(ref.current);
    return () => {
      user.videoTrack?.stop();
    };
  }, [user.videoTrack]);

  return (
    <div className="live-room__student">
      <div className="live-room__student-video">
        {user.videoTrack ? (
          <div ref={ref} style={{ width: "100%", height: "100%" }} />
        ) : (
          <div className="live-room__student-placeholder">{initials}</div>
        )}
      </div>
      <div className="live-room__student-info">
        <div className="live-room__student-name">{label}</div>
      </div>
    </div>
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
  const [status, setStatus] = useState("Ulanmoqda");
  const [error, setError] = useState<string | null>(null);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [agoraInfo, setAgoraInfo] = useState<AgoraInfo | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [localTracks, setLocalTracks] = useState<LocalTracks>({});
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoRef = useRef<HTMLDivElement | null>(null);

  const userRole = user?.role || "student";

  useEffect(() => {
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = client;

    const updateRemoteUsers = () => {
      setRemoteUsers([...client.remoteUsers]);
    };

    const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
      await client.subscribe(user, mediaType);
      if (mediaType === "audio") {
        user.audioTrack?.play();
      }
      updateRemoteUsers();
    };

    const handleUserUnpublished = (user: IAgoraRTCRemoteUser) => {
      user.audioTrack?.stop();
      user.videoTrack?.stop();
      updateRemoteUsers();
    };

    const handleUserJoined = () => updateRemoteUsers();
    const handleUserLeft = () => updateRemoteUsers();

    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);
    client.on("user-joined", handleUserJoined);
    client.on("user-left", handleUserLeft);

    return () => {
      client.removeAllListeners();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!lessonId) return;
      setLoading(true);
      setError(null);
      try {
        if (!appId) {
          throw new Error("Agora App ID sozlanmagan.");
        }
        const info = await joinLiveLesson(Number(lessonId));
        const tokenInfo = await fetchAgoraToken({
          room_id: info.room_id,
          lesson_id: Number(lessonId),
        });
        if (mounted) {
          setRoomInfo({ room_id: info.room_id, room: info.room });
          setAgoraInfo(tokenInfo);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.response?.data?.error || err?.message || "Live xonaga ulanishda xatolik");
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

  useEffect(() => {
    let cancelled = false;
    const joinAgora = async () => {
      if (!roomInfo || !agoraInfo || !clientRef.current) return;
      try {
        setStatus("Ulanmoqda");
        const client = clientRef.current;
        await client.join(appId!, agoraInfo.channel, agoraInfo.token, agoraInfo.uid || null);

        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        if (cancelled) {
          audioTrack.close();
          videoTrack.close();
          return;
        }
        await client.publish([audioTrack, videoTrack]);
        setLocalTracks({ audio: audioTrack, video: videoTrack });
        setMicEnabled(true);
        setCamEnabled(true);
        if (localVideoRef.current) {
          videoTrack.play(localVideoRef.current);
        }
        setStatus("Ulangan");
      } catch {
        setStatus("Uzildi");
        setError("Agora ulanish xatosi. Sozlamalarni tekshiring.");
      }
    };
    joinAgora();
    return () => {
      cancelled = true;
    };
  }, [roomInfo, agoraInfo]);

  useEffect(() => {
    if (!localTracks.video || userRole !== "student" || !lessonId) return;
    let cancelled = false;
    const videoEl = document.createElement("video");
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.style.position = "fixed";
    videoEl.style.left = "-9999px";
    videoEl.style.top = "-9999px";

    try {
      const stream = new MediaStream([localTracks.video.getMediaStreamTrack()]);
      videoEl.srcObject = stream;
      document.body.appendChild(videoEl);
      videoEl.play().catch(() => {});
    } catch {
      // ignore
    }

    const captureFrame = async () => {
      if (!videoEl.videoWidth || !videoEl.videoHeight) return null;
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
      if (cancelled) return;
      const frame = await captureFrame();
      if (!frame) return;
      try {
        await sendPresence(Number(lessonId), frame);
      } catch {
        // ignore presence errors
      }
    };

    tick();
    const timer = window.setInterval(tick, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      videoEl.pause();
      videoEl.srcObject = null;
      videoEl.remove();
    };
  }, [localTracks.video, userRole, lessonId]);

  const handleLeave = async () => {
    try {
      if (roomInfo?.room_id) {
        await leaveLiveRoom(roomInfo.room_id);
      }
    } catch {
      // ignore
    }

    try {
      localTracks.audio?.close();
      localTracks.video?.close();
      await clientRef.current?.leave();
    } catch {
      // ignore
    }

    setStatus("Uzildi");
    navigate(-1);
  };

  const handleEnd = async () => {
    if (!roomInfo?.room_id) return;
    try {
      await endLiveRoom(roomInfo.room_id);
    } catch {
      // ignore
    }
    handleLeave();
  };

  const toggleMic = async () => {
    if (!localTracks.audio) return;
    const next = !micEnabled;
    await localTracks.audio.setEnabled(next);
    setMicEnabled(next);
  };

  const toggleCam = async () => {
    if (!localTracks.video) return;
    const next = !camEnabled;
    await localTracks.video.setEnabled(next);
    setCamEnabled(next);
  };

  if (loading) {
    return (
      <div className="live-room__loading">
        <Spin size="large" />
      </div>
    );
  }

  if (error || !roomInfo || !agoraInfo) {
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

  return (
    <div className="live-room">
      <header className="live-room__header">
        <div className="live-room__header-main">
          <div className="live-room__title">Live dars</div>
          <div className="live-room__subtitle">{title}</div>
          <div className="live-room__meta">
            <span className="live-room__pill live-room__pill--live">JONLI</span>
            <span className="live-room__pill">{remoteUsers.length + 1} ishtirokchi</span>
            <span
              className={`live-room__pill live-room__pill--status ${
                status === "Ulangan" ? "is-ok" : status === "Ulanmoqda" ? "is-warn" : "is-bad"
              }`}
            >
              {status}
            </span>
          </div>
        </div>
        <div className="live-room__actions">
          <Button size="small" className="live-room__action" onClick={toggleMic}>
            {micEnabled ? "Mikrofon o'chirish" : "Mikrofon yoqish"}
          </Button>
          <Button size="small" className="live-room__action" onClick={toggleCam}>
            {camEnabled ? "Kamera o'chirish" : "Kamera yoqish"}
          </Button>
          {(userRole === "teacher" || userRole === "admin") && (
            <Button size="small" danger className="live-room__action live-room__action--danger" onClick={handleEnd}>
              Darsni yakunlash
            </Button>
          )}
          <Button size="small" className="live-room__action live-room__action--ghost" onClick={handleLeave}>
            Chiqish
          </Button>
        </div>
      </header>

      <div className="live-room__body">
        <aside className="live-room__left">
          <div className="live-room__panel-title">Ishtirokchilar</div>
          <div className="live-room__students">
            {remoteUsers.length > 0 ? (
              remoteUsers.map((user) => <RemoteVideoTile key={String(user.uid)} user={user} />)
            ) : (
              <div className="live-room__empty live-room__empty--small">Hozircha boshqa ishtirokchi yo'q</div>
            )}
          </div>
        </aside>

        <div className="live-room__stage">
          <div className="live-room__focus-tile">
            <div className="live-room__focus-video" ref={localVideoRef} />
            <div className="live-room__focus-meta">
              <div className="live-room__focus-name">Siz</div>
              <span className="live-room__focus-badge">Local</span>
            </div>
          </div>
        </div>

        <aside className="live-room__right">
          <div className="live-room__panel-title">Agora ulanishi</div>
          <div className="live-room__empty live-room__empty--small">Kanal: {agoraInfo.channel}</div>
        </aside>
      </div>
    </div>
  );
};

export default LiveRoomPage;
