import { useMemo } from "react";
import styles from "./ControlsToolbar.module.css";
import { useLiveRoomStore } from "./useLiveRoomStore";

export default function ControlsToolbar({
  currentUserId,
  isTeacherView,
  micEnabled,
  cameraEnabled,
  screenShareEnabled,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
}) {
  const setRequestingToSpeak = useLiveRoomStore((state) => state.setRequestingToSpeak);
  const participants = useLiveRoomStore((state) => state.participants);

  const isRequesting = useMemo(() => {
    const me = participants.find((participant) => participant.id === currentUserId);
    return Boolean(me?.isRequestingToSpeak);
  }, [currentUserId, participants]);

  return (
    <footer className={styles.toolbar}>
      <button
        type="button"
        className={`${styles.button} ${micEnabled ? styles.active : styles.inactive}`}
        onClick={onToggleMic}
      >
        {micEnabled ? "Mic On" : "Mic Off"}
      </button>

      <button
        type="button"
        className={`${styles.button} ${cameraEnabled ? styles.active : styles.inactive}`}
        onClick={onToggleCamera}
      >
        {cameraEnabled ? "Cam On" : "Cam Off"}
      </button>

      <button
        type="button"
        className={`${styles.button} ${screenShareEnabled ? styles.active : styles.inactive}`}
        onClick={onToggleScreenShare}
      >
        {screenShareEnabled ? "Screen On" : "Screen Share"}
      </button>

      {!isTeacherView && (
        <button
          type="button"
          className={`${styles.button} ${isRequesting ? styles.requested : styles.request}`}
          onClick={() => setRequestingToSpeak(currentUserId, true)}
          disabled={isRequesting}
        >
          {isRequesting ? "So'rov yuborildi" : "So'z so'rash"}
        </button>
      )}
    </footer>
  );
}

