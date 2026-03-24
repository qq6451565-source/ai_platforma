import React from "react";
import { sortStudents } from "../utils/studentSorting";
import { StudentTile } from "./StudentTile";
import type { Student, StudentStatus } from "../utils/studentSorting";
import { useTranslation } from "react-i18next";
import "../styles/StudentGridSection.css";

interface PlayableVideoTrack {
  play: (element: HTMLElement) => void;
  stop: () => void;
}

interface StudentGridSectionProps {
  participants: Student[];
  studentStatuses: Map<number, StudentStatus>;
  videoTracks: Map<string, PlayableVideoTrack>;
  isTeacher?: boolean;
  onClose: () => void;
  onAudioToggle?: (studentId: number) => void;
  onStudentSelect?: (studentId: number) => void;
  stageUserId?: string | null;
}

export const StudentGridSection: React.FC<StudentGridSectionProps> = ({
  participants,
  studentStatuses,
  videoTracks,
  isTeacher = false,
  onClose,
  onAudioToggle,
  onStudentSelect,
  stageUserId = null,
}) => {
  const { t } = useTranslation();
  const sortedStudents = sortStudents(participants, studentStatuses);

  // DEBUG: Log video tracks availability
  React.useEffect(() => {
    console.debug("[StudentGridSection] videoTracks keys:", Array.from(videoTracks.keys()));
    console.debug("[StudentGridSection] participants user_ids:", participants.map(p => String(p.user_id)));
  }, [videoTracks, participants]);

  return (
    <div className="students-grid-section">
      {/* Header */}
      <div className="students-grid-header">
        <span className="grid-title">
          {t("live.grid.students", { count: participants.filter((p) => !p.is_teacher).length })}
        </span>
        <button className="close-btn" onClick={onClose} title={t("live.grid.hide")}>
          {t("common.close")}
        </button>
      </div>

      {/* Horizontal Scroll Grid */}
      <div className="students-grid">
        {sortedStudents.length === 0 ? (
          <div className="empty-grid">
            <p>{t("live.grid.noStudents")}</p>
          </div>
        ) : (
          sortedStudents.map((student) => {
            const status = studentStatuses.get(student.user_id);
            const normalizedStudentId = String(student.user_id);
            const videoTrack = videoTracks.get(normalizedStudentId);

            return (
              <StudentTile
                key={student.user_id}
                student={student}
                status={status}
                videoTrack={videoTrack}
                isTeacher={isTeacher}
                onAudioToggle={onAudioToggle}
                onSelect={onStudentSelect}
                isStage={stageUserId === normalizedStudentId}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default StudentGridSection;
