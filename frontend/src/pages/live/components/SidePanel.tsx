import React from "react";
import { resolveStudentGroup } from "../utils/studentSorting";
import type { Student, StudentStatus } from "../utils/studentSorting";
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

const getInitials = (value: string): string => {
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
      // ignore
    }
    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [isActive, track]);

  if (!track || !isActive) {
    return <div className="mini-avatar">{getInitials(studentName)}</div>;
  }
  return <div className="mini-video-element" ref={containerRef} />;
};

// ─── Yuz holati belgisi ──────────────────────────────────────────────────────
const FaceStatusBadge: React.FC<{ faceStatus: string }> = ({ faceStatus }) => {
  if (faceStatus === "DETECTED") {
    return <span className="fs-badge fs-badge--green">✓ Aniqlandi</span>;
  }
  if (faceStatus === "MULTIPLE") {
    return <span className="fs-badge fs-badge--orange">⚠ Ko'p yuz</span>;
  }
  if (faceStatus === "NOT_DETECTED") {
    return <span className="fs-badge fs-badge--red">✕ Ko'rinmaydi</span>;
  }
  return <span className="fs-badge fs-badge--gray">… Tekshirilyapti</span>;
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
  const students = participants.filter((p) => !p.is_teacher);

  return (
    <aside className="side-panel">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="panel-header">
        <span className="panel-header__title">Talabalar</span>
        <span className="panel-header__count">{students.length}</span>
      </div>

      {/* ─── Ro'yxat ─────────────────────────────────────────────────── */}
      <div className="panel-body">
        {students.length === 0 ? (
          <div className="panel-empty">{t("live.panel.noStudents")}</div>
        ) : (
          students.map((student) => {
            const status = studentStatuses.get(student.user_id);
            const uid = String(student.user_id);
            const faceStatus = status?.faceStatus ?? "CHECKING";
            const isHandRaised = Boolean(status?.handRaised || student.hand_raised);
            const isAudioEnabled = Boolean(status?.audioEnabled);
            const isStage = stageUserId === uid;
            const canPlayVideo = activeVideoUids.has(uid);
            const videoTrack = videoTracks.get(uid);
            const groupLabel = resolveStudentGroup(student);

            // Kard border rangi:
            // ko'k   — mikrofon ochiq (stage/audio)
            // yashil — yuz aniqlandi
            // qizil  — yuz aniqlanmadi / ko'p yuz
            // kulrang — tekshirilmoqda
            let cardMod = "card--checking";
            if (isAudioEnabled || isStage) {
              cardMod = "card--audio";
            } else if (faceStatus === "DETECTED") {
              cardMod = "card--verified";
            } else if (faceStatus === "NOT_DETECTED" || faceStatus === "MULTIPLE") {
              cardMod = "card--unverified";
            }

            return (
              <div
                key={student.user_id}
                className={`student-card ${cardMod} ${isTeacher && onStudentSelect ? "student-card--clickable" : ""}`}
                onClick={() => isTeacher && onStudentSelect?.(student.user_id)}
                title={student.user_name}
              >
                {/* Mini video / avatar */}
                <div className="card-thumb">
                  <SidebarMiniVideo
                    track={videoTrack}
                    isActive={canPlayVideo}
                    studentName={student.user_name}
                  />
                  {/* Audio indikator — ko'k dot */}
                  {isAudioEnabled && <span className="card-thumb__mic" title="Mikrofon ochiq" />}
                  {/* Qo'l ko'tarish */}
                  {isHandRaised && !isAudioEnabled && (
                    <span className="card-thumb__hand" title="Qo'l ko'tardi">✋</span>
                  )}
                </div>

                {/* Ma'lumot */}
                <div className="card-info">
                  <span className="card-info__name">{student.user_name}</span>
                  {groupLabel && groupLabel !== "Guruh belgilanmagan" && (
                    <span className="card-info__group">{groupLabel}</span>
                  )}
                  <FaceStatusBadge faceStatus={faceStatus} />
                </div>

                {/* O'qituvchi uchun stage tugmasi */}
                {isTeacher && onStudentAudioToggle && (
                  <button
                    className={`card-mic-btn ${isAudioEnabled ? "card-mic-btn--active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStudentAudioToggle(student.user_id);
                    }}
                    title={isAudioEnabled ? "Markazda" : "Sahngaga chiqarish"}
                  >
                    {isAudioEnabled ? "🔊" : "🎤"}
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
