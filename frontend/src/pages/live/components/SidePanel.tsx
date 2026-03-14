import React from "react";
import {
  getFaceStatusDisplay,
  getStudentAttendanceNote,
  getStudentEligibilityBadge,
  getStudentMetricsSummary,
  resolveStudentGroup,
} from "../utils/studentSorting";
import type { Student, StudentStatus } from "../utils/studentSorting";
import { AudioOutlined, AudioMutedOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import "../styles/SidePanel.css";

interface PlayableVideoTrack {
  play: (
    element: HTMLElement,
    options?: { fit?: "cover" | "contain" | "fill"; mirror?: boolean }
  ) => void | Promise<void>;
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
      const playResult = track.play(container, { fit: "cover", mirror: false });
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
            const faceStatus = status?.faceStatus || "CHECKING";
            const statusDisplay = getFaceStatusDisplay(faceStatus);
            const isHandRaised = Boolean(status?.handRaised || student.hand_raised);
            const videoTrack = videoTracks.get(normalizedStudentId);
            const canPlayMiniVideo = activeVideoUids.has(normalizedStudentId);
            const isStage = stageUserId === normalizedStudentId;
            const verificationClass =
              faceStatus === "DETECTED"
                ? "status-verified"
                : faceStatus === "NOT_DETECTED" || faceStatus === "MULTIPLE"
                ? "status-unverified"
                : "status-checking";
            const metricsSummary = getStudentMetricsSummary(status);
            const attendanceNote = getStudentAttendanceNote(status);
            const eligibilityBadge = getStudentEligibilityBadge(status);

            return (
              <div
                key={student.user_id}
                className={`panel-participant-row ${verificationClass} ${
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
                    {resolveStudentGroup(student)}
                  </span>
                  {metricsSummary && <span className="meta meta-metrics">{metricsSummary}</span>}
                  {attendanceNote && <span className="meta meta-attendance">{attendanceNote}</span>}
                  {eligibilityBadge && (
                    <span
                      className={`participant-eligibility-badge ${eligibilityBadge.className}`}
                      title={eligibilityBadge.reason}
                    >
                      {eligibilityBadge.label}
                    </span>
                  )}
                </div>

                <div
                  className={`status-dot ${statusDisplay.animation}`}
                  style={{ backgroundColor: statusDisplay.color }}
                  title={statusDisplay.label}
                />

                <span className={`status-label ${verificationClass.replace("status-", "")}`}>
                  {faceStatus === "DETECTED"
                    ? "Verified"
                    : faceStatus === "NOT_DETECTED" || faceStatus === "MULTIPLE"
                    ? "Unverified"
                    : "Checking"}
                </span>

                {isHandRaised && (
                  <span className="hand-raised-indicator" title={t("live.tile.handRaised")}>
                    <AudioOutlined />
                  </span>
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
                        ? "Hozir markazda gapiryapti"
                        : "Gapirish uchun markazga chiqarish"
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
