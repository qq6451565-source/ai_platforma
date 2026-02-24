import React, { useEffect, useRef } from "react";
import { AudioOutlined, AudioMutedOutlined } from "@ant-design/icons";
import { getFaceStatusDisplay } from "../utils/studentSorting";
import type { Student, StudentStatus } from "../utils/studentSorting";
import "../styles/StudentTile.css";

interface StudentTileProps {
  student: Student;
  status?: StudentStatus;
  videoTrack?: any;
  isTeacher?: boolean;
  onAudioToggle?: (studentId: number) => void;
}

export const StudentTile: React.FC<StudentTileProps> = ({
  student,
  status,
  videoTrack,
  isTeacher = false,
  onAudioToggle,
}) => {
  const videoRef = useRef<HTMLDivElement | null>(null);

  // Play video track
  useEffect(() => {
    if (!videoTrack || !videoRef.current) return;

    videoTrack.play(videoRef.current);

    return () => {
      videoTrack.stop();
    };
  }, [videoTrack]);

  const faceStatus = status?.faceStatus || "CHECKING";
  const confidence = status?.confidence || 0;
  const isHandRaised = status?.handRaised || student.hand_raised;
  const isAudioEnabled = status?.audioEnabled || false;
  const statusDisplay = getFaceStatusDisplay(faceStatus);

  return (
    <div
      className={`student-tile ${faceStatus.toLowerCase()}`}
      title={student.user_name}
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
      {isTeacher && (
        <button
          className={`audio-control-btn ${isAudioEnabled ? "enabled" : ""}`}
          onClick={() => onAudioToggle?.(student.user_id)}
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
