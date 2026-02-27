import { useEffect, useMemo, useRef } from "react";
import styles from "./StageView.module.css";
import { useLiveRoomStore } from "./useLiveRoomStore";

const getInitials = (value = "") => {
  const chunks = value.trim().split(/\s+/).filter(Boolean);
  if (!chunks.length) return "?";
  return chunks
    .slice(0, 2)
    .map((chunk) => chunk[0].toUpperCase())
    .join("");
};

function StageTrack({ track }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const node = videoRef.current;
    if (!node || !track) return undefined;

    track.attach(node);

    return () => {
      track.detach(node);
    };
  }, [track]);

  if (!track) return null;

  return (
    <video
      ref={videoRef}
      className={styles.stageVideo}
      autoPlay
      playsInline
      muted
    />
  );
}

export default function StageView() {
  const participants = useLiveRoomStore((state) => state.participants);
  const activeSpeakerId = useLiveRoomStore((state) => state.activeSpeakerId);
  const teacherId = useLiveRoomStore((state) => state.teacherId);
  const setActiveSpeaker = useLiveRoomStore((state) => state.setActiveSpeaker);

  const activeParticipant = useMemo(() => {
    const byActiveId = participants.find((participant) => participant.id === activeSpeakerId);
    if (byActiveId) return byActiveId;
    return participants.find((participant) => participant.id === teacherId) || null;
  }, [activeSpeakerId, participants, teacherId]);

  const stageTrack = activeParticipant?.screenTrack || activeParticipant?.videoTrack || null;

  const handleStageClick = () => {
    if (!activeSpeakerId || !teacherId) return;
    if (activeSpeakerId !== teacherId) {
      setActiveSpeaker(teacherId);
    }
  };

  if (!activeParticipant) {
    return (
      <section className={styles.stage}>
        <div className={styles.empty}>Sahna uchun ishtirokchi topilmadi</div>
      </section>
    );
  }

  return (
    <section className={styles.stage} onClick={handleStageClick}>
      {stageTrack ? (
        <StageTrack track={stageTrack} />
      ) : (
        <div className={styles.placeholder}>{getInitials(activeParticipant.name)}</div>
      )}

      <div className={styles.overlay}>
        <div className={styles.name}>{activeParticipant.name}</div>
        <div className={styles.meta}>
          {activeParticipant.isTeacher ? "O'qituvchi" : activeParticipant.group || "Talaba"}
        </div>
      </div>
    </section>
  );
}

