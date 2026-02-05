import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ILocalVideoTrack,
} from "agora-rtc-sdk-ng";
import { Spin, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { AudioOutlined, AudioMutedOutlined, VideoCameraOutlined, StopOutlined, HandOutlined, LogoutOutlined, TeamOutlined } from "@ant-design/icons";

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
import { Button } from "../../components/ui";
import "./Room.css";

const appId = import.meta.env.VITE_AGORA_APP_ID as string | undefined;

const getInitials = (value: string) => {
  const cleaned = value.trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => (part[0] ? part[0].toUpperCase() : "")).join("");
};

const ParticipantTile = ({ label, videoTrack, isRaised, isClickable, onClick, badge }: any) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const initials = getInitials(label);

  useEffect(() => {
    if (!videoTrack || !ref.current) return;
    videoTrack.play(ref.current);
    return () => videoTrack.stop();
  }, [videoTrack]);

  return (
    <div className={`participant-tile ${isRaised ? "is-raised" : ""} ${isClickable ? "is-clickable" : ""}`} onClick={onClick}>
      <div className="participant-video">
        {videoTrack ? <div ref={ref} className="h-full w-full" /> : <div className="participant-placeholder">{initials}</div>}
      </div>
      <div className="participant-info">
        <div className="participant-name">{label}</div>
        {badge && <div className="participant-badge">{badge}</div>}
      </div>
    </div>
  );
};

const LiveRoomPage = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { data: user } = useMe();
  const { data: lessons } = useQuery({ queryKey: ["lessons"], queryFn: fetchLessons });

  const lesson = useMemo(() => lessons?.find((l: any) => String(l.id) === String(lessonId)), [lessons, lessonId]);

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
  const [allowPtt, setAllowPtt] = useState(false);
  const [participants, setParticipants] = useState<LiveParticipantState[]>([]);
  const [handRaised, setHandRaised] = useState(false);
  const [screenTrack, setScreenTrack] = useState<ILocalVideoTrack | null>(null);
  const [showParticipants, setShowParticipants] = useState(false);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const stageVideoRef = useRef<HTMLDivElement | null>(null);

  const syncRemoteUsers = useCallback(() => {
    if (!clientRef.current) return;
    setRemoteUsers([...clientRef.current.remoteUsers]);
  }, []);

  const userRole = user?.role || "student";
  const isTeacher = userRole === "teacher" || userRole === "admin";
  const localUserId = user?.id ? Number(user.id) : null;

  const remoteMap = useMemo(() => {
    const map = new Map<number, IAgoraRTCRemoteUser>();
    remoteUsers.forEach((remote) => {
      const uid = Number(remote.uid);
      if (!Number.isNaN(uid)) map.set(uid, remote);
    });
    return map;
  }, [remoteUsers]);

  const fallbackRemote = useMemo(() => remoteUsers.find((u) => u.videoTrack), [remoteUsers]);
  const effectiveStageUserId = stageUserId ?? (isTeacher ? localUserId : null);
  const isStageUser = Boolean(localUserId && effectiveStageUserId === localUserId);
  const stageParticipant = useMemo(() => participants.find((p) => p.user_id === effectiveStageUserId), [participants, effectiveStageUserId]);

  const refreshState = useCallback(async () => {
    if (!roomInfo?.room_id) return;
    try {
      const data = await fetchLiveState({ room_id: roomInfo.room_id });
      setParticipants(data.participants || []);
      const teacher = (data.participants || []).find((p: any) => p.is_teacher);
      setStageUserId(data.stage_user_id ?? teacher?.user_id ?? null);
      setAllowPtt(Boolean(data.allow_ptt));
      const me = (data.participants || []).find((p: any) => p.user_id === localUserId);
      setHandRaised(Boolean(me?.hand_raised));
    } catch {}
  }, [roomInfo?.room_id, localUserId]);

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

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!lessonId) return;
      try {
        if (!appId) throw new Error("Agora App ID missing");
        const info = await joinLiveLesson(Number(lessonId));
        const tokenInfo = await fetchAgoraToken({ room_id: info.room_id, lesson_id: Number(lessonId) });
        if (mounted) {
          setRoomInfo({ room_id: info.room_id, room: info.room });
          setAgoraInfo(tokenInfo);
        }
      } catch (err: any) {
        if (mounted) setError(err?.response?.data?.error || err?.message || "Error joining");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [lessonId]);

  useEffect(() => {
    let cancelled = false;
    const joinAgora = async () => {
      if (!roomInfo || !agoraInfo || !clientRef.current) return;
      try {
        const client = clientRef.current;
        await client.join(appId!, agoraInfo.channel, agoraInfo.token, agoraInfo.uid || null);
        const [audio, video] = await AgoraRTC.createMicrophoneAndCameraTracks();
        if (cancelled) { audio.close(); video.close(); return; }
        await client.publish([audio, video]);
        setLocalTracks({ audio, video });
        setStatus("Ulangan");
      } catch {
        setError("Agora error");
      }
    };
    joinAgora();
    return () => { cancelled = true; };
  }, [roomInfo, agoraInfo]);

  useEffect(() => {
    if (!roomInfo?.room_id) return;
    refreshState();
    const timer = setInterval(refreshState, 4000);
    return () => clearInterval(timer);
  }, [roomInfo?.room_id, refreshState]);

  useEffect(() => {
    if (!localTracks.audio) return;
    if (userRole === "student") {
      localTracks.audio.setEnabled(isStageUser).then(() => setMicEnabled(isStageUser)).catch(() => {});
    }
  }, [isStageUser, userRole, localTracks.audio]);

  useEffect(() => {
    if (!localTracks.video || userRole !== "student" || !lessonId) return;
    let cancelled = false;
    const videoEl = document.createElement("video");
    videoEl.muted = true; videoEl.playsInline = true;
    const stream = new MediaStream([localTracks.video.getMediaStreamTrack()]);
    videoEl.srcObject = stream;
    const tick = async () => {
      if (cancelled || !videoEl.videoWidth) return;
      const canvas = document.createElement("canvas");
      canvas.width = videoEl.videoWidth; canvas.height = videoEl.videoHeight;
      canvas.getContext("2d")?.drawImage(videoEl, 0, 0);
      canvas.toBlob(blob => blob && sendPresence(Number(lessonId), blob), "image/jpeg", 0.6);
    };
    const timer = setInterval(tick, 25000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [localTracks.video, userRole, lessonId]);

  const handleLeave = async () => {
    if (roomInfo?.room_id) await leaveLiveRoom(roomInfo.room_id).catch(() => {});
    localTracks.audio?.close(); localTracks.video?.close(); screenTrack?.close();
    await clientRef.current?.leave().catch(() => {});
    navigate(-1);
  };

  const handleEnd = async () => {
    if (roomInfo?.room_id) await endLiveRoom(roomInfo.room_id).catch(() => {});
    handleLeave();
  };

  const stageVideoTrack = useMemo(() => {
    if (effectiveStageUserId) {
      if (localUserId === effectiveStageUserId) return screenTrack ?? localTracks.video;
      return remoteMap.get(effectiveStageUserId)?.videoTrack;
    }
    return fallbackRemote?.videoTrack;
  }, [effectiveStageUserId, localUserId, localTracks.video, remoteMap, screenTrack, fallbackRemote]);

  useEffect(() => {
    if (!stageVideoTrack || !stageVideoRef.current) return;
    stageVideoTrack.play(stageVideoRef.current);
    return () => stageVideoTrack.stop();
  }, [stageVideoTrack]);

  if (loading) return <div className="flex-center h-screen"><Spin size="large" /></div>;
  if (error) return <div className="flex-center h-screen flex-direction-column"><h2 className="text-error">Xatolik</h2><p>{error}</p><Button onClick={() => navigate(-1)}>Orqaga</Button></div>;

  const studentTiles = participants.filter(p => !p.is_teacher && p.user_id !== effectiveStageUserId);

  return (
    <div className="live-page">
      <div className="live-stage">
        <div ref={stageVideoRef} className="stage-video-container" />
        <div className="stage-overlay">
          <div className="stage-top-info">
            <div className="stage-title">{lesson?.subject_name || 'Live dars'}</div>
            <div className="stage-subtitle">{lesson?.topic}</div>
          </div>
          <div className="stage-bottom-info">
            <div className="stage-user-label">{stageParticipant?.user_name || (isStageUser ? "Siz" : "Ma'ruzachi")}</div>
          </div>
        </div>
      </div>

      {showParticipants && (
        <div className="participants-drawer animate-slide-up">
          <div className="drawer-header">
            <h3>Ishtirokchilar ({participants.length})</h3>
            <Button variant="ghost" onClick={() => setShowParticipants(false)}>Yopish</Button>
          </div>
          <div className="drawer-body">
            {participants.map(p => (
              <div key={p.user_id} className="participant-row" onClick={() => isTeacher && handleStageSelect(p.user_id)}>
                <div className="participant-row-info">
                   <div className="participant-row-name">{p.user_name}</div>
                   <div className="caption">{p.role}</div>
                </div>
                {p.hand_raised && <HandOutlined className="text-warning" />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="live-controls">
        <Button
          variant="ghost"
          className={`control-btn ${!micEnabled ? 'is-off' : ''}`}
          icon={micEnabled ? <AudioOutlined /> : <AudioMutedOutlined />}
          onClick={() => {
             const next = !micEnabled;
             localTracks.audio?.setEnabled(next);
             setMicEnabled(next);
          }}
          disabled={userRole === 'student' && !isStageUser}
        />
        <Button
          variant="ghost"
          className={`control-btn ${!camEnabled ? 'is-off' : ''}`}
          icon={camEnabled ? <VideoCameraOutlined /> : <StopOutlined />}
          onClick={() => {
            const next = !camEnabled;
            localTracks.video?.setEnabled(next);
            setCamEnabled(next);
          }}
        />
        {!isTeacher && (
           <Button
             variant="ghost"
             className={`control-btn ${handRaised ? 'is-active' : ''}`}
             icon={<HandOutlined />}
             onClick={async () => {
               const next = !handRaised;
               await raiseHand(roomInfo.room_id, next);
               setHandRaised(next);
             }}
           />
        )}
        <Button
          variant="ghost"
          className="control-btn"
          icon={<TeamOutlined />}
          onClick={() => setShowParticipants(true)}
        />
        <Button
          variant="error"
          className="control-btn exit-btn"
          icon={<LogoutOutlined />}
          onClick={isTeacher ? handleEnd : handleLeave}
        />
      </div>
    </div>
  );
};

export default LiveRoomPage;
