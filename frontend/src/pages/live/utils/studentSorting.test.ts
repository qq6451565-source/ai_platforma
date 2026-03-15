import { describe, expect, it } from "vitest";

import {
  getStudentMetricChips,
  sortStudents,
  summarizeEligibility,
  type Student,
  type StudentStatus,
} from "./studentSorting";

const buildStudent = (overrides: Partial<Student>): Student => ({
  user_id: 0,
  user_name: "Student",
  is_teacher: false,
  hand_raised: false,
  role: "student",
  group_name: "SE-201",
  ...overrides,
});

const buildStatus = (overrides: Partial<StudentStatus>): StudentStatus => ({
  faceStatus: "CHECKING",
  confidence: 0,
  handRaised: false,
  audioEnabled: false,
  timestamp: 0,
  ...overrides,
});

describe("studentSorting", () => {
  it("prioritizes hand-raised and verified students before failed and pending ones", () => {
    const students: Student[] = [
      buildStudent({ user_id: 1, user_name: "Zafar" }),
      buildStudent({ user_id: 2, user_name: "Ali" }),
      buildStudent({ user_id: 3, user_name: "Bek" }),
      buildStudent({ user_id: 4, user_name: "Dilshod" }),
    ];
    const statuses = new Map<number, StudentStatus>([
      [1, buildStatus({ faceStatus: "DETECTED", confidence: 0.74 })],
      [2, buildStatus({ handRaised: true, confidence: 0.1 })],
      [3, buildStatus({ faceStatus: "NOT_DETECTED", confidence: 0.99 })],
      [4, buildStatus({ faceStatus: "CHECKING", confidence: 0.85 })],
    ]);

    const ordered = sortStudents(students, statuses).map((student) => student.user_id);

    expect(ordered).toEqual([2, 1, 3, 4]);
  });

  it("builds live metric chips only for populated attendance progress", () => {
    const chips = getStudentMetricChips(
      buildStatus({
        joinedSeconds: 1800,
        joinedRatio: 0.72,
        successRate: 83,
        attendanceSamples: 5,
      })
    );

    expect(chips).toEqual([
      { key: "joined", label: "Qat", value: "72%" },
      { key: "face", label: "Face", value: "83%" },
      { key: "checks", label: "Tek", value: "5" },
    ]);
  });

  it("summarizes eligibility tones for students and ignores teachers", () => {
    const students: Student[] = [
      buildStudent({ user_id: 1, user_name: "Ali" }),
      buildStudent({ user_id: 2, user_name: "Bek" }),
      buildStudent({ user_id: 3, user_name: "Dilshod" }),
      buildStudent({ user_id: 9, user_name: "Teacher", is_teacher: true, role: "teacher" }),
    ];
    const statuses = new Map<number, StudentStatus>([
      [1, buildStatus({ eligibilityStatus: "eligible", eligibilityReason: "Ready" })],
      [2, buildStatus({ eligibilityStatus: "risk", eligibilityReason: "Almost there" })],
      [3, buildStatus({ eligibilityStatus: "blocked", eligibilityReason: "No attendance" })],
      [9, buildStatus({ eligibilityStatus: "eligible", eligibilityReason: "Teacher" })],
    ]);

    const summary = summarizeEligibility(students, statuses);

    expect(summary).toEqual({
      eligible: 1,
      risk: 1,
      blocked: 1,
    });
  });
});
