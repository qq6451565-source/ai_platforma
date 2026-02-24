import React from "react";
import { getGroupedStudents, getFaceStatusDisplay } from "../utils/studentSorting";
import type { Student, StudentStatus } from "../utils/studentSorting";
import { AudioOutlined, AudioMutedOutlined } from "@ant-design/icons";
import "../styles/SidePanel.css";

interface SidePanelProps {
  participants: Student[];
  studentStatuses: Map<number, StudentStatus>;
  isTeacher: boolean;
  onStudentAudioToggle?: (studentId: number) => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  participants,
  studentStatuses,
  isTeacher,
  onStudentAudioToggle,
}) => {
  const groupedStudents = getGroupedStudents(participants, studentStatuses);
  const totalCount = participants.filter((p) => !p.is_teacher).length;

  return (
    <aside className="side-panel">
      {/* Header */}
      <div className="panel-header">
        <h3>Ishtirokchilar</h3>
        <span className="count">({totalCount})</span>
      </div>

      {/* Body with grouped students */}
      <div className="panel-body">
        {groupedStudents.length === 0 ? (
          <div className="empty-state">
            <p>Talabalar yo'q</p>
          </div>
        ) : (
          groupedStudents.map((group) => (
            <div key={group.group} className="student-group">
              {/* Group Header */}
              <div className="group-header">
                <span className="group-title">{group.group}</span>
                <span className="group-count">({group.students.length})</span>
              </div>

              {/* Group Students */}
              <div className="group-students">
                {group.students.map((student) => {
                  const status = studentStatuses.get(student.user_id);
                  const isHandRaised =
                    status?.handRaised || student.hand_raised;
                  const faceStatus = status?.faceStatus || "CHECKING";
                  const confidence = status?.confidence || 0;
                  const statusDisplay = getFaceStatusDisplay(faceStatus);

                  return (
                    <div
                      key={student.user_id}
                      className={`panel-participant-row ${
                        isHandRaised ? "hand-raised" : ""
                      } ${
                        faceStatus === "DETECTED" ? "verified" : ""
                      } ${
                        faceStatus === "NOT_DETECTED" ? "not-verified" : ""
                      }`}
                      style={{
                        borderLeftColor: statusDisplay.color,
                        background: statusDisplay.bgColor,
                      }}
                    >
                      {/* Status Badge */}
                      <div className="status-badge">
                        <span
                          className={`status-icon ${statusDisplay.animation}`}
                        >
                          {statusDisplay.icon}
                        </span>
                      </div>

                      {/* Student Info */}
                      <div className="participant-info">
                        <span className="name">{student.user_name}</span>
                        {confidence > 0 && (
                          <span className="confidence">
                            {(confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>

                      {/* Audio Control (teacher only) */}
                      {isTeacher && (
                        <button
                          className="audio-control-btn"
                          onClick={() => onStudentAudioToggle?.(student.user_id)}
                          title={
                            status?.audioEnabled
                              ? "Mikrofon o'chirib yuborish"
                              : "Mikrofon qo'shish"
                          }
                        >
                          {status?.audioEnabled ? (
                            <AudioOutlined style={{ fontSize: "12px" }} />
                          ) : (
                            <AudioMutedOutlined style={{ fontSize: "12px" }} />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

export default SidePanel;
