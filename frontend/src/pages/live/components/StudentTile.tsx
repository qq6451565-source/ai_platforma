import React, { useEffect, useRef } from "react";
import { AudioOutlined, AudioMutedOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { getFaceStatusDisplay, resolveStudentGroup } from "../utils/studentSorting";
import type { Student, StudentStatus } from "../utils/studentSorting";
import "../styles/StudentTile.css";

interface PlayableVideoTrack {
  play: (
    element: HTMLElement,
    options?: { fit?: "cover" | "contain" | "fill"; mirror?: boolean }
  ) => void;
  stop: () => void;
}

interface StudentTileProps {
  student: Student;
  status?: StudentStatus;
  videoTrack?: PlayableVideoTrack;
  isTeacher?: boolean;
  onAudioToggle?: (studentId: number) => void;
  onSelect?: (studentId: number) => void;
  isStage?: boolean;
}

export const StudentTile: React.FC<StudentTileProps> = ({
  student,
  status,
  videoTrack,
  isTeacher = false,
  onAudioToggle,
  onSelect,
  isStage = false,
}) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!videoTrack || !videoRef.current) return;
    try {
      videoTrack.play(videoRef.current, { fit: "cover", mirror: false });
    } catch (error) {
      console.error("Error playing video track:", error);
    }

    return () => {
      // WHY: Agora remote tracks are often shared between multiple UI surfaces (stage + grid).
      // Calling stop() here tears down playback globally and can blank out other active views.
      // We only detach this tile's DOM node and let the owner lifecycle close tracks.
      if (videoRef.current) {
        videoRef.current.innerHTML = "";
      }
    };
  }, [videoTrack, student.user_id, student.user_name]);

  const faceStatus = status?.faceStatus || "CHECKING";
  const isHandRaised = status?.handRaised || student.hand_raised;
  const isAudioEnabled = status?.audioEnabled || false;
  const statusDisplay = getFaceStatusDisplay(faceStatus);

  return (
    <div
      className={`student-tile ${faceStatus.toLowerCase()} ${isStage ? "is-stage" : ""} ${onSelect ? "is-clickable" : ""}`}
      title={student.user_name}
      onClick={() => onSelect?.(student.user_id)}
    >
      <div className="student-video-container">
        {videoTrack ? (
          <div ref={videoRef} className="video-element" />
        ) : (
          <div className="video-placeholder">
            {student.user_name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div
        className={`face-status-indicator ${faceStatus.toLowerCase()}`}
        style={{
          background: `linear-gradient(135deg, ${statusDisplay.color}, ${statusDisplay.color}dd)`,
          boxShadow: `0 0 12px ${statusDisplay.color}cc`,
        }}
      >
        <div className="status-ring" />
      </div>

      <div className="student-info">
        <div className="student-name">{student.user_name}</div>
        <div className="student-group">{resolveStudentGroup(student)}</div>

        <div className="student-badges">
          {isStage && (
            <span className="badge stage" title={t("live.tile.onStage")}>
              STAGE
            </span>
          )}
          {isHandRaised && (
            <span className="badge hand-raised" title={t("live.tile.handRaised")}>
              <AudioOutlined />
            </span>
          )}
        </div>
      </div>

      {isTeacher && onAudioToggle && (
        <button
          className={`audio-control-btn ${isAudioEnabled ? "enabled" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onAudioToggle?.(student.user_id);
          }}
          title={
            isAudioEnabled
              ? t("live.tile.disableMic")
              : t("live.tile.enableMic")
          }
        >
          {isAudioEnabled ? (
            <AudioOutlined style={{ fontSize: "12px" }} />
          ) : (
            <AudioMutedOutlined style={{ fontSize: "12px" }} />
          )}
        </button>
      )}
    </div>
  );
};

export default StudentTile;
