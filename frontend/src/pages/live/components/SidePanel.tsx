import React from "react";
import {
  getGroupedStudents,
  getFaceStatusDisplay,
  resolveVisualStatus,
} from "../utils/studentSorting";
import type { Student, StudentStatus } from "../utils/studentSorting";
import { AudioOutlined, AudioMutedOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import "../styles/SidePanel.css";

interface PlayableVideoTrack {
  play: (element: HTMLElement) => void | Promise<void>;
  stop: () => void;
}

interface SidePanelProps {
  participants: Student[];
  studentStatuses: Map<number, StudentStatus>;
  videoTracks: Map<string, PlayableVideoTrack>;
  activeVideoUids: Set<string>;
  isTeacher: boolean;
  onStudentAudioToggle?: (studentId: number) => void;
  onStudentSelect?: (studentId: number) => void;
  stageUserId?: string | null;
}

const getInitials = (value: string) => {
  const cleaned = value.trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => (part[0] ? part[0].toUpperCase() : ""))
    .join("");
};

const SidebarMiniVideo: React.FC<{
  track?: PlayableVideoTrack;
  isActive: boolean;
  studentName: string;
}> = ({ track, isActive, studentName }) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!track || !isActive) {
      container.innerHTML = "";
      return;
    }
    try {
      const playResult = track.play(container);
      Promise.resolve(playResult).catch(() => undefined);
    } catch {
      // Side panel preview should never break the room.
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [isActive, track]);

  if (!track || !isActive) {
    return <div className="mini-avatar">{getInitials(studentName)}</div>;
  }

  return <div className="mini-video-element" ref={containerRef} />;
};

export const SidePanel: React.FC<SidePanelProps> = ({
  participants,
  studentStatuses,
  videoTracks,
  activeVideoUids,
  isTeacher,
  onStudentAudioToggle,
  onStudentSelect,
  stageUserId = null,
}) => {
  const { t } = useTranslation();
  const groupedStudents = getGroupedStudents(participants, studentStatuses);
  const totalCount = participants.filter((p) => !p.is_teacher).length;

  return (
    <aside className="side-panel">
      {/* Header */}
      <div className="panel-header">
        <h3>{t("live.panel.participants")}</h3>
        <span className="count">({totalCount})</span>
      </div>

      {/* Body with grouped students */}
      <div className="panel-body">
        {groupedStudents.length === 0 ? (
          <div className="empty-state">
            <p>{t("live.panel.noStudents")}</p>
          </div>
        ) : (
          groupedStudents.map((group) => (
            <div key={group.key} className="student-group">
              {/* Group Header */}
              <div className="group-header">
                <span className="group-title">{group.group}</span>
                <span className="group-count">({group.students.length})</span>
              </div>

              {/* Group Students */}
              <div className="group-students">
                {group.students.map((student) => {
                  const status = studentStatuses.get(student.user_id);
                  const normalizedStudentId = String(student.user_id);
                  const faceStatus = status?.faceStatus || "CHECKING";
                  const confidence = status?.confidence || 0;
                  const visualStatus = resolveVisualStatus(student, status);
                  const statusDisplay =
                    visualStatus === "engaged"
                      ? {
                          color: "#3b82f6",
                          animation: "pulse-blue",
                          icon: "!",
                          label: "Hand raised",
                          bgColor: "rgba(59, 130, 246, 0.12)",
                        }
                      : getFaceStatusDisplay(faceStatus);
                  const videoTrack = videoTracks.get(normalizedStudentId);
                  const canPlayMiniVideo = activeVideoUids.has(normalizedStudentId);

                  return (
                    <div
                      key={student.user_id}
                      className={`panel-participant-row status-${visualStatus} ${
                        stageUserId === normalizedStudentId ? "stage-user" : ""
                      } ${
                        isTeacher && onStudentSelect ? "is-clickable" : ""
                      }`}
                      style={{ borderLeftColor: statusDisplay.color }}
                      onClick={() => {
                        if (isTeacher) {
                          onStudentSelect?.(student.user_id);
                        }
                      }}
                    >
                      <div className="participant-mini-video">
                        <SidebarMiniVideo
                          track={videoTrack}
                          isActive={canPlayMiniVideo}
                          studentName={student.user_name}
                        />
                      </div>

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
                        {stageUserId === normalizedStudentId && (
                          <span className="confidence">{t("live.panel.onStage")}</span>
                        )}
                        {confidence > 0 && (
                          <span className="confidence">
                            {(confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>

                      {/* Audio Control (teacher only) */}
                      {isTeacher && onStudentAudioToggle && (
                        <button
                          className="audio-control-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            onStudentAudioToggle?.(student.user_id);
                          }}
                          title={
                            status?.audioEnabled
                              ? t("live.panel.disableMic")
                              : t("live.panel.enableMic")
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
