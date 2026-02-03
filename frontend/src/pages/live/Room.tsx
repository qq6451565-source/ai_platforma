import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  ILocalVideoTrack,
  IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";
import { Button, Spin, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";

import {
  endLiveRoom,
  fetchAgoraToken,
  fetchLiveState,
  joinLiveLesson,
  leaveLiveRoom,
  raiseHand,
  setStageUser,
  togglePushToTalk,
} from "../../api/live";
import type { LiveParticipantState } from "../../api/live";
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

const appId = import.meta.env.VITE_AGORA_APP_ID as string | undefined;

const getInitials = (value: string) => {
  const cleaned = value.trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => (part[0] ? part[0].toUpperCase() : ""))
    .join("");
};

type ParticipantTileProps = {
  label: string;
  videoTrack?: ILocalVideoTrack | IAgoraRTCRemoteUser["videoTrack"] | null;
  isRaised?: boolean;
  isClickable?: boolean;
  onClick?: () => void;
  badge?: string;
};

const ParticipantTile = ({
  label,
  videoTrack,
  isRaised,
  isClickable,
  onClick,
  badge,
}: ParticipantTileProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const initials = getInitials(label);

  useEffect(() => {
    if (!videoTrack || !ref.current) return;
    videoTrack.play(ref.current);
    return () => {
      videoTrack.stop();
    };
  }, [videoTrack]);

  return (
    <div
      className={`live-room__student ${isRaised ? "is-raised" : ""} ${
        isClickable ? "is-clickable" : ""
      }`}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : -1}
      onKeyDown={(evt) => {
        if (isClickable && (evt.key === "Enter" || evt.key === " ")) {
          evt.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="live-room__student-video">
        {videoTrack ? (
          <div ref={ref} style={{ width: "100%", height: "100%" }} />
        ) : (
          <div className="live-room__student-placeholder">{initials}</div>
        )}
      </div>
      <div className="live-room__student-info">
        <div className="live-room__student-name">{label}</div>
        {badge && <div className="live-room__student-role">{badge}</div>}
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
  const [stageUserId, setStageUserId] = useState<number | null>(null);
  const [allowPtt, setAllowPtt] = useState(false);
  const [participants, setParticipants] = useState<LiveParticipantState[]>([]);
  const [handRaised, setHandRaised] = useState(false);
  const [screenTrack, setScreenTrack] = useState<ILocalVideoTrack | null>(null);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const stageVideoRef = useRef<HTMLDivElement | null>(null);
  const localPreviewRef = useRef<HTMLDivElement | null>(null);

  const userRole = user?.role || "student";
  const isTeacher = userRole === "teacher" || userRole === "admin";
  const localUserId = user?.id ? Number(user.id) : null;

  const remoteMap = useMemo(() => {
    const map = new Map<number, IAgoraRTCRemoteUser>();
    remoteUsers.forEach((remote) => {
      const raw = remote.uid;
      const uid = typeof raw === "string" ? Number(raw) : Number(raw);
      if (!Number.isNaN(uid)) {
        map.set(uid, remote);
      }
    });
    return map;
  }, [remoteUsers]);

  const effectiveStageUserId = stageUserId ?? (isTeacher ? localUserId : null);
  const isStageUser = Boolean(localUserId && effectiveStageUserId === localUserId);

  const stageParticipant = useMemo(
    () => participants.find((p) => p.user_id === effectiveStageUserId),
    [participants, effectiveStageUserId]
  );

  const refreshState = useCallback(async () => {
    if (!roomInfo?.room_id) return;
    try {
      const data = await fetchLiveState({ room_id: roomInfo.room_id });
      setStageUserId(data.stage_user_id ?? null);
      setAllowPtt(Boolean(data.allow_ptt));
      setParticipants(data.participants || []);
      const me = data.participants?.find((p) => p.user_id === localUserId);
      setHandRaised(Boolean(me?.hand_raised));
    } catch {
      // ignore state errors
    }
  }, [roomInfo?.room_id, localUserId]);

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
    if (!roomInfo?.room_id) return;
    refreshState();
    const timer = window.setInterval(refreshState, 4000);
    return () => {
      window.clearInterval(timer);
    };
  }, [roomInfo?.room_id, refreshState]);

  useEffect(() => {
    if (!localTracks.audio) return;
    if (userRole !== "student") return;

    if (isStageUser) {
      localTracks.audio.setEnabled(true).then(() => setMicEnabled(true)).catch(() => {});
      return;
    }

    localTracks.audio.setEnabled(false).then(() => setMicEnabled(false)).catch(() => {});
  }, [isStageUser, userRole, localTracks.audio, allowPtt]);

  useEffect(() => {
    if (!localTracks.video || !localPreviewRef.current) return;
    if (isStageUser) return;
    localTracks.video.play(localPreviewRef.current);
    return () => {
      localTracks.video?.stop();
    };
  }, [localTracks.video, isStageUser]);

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
      screenTrack?.close();
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
    if (userRole === "student" && !isStageUser) return;
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

  const handleRaiseHand = async () => {
    if (!roomInfo?.room_id) return;
    const next = !handRaised;
    try {
      await raiseHand(roomInfo.room_id, next);
      setHandRaised(next);
      refreshState();
    } catch {
      // ignore
    }
  };

  const handleStageSelect = async (userId?: number | null) => {
    if (!roomInfo?.room_id) return;
    try {
      await setStageUser(roomInfo.room_id, userId ?? null);
      refreshState();
    } catch {
      // ignore
    }
  };

  const handleTogglePtt = async () => {
    if (!roomInfo?.room_id) return;
    try {
      await togglePushToTalk(roomInfo.room_id, !allowPtt);
      refreshState();
    } catch {
      // ignore
    }
  };

  const handlePTTDown = async () => {
    if (!localTracks.audio) return;
    await localTracks.audio.setEnabled(true);
    setMicEnabled(true);
  };

  const handlePTTUp = async () => {
    if (!localTracks.audio) return;
    await localTracks.audio.setEnabled(false);
    setMicEnabled(false);
  };

  const handleScreenShare = async () => {
    if (!clientRef.current || !isStageUser) return;
    if (screenTrack) {
      try {
        await clientRef.current.unpublish(screenTrack);
      } catch {
        // ignore
      }
      screenTrack.stop();
      screenTrack.close();
      setScreenTrack(null);
      if (localTracks.video) {
        await clientRef.current.publish(localTracks.video);
      }
      return;
    }

    try {
      const created = await AgoraRTC.createScreenVideoTrack({ encoderConfig: "1080p_1" }, "auto");
      const track = Array.isArray(created) ? created[0] : created;
      if (localTracks.video) {
        await clientRef.current.unpublish(localTracks.video);
      }
      await clientRef.current.publish(track);
      track.on("track-ended", () => {
        handleScreenShare();
      });
      setScreenTrack(track);
    } catch {
      // ignore
    }
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

  const studentTiles = participants.filter((p) => !p.is_teacher && p.user_id !== effectiveStageUserId);
  const stageLabel = stageParticipant?.user_name || (isStageUser ? "Siz" : "Markaz");

  const teacherId = participants.find((p) => p.is_teacher)?.user_id;

  const stageVideoTrack = useMemo(() => {
    if (!effectiveStageUserId) return null;
    if (localUserId && effectiveStageUserId === localUserId) {
      return screenTrack ?? localTracks.video ?? null;
    }
    const remote = remoteMap.get(effectiveStageUserId);
    return remote?.videoTrack ?? null;
  }, [effectiveStageUserId, localUserId, localTracks.video, remoteMap, screenTrack]);


  useEffect(() => {
    if (!stageVideoTrack || !stageVideoRef.current) return;
    stageVideoTrack.play(stageVideoRef.current);
    return () => {
      stageVideoTrack.stop();
    };
  }, [stageVideoTrack]);

  const totalCount = participants.length || remoteUsers.length + 1;

  return (
    <div className="live-room">
      <header className="live-room__header">
        <div className="live-room__header-main">
          <div className="live-room__title">Live dars</div>
          <div className="live-room__subtitle">{title}</div>
          <div className="live-room__meta">
            <span className="live-room__pill live-room__pill--live">JONLI</span>
            <span className="live-room__pill">{totalCount} ishtirokchi</span>
            {handRaised && !isTeacher && (
              <span className="live-room__pill live-room__pill--hand">Qo'l ko'tarildi</span>
            )}
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
          {(isTeacher || isStageUser) && (
            <Button size="small" className="live-room__action" onClick={toggleMic}>
              {micEnabled ? "Mikrofon o'chirish" : "Mikrofon yoqish"}
            </Button>
          )}
          <Button size="small" className="live-room__action" onClick={toggleCam}>
            {camEnabled ? "Kamera o'chirish" : "Kamera yoqish"}
          </Button>
          {isStageUser && (
            <Button size="small" className="live-room__action" onClick={handleScreenShare}>
              {screenTrack ? "Ekran ulashishni to'xtatish" : "Ekran ulashish"}
            </Button>
          )}
          {isTeacher && (
            <Button size="small" className="live-room__action" onClick={handleTogglePtt}>
              {allowPtt ? "PTT o'chirish" : "PTT yoqish"}
            </Button>
          )}
          {!isTeacher && !isStageUser && allowPtt && (
            <Button
              size="small"
              className="live-room__action live-room__action--ptt"
              onMouseDown={handlePTTDown}
              onMouseUp={handlePTTUp}
              onMouseLeave={handlePTTUp}
              onTouchStart={handlePTTDown}
              onTouchEnd={handlePTTUp}
            >
              Gapirish (bosib tur)
            </Button>
          )}
          {!isTeacher && !isStageUser && (
            <Button size="small" className="live-room__action" onClick={handleRaiseHand}>
              {handRaised ? "Qo'lni tushirish" : "Qo'l ko'tarish"}
            </Button>
          )}
          {isTeacher && teacherId && effectiveStageUserId && teacherId !== effectiveStageUserId && (
            <Button size="small" className="live-room__action" onClick={() => handleStageSelect(teacherId)}>
              O'qituvchini markazga
            </Button>
          )}
          {isTeacher && (
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
          <div className="live-room__panel-title">Talabalar</div>
          <div className="live-room__students">
            {studentTiles.length > 0 ? (
              studentTiles.map((p) => {
                const isLocal = localUserId === p.user_id;
                const remote = remoteMap.get(p.user_id);
                const track = isLocal ? localTracks.video : remote?.videoTrack;
                const label = isLocal ? `${p.user_name} (Siz)` : p.user_name;
                return (
                  <ParticipantTile
                    key={p.user_id}
                    label={label}
                    videoTrack={track}
                    isRaised={p.hand_raised}
                    isClickable={isTeacher}
                    onClick={isTeacher ? () => handleStageSelect(p.user_id) : undefined}
                  />
                );
              })
            ) : (
              <div className="live-room__empty live-room__empty--small">Hozircha boshqa ishtirokchi yo'q</div>
            )}
          </div>
          {!isTeacher && !isStageUser && localTracks.video && (
            <div className="live-room__self-preview">
              <div className="live-room__panel-title">Siz</div>
              <div className="live-room__self-video" ref={localPreviewRef} />
            </div>
          )}
        </aside>

        <div className="live-room__stage">
          <div className="live-room__focus-tile">
            {stageVideoTrack ? (
              <div className="live-room__focus-video" ref={stageVideoRef} />
            ) : (
              <div className="live-room__focus-placeholder">Video yo'q</div>
            )}
            <div className="live-room__focus-meta">
              <div className="live-room__focus-name">{stageLabel}</div>
              {stageParticipant?.role && (
                <span className="live-room__focus-badge">
                  {stageParticipant.role === "teacher" ? "O'qituvchi" : stageParticipant.role}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveRoomPage;
