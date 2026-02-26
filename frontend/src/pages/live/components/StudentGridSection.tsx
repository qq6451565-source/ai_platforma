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
  videoTracks: Map<number, PlayableVideoTrack>;
  isTeacher?: boolean;
  onClose: () => void;
  onAudioToggle?: (studentId: number) => void;
  onStudentSelect?: (studentId: number) => void;
  stageUserId?: number | null;
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
            const videoTrack = videoTracks.get(student.user_id);

            return (
              <StudentTile
                key={student.user_id}
                student={student}
                status={status}
                videoTrack={videoTrack}
                isTeacher={isTeacher}
                onAudioToggle={onAudioToggle}
                onSelect={onStudentSelect}
                isStage={stageUserId === student.user_id}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default StudentGridSection;
