/**
 * Student sorting utilities for live session.
 * Sorts students by: hand_raised → verified → not_verified
 */

export type FaceDetectionStatus = "DETECTED" | "NOT_DETECTED" | "MULTIPLE" | "CHECKING";

export interface StudentStatus {
  faceStatus: FaceDetectionStatus;
  confidence: number;
  handRaised: boolean;
  audioEnabled: boolean;
  timestamp: number;
}

export interface Student {
  user_id: number;
  user_name: string;
  is_teacher: boolean;
  hand_raised: boolean;
}

export interface StudentGroup {
  group: string;
  icon: string;
  students: Student[];
}

/**
 * Sort students into a flat array based on priority:
 * 1. Hand raised (priority 1)
 * 2. Verified/DETECTED (priority 2)
 * 3. Not verified/NOT_DETECTED (priority 3)
 */
export const sortStudents = (
  students: Student[],
  statuses: Map<number, StudentStatus>
): Student[] => {
  const studentsCopy = [...students.filter((s) => !s.is_teacher)];

  return studentsCopy.sort((a, b) => {
    const statusA = statuses.get(a.user_id);
    const statusB = statuses.get(b.user_id);

    // GROUP 1: Hand raised first
    const handRaisedA = statusA?.handRaised || a.hand_raised || false;
    const handRaisedB = statusB?.handRaised || b.hand_raised || false;

    if (handRaisedA !== handRaisedB) {
      return handRaisedA ? -1 : 1;
    }

    // GROUP 2: Verified (DETECTED) second
    const verifiedA = statusA?.faceStatus === "DETECTED" || false;
    const verifiedB = statusB?.faceStatus === "DETECTED" || false;

    if (verifiedA !== verifiedB) {
      return verifiedA ? -1 : 1;
    }

    // GROUP 3: Within same group, sort by confidence (descending)
    const confidenceA = statusA?.confidence || 0;
    const confidenceB = statusB?.confidence || 0;

    return confidenceB - confidenceA;
  });
};

/**
 * Get students grouped with headers.
 * Returns array of groups with category info.
 */
export const getGroupedStudents = (
  students: Student[],
  statuses: Map<number, StudentStatus>
): StudentGroup[] => {
  const sorted = sortStudents(students, statuses);
  const groups: StudentGroup[] = [];

  // GROUP 1: Hand raised
  const handRaised = sorted.filter(
    (s) => statuses.get(s.user_id)?.handRaised || s.hand_raised || false
  );
  if (handRaised.length > 0) {
    groups.push({
      group: "🔵 QOL KO'TAGANLAR",
      icon: "🔵",
      students: handRaised,
    });
  }

  // GROUP 2: Verified
  const verified = sorted.filter(
    (s) =>
      (statuses.get(s.user_id)?.faceStatus === "DETECTED" ||
        !statuses.has(s.user_id)) &&
      !(statuses.get(s.user_id)?.handRaised || s.hand_raised || false)
  );
  if (verified.length > 0) {
    groups.push({
      group: "✅ TASDIQLANDI",
      icon: "✅",
      students: verified,
    });
  }

  // GROUP 3: Not verified
  const notVerified = sorted.filter(
    (s) =>
      (statuses.get(s.user_id)?.faceStatus === "NOT_DETECTED" ||
        statuses.get(s.user_id)?.faceStatus === "MULTIPLE") &&
      !(statuses.get(s.user_id)?.handRaised || s.hand_raised || false)
  );
  if (notVerified.length > 0) {
    groups.push({
      group: "❌ TASDIQLANDI EMAS",
      icon: "❌",
      students: notVerified,
    });
  }

  return groups;
};

/**
 * Get face status display info (color, animation, text)
 */
export const getFaceStatusDisplay = (status: FaceDetectionStatus) => {
  switch (status) {
    case "DETECTED":
      return {
        color: "#10b981",
        animation: "pulse-green",
        icon: "✅",
        label: "Tasdiqlandi",
        bgColor: "rgba(16, 185, 129, 0.1)",
      };
    case "NOT_DETECTED":
      return {
        color: "#ef4444",
        animation: "shake-red",
        icon: "❌",
        label: "Tasdiqlandi emas",
        bgColor: "rgba(239, 68, 68, 0.1)",
      };
    case "MULTIPLE":
      return {
        color: "#f59e0b",
        animation: "pulse-yellow",
        icon: "⚠️",
        label: "Ko'p yuzlar",
        bgColor: "rgba(245, 158, 11, 0.1)",
      };
    case "CHECKING":
    default:
      return {
        color: "#6366f1",
        animation: "spin",
        icon: "⏳",
        label: "Tekshirilmoqda",
        bgColor: "rgba(99, 102, 241, 0.1)",
      };
  }
};

/**
 * Get students with their current status
 */
export const getStudentsWithStatus = (
  students: Student[],
  statuses: Map<number, StudentStatus>
) => {
  return students
    .filter((s) => !s.is_teacher)
    .map((student) => {
      const status = statuses.get(student.user_id);
      return {
        ...student,
        faceStatus: status?.faceStatus || "CHECKING",
        confidence: status?.confidence || 0,
        handRaised: status?.handRaised || student.hand_raised,
        audioEnabled: status?.audioEnabled || false,
      };
    });
};

/**
 * Calculate statistics for monitoring dashboard
 */
export const calculateStats = (
  students: Student[],
  statuses: Map<number, StudentStatus>
) => {
  const studentCount = students.filter((s) => !s.is_teacher).length;
  const detectedCount = Array.from(statuses.values()).filter(
    (s) => s.faceStatus === "DETECTED"
  ).length;
  const notDetectedCount = Array.from(statuses.values()).filter(
    (s) => s.faceStatus === "NOT_DETECTED" || s.faceStatus === "MULTIPLE"
  ).length;
  const handRaisedCount = Array.from(statuses.values()).filter(
    (s) => s.handRaised
  ).length;

  return {
    total: studentCount,
    verified: detectedCount,
    notVerified: notDetectedCount,
    handRaised: handRaisedCount,
    verificationRate:
      studentCount > 0
        ? ((detectedCount / studentCount) * 100).toFixed(0) + "%"
        : "0%",
  };
};
