import { describe, expect, it, vi } from "vitest";

import { applyUpdatesToMap, type StudentStatusUpdate } from "./useFaceVerification";
import type { StudentStatus } from "../utils/studentSorting";

const buildStatus = (overrides: Partial<StudentStatus>): StudentStatus => ({
  faceStatus: "CHECKING",
  confidence: 0,
  handRaised: false,
  audioEnabled: false,
  timestamp: 0,
  statusReason: undefined,
  lastVerifiedAt: null,
  successRate: null,
  attendanceStatus: null,
  attendanceRatio: null,
  attendanceSamples: null,
  joinedSeconds: null,
  joinedRatio: null,
  eligibilityStatus: null,
  eligibilityReason: null,
  ...overrides,
});

describe("applyUpdatesToMap", () => {
  it("merges sparse websocket updates while preserving previous status fields", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));

    const previous = new Map<number, StudentStatus>([
      [
        7,
        buildStatus({
          faceStatus: "CHECKING",
          confidence: 0.35,
          handRaised: true,
          attendanceStatus: "present",
          attendanceRatio: 0.55,
          attendanceSamples: 4,
          joinedSeconds: 1600,
          joinedRatio: 0.44,
          eligibilityStatus: "risk",
          eligibilityReason: "Need more duration",
        }),
      ],
    ]);

    const updates: StudentStatusUpdate[] = [
      {
        student_id: 7,
        face_detection_status: "DETECTED",
        confidence: 0.91,
        hand_raised: false,
        success_rate: 88,
      },
    ];

    const next = applyUpdatesToMap(previous, updates);
    const updated = next.get(7);

    expect(updated).toMatchObject({
      faceStatus: "DETECTED",
      confidence: 0.91,
      handRaised: false,
      attendanceStatus: "present",
      attendanceRatio: 0.55,
      attendanceSamples: 4,
      joinedSeconds: 1600,
      joinedRatio: 0.44,
      successRate: 88,
      eligibilityStatus: "risk",
      eligibilityReason: "Need more duration",
      timestamp: new Date("2026-03-15T12:00:00Z").valueOf(),
    });
    expect(previous.get(7)?.faceStatus).toBe("CHECKING");

    vi.useRealTimers();
  });

  it("creates a complete default student status entry for new monitoring updates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:05:00Z"));

    const next = applyUpdatesToMap(new Map(), [
      {
        student_id: 15,
        face_detection_status: "NOT_DETECTED",
        status_reason: "No face",
        attendance_status: "absent",
        attendance_ratio: 0.2,
        attendance_samples: 2,
        joined_seconds: 600,
        joined_ratio: 0.1,
        eligibility_status: "blocked",
        eligibility_reason: "Attendance missing",
      },
    ]);

    expect(next.get(15)).toEqual({
      faceStatus: "NOT_DETECTED",
      confidence: 0,
      handRaised: false,
      audioEnabled: false,
      timestamp: new Date("2026-03-15T12:05:00Z").valueOf(),
      statusReason: "No face",
      lastVerifiedAt: null,
      successRate: null,
      attendanceStatus: "absent",
      attendanceRatio: 0.2,
      attendanceSamples: 2,
      joinedSeconds: 600,
      joinedRatio: 0.1,
      eligibilityStatus: "blocked",
      eligibilityReason: "Attendance missing",
    });

    vi.useRealTimers();
  });
});
