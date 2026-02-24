import React from "react";
import { sortStudents } from "../utils/studentSorting";
import { StudentTile } from "./StudentTile";
import type { Student, StudentStatus } from "../utils/studentSorting";
import "../styles/StudentGridSection.css";

interface StudentGridSectionProps {
  participants: Student[];
  studentStatuses: Map<number, StudentStatus>;
  videoTracks: Map<number, any>;
  isTeacher?: boolean;
  onClose: () => void;
  onAudioToggle?: (studentId: number) => void;
}

export const StudentGridSection: React.FC<StudentGridSectionProps> = ({
  participants,
  studentStatuses,
  videoTracks,
  isTeacher = false,
  onClose,
  onAudioToggle,
}) => {
  const sortedStudents = sortStudents(participants, studentStatuses);

  return (
    <div className="students-grid-section">
      {/* Header */}
      <div className="students-grid-header">
        <span className="grid-title">
          Talabalar ({participants.filter((p) => !p.is_teacher).length})
        </span>
        <button className="close-btn" onClick={onClose} title="Yashirish">
          ↑
        </button>
      </div>

      {/* Horizontal Scroll Grid */}
      <div className="students-grid">
        {sortedStudents.length === 0 ? (
          <div className="empty-grid">
            <p>Talabalar yo'q</p>
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
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default StudentGridSection;
