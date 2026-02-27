import React from "react";
import {
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
      // Sidebar preview is best-effort and should not break class flow.
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
  const students = participants.filter((participant) => !participant.is_teacher);

  return (
    <aside className="side-panel">
      <div className="panel-header">
        <h3>{t("live.panel.participants")}</h3>
        <span className="count">({students.length})</span>
      </div>

      <div className="panel-body">
        {students.length === 0 ? (
          <div className="empty-state">
            <p>{t("live.panel.noStudents")}</p>
          </div>
        ) : (
          students.map((student) => {
            const status = studentStatuses.get(student.user_id);
            const normalizedStudentId = String(student.user_id);
            const visualStatus = resolveVisualStatus(student, status);
            const faceStatus = status?.faceStatus || "CHECKING";
            const statusDisplay = getFaceStatusDisplay(faceStatus);
            const confidence = status?.confidence || 0;
            const videoTrack = videoTracks.get(normalizedStudentId);
            const canPlayMiniVideo = activeVideoUids.has(normalizedStudentId);
            const isStage = stageUserId === normalizedStudentId;

            return (
              <div
                key={student.user_id}
                className={`panel-participant-row status-${visualStatus} ${
                  isStage ? "stage-user" : ""
                } ${isTeacher && onStudentSelect ? "is-clickable" : ""}`}
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

                <div className="participant-info">
                  <span className="name">{student.user_name}</span>
                  <span className="meta">
                    {isStage ? t("live.panel.onStage") : `ID: ${student.user_id}`}
                  </span>
                </div>

                <div
                  className={`status-dot ${statusDisplay.animation}`}
                  style={{ backgroundColor: statusDisplay.color }}
                  title={statusDisplay.label}
                />

                {confidence > 0 && (
                  <span className="confidence">{(confidence * 100).toFixed(0)}%</span>
                )}

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
          })
        )}
      </div>
    </aside>
  );
};

export default SidePanel;
