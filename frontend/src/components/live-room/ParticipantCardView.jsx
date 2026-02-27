import { useEffect, useMemo, useRef } from "react";
import styles from "./ParticipantCard.module.css";

const getInitials = (value = "") => {
  const chunks = value.trim().split(/\s+/).filter(Boolean);
  if (!chunks.length) return "?";
  return chunks
    .slice(0, 2)
    .map((chunk) => chunk[0].toUpperCase())
    .join("");
};

function MiniTrack({ track }) {
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
      className={styles.video}
      autoPlay
      playsInline
      muted
    />
  );
}

export default function ParticipantCard({ participant, isTeacherView, onSelect }) {
  const statusClassName = useMemo(() => {
    if (participant.isRequestingToSpeak) return styles.requesting;
    if (participant.isVerified) return styles.verified;
    return styles.unverified;
  }, [participant.isRequestingToSpeak, participant.isVerified]);

  const handleCardClick = () => {
    if (!isTeacherView) return;
    onSelect?.(participant);
  };

  return (
    <article
      className={`${styles.card} ${statusClassName} ${isTeacherView ? styles.clickable : ""}`}
      onClick={handleCardClick}
    >
      <div className={styles.preview}>
        {participant.videoTrack ? (
          <MiniTrack track={participant.videoTrack} />
        ) : (
          <div className={styles.avatar}>{getInitials(participant.name)}</div>
        )}
      </div>

      <div className={styles.info}>
        <h4 className={styles.name}>{participant.name}</h4>
        <p className={styles.group}>{participant.group || "Guruh nomi yo'q"}</p>
      </div>
    </article>
  );
}
