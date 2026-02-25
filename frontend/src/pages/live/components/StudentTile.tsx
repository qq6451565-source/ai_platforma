import React, { useEffect, useRef } from "react";
import { AudioOutlined, AudioMutedOutlined } from "@ant-design/icons";
import { getFaceStatusDisplay } from "../utils/studentSorting";
import type { Student, StudentStatus } from "../utils/studentSorting";
import "../styles/StudentTile.css";

interface PlayableVideoTrack {
  play: (element: HTMLElement) => void;
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
  const videoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!videoTrack || !videoRef.current) return;
    try {
      videoTrack.play(videoRef.current);
    } catch (error) {
      console.error("Error playing video track:", error);
    }

    return () => {
      // WHY: Agora remote tracks are often shared between multiple UI surfaces (stage + grid).
      // Calling stop() here tears down playback globally and can blank out other active views.
      // We only detach this tile's DOM node and let the owner lifecycle close tracks (without innerHTML writes).
      if (videoRef.current) {
        videoRef.current.replaceChildren();
      }
    };
  }, [videoTrack, student.user_id, student.user_name]);

  const faceStatus = status?.faceStatus || "CHECKING";
  const confidence = status?.confidence || 0;
  const isHandRaised = status?.handRaised || student.hand_raised;
  const isAudioEnabled = status?.audioEnabled || false;
  const statusDisplay = getFaceStatusDisplay(faceStatus);

  return (
    <div
      className={`student-tile ${faceStatus.toLowerCase()} ${isStage ? "is-stage" : ""} ${onSelect ? "is-clickable" : ""}`}
      title={student.user_name}
      onClick={() => onSelect?.(student.user_id)}
    >
      {/* Video Container */}
      <div className="student-video-container">
        {videoTrack ? (
          <div ref={videoRef} className="video-element" />
        ) : (
          <div className="video-placeholder">
            {student.user_name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Face Status Indicator */}
      <div
        className={`face-status-indicator ${faceStatus.toLowerCase()}`}
        style={{
          background: `linear-gradient(135deg, ${statusDisplay.color}, ${statusDisplay.color}dd)`,
          boxShadow: `0 0 12px ${statusDisplay.color}cc`,
        }}
      >
        <div className="status-ring" />
      </div>

      {/* Student Info Section */}
      <div className="student-info">
        <div className="student-name">{student.user_name}</div>

        {/* Status Badges */}
        <div className="student-badges">
          {isStage && (
            <span className="badge stage" title="Markazda">
              STAGE
            </span>
          )}
          {isHandRaised && (
            <span className="badge hand-raised" title="Qol ko'tarilgan">
              🔵
            </span>
          )}
          {confidence > 0 && (
            <span className="badge confidence" title={`Aniqlik: ${(confidence * 100).toFixed(0)}%`}>
              {(confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {/* Audio Control Button (if teacher) */}
      {isTeacher && onAudioToggle && (
        <button
          className={`audio-control-btn ${isAudioEnabled ? "enabled" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onAudioToggle?.(student.user_id);
          }}
          title={
            isAudioEnabled
              ? "Mikrofon o'chirib yuborish"
              : "Mikrofon qo'shish"
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
