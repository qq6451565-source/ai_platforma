import { useMemo } from "react";
import styles from "./ParticipantsSidebar.module.css";
import { useLiveRoomStore } from "./useLiveRoomStore";
import ParticipantCard from "./ParticipantCard";

export default function ParticipantsSidebar({ isTeacherView }) {
  const participants = useLiveRoomStore((state) => state.participants);
  const teacherId = useLiveRoomStore((state) => state.teacherId);

  const studentParticipants = useMemo(
    () => participants.filter((participant) => participant.id !== teacherId),
    [participants, teacherId]
  );

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h3 className={styles.title}>Talabalar</h3>
        <span className={styles.count}>({studentParticipants.length})</span>
      </div>

      <div className={styles.list}>
        {studentParticipants.length ? (
          studentParticipants.map((participant) => (
            <ParticipantCard
              key={participant.id}
              participant={participant}
              isTeacherView={isTeacherView}
            />
          ))
        ) : (
          <div className={styles.empty}>Hozircha talaba yo'q</div>
        )}
      </div>
    </aside>
  );
}

