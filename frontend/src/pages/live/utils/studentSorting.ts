/**
 * Student sorting utilities for live session.
 * Priority: hand raised -> verified -> not verified -> pending.
 */

export type FaceDetectionStatus = "DETECTED" | "NOT_DETECTED" | "MULTIPLE" | "CHECKING";
export type StudentTier = "hand_raised" | "verified" | "failed" | "pending";
export type VisualStatus = "engaged" | "verified" | "unverified" | "checking";

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
  role?: string;
  group_name?: string;
  group?: string;
  group_code?: string;
  group_title?: string;
}

export interface StudentGroup {
  key: StudentTier;
  group: string;
  icon: string;
  students: Student[];
}

const tierPriority: Record<StudentTier, number> = {
  hand_raised: 1,
  verified: 2,
  failed: 3,
  pending: 4,
};

export const resolveStudentGroup = (student: Student): string => {
  const group =
    student.group_name ||
    student.group ||
    student.group_code ||
    student.group_title ||
    "";

  const normalized = String(group).trim();
  if (normalized) return normalized;

  const role = (student.role || "").toLowerCase();
  if (role && !["student", "teacher", "admin"].includes(role)) {
    return student.role as string;
  }

  return "Guruh belgilanmagan";
};

export const resolveVisualStatus = (
  student: Student,
  status?: StudentStatus
): VisualStatus => {
  const isHandRaised = Boolean(status?.handRaised || student.hand_raised);
  if (isHandRaised) return "engaged";

  const faceStatus = status?.faceStatus ?? "CHECKING";
  if (faceStatus === "DETECTED") return "verified";
  if (faceStatus === "NOT_DETECTED" || faceStatus === "MULTIPLE") return "unverified";
  return "checking";
};

export const resolveStudentTier = (
  student: Student,
  status?: StudentStatus
): StudentTier => {
  const visualStatus = resolveVisualStatus(student, status);
  if (visualStatus === "engaged") return "hand_raised";
  if (visualStatus === "verified") return "verified";
  if (visualStatus === "unverified") return "failed";
  return "pending";
};

export const sortStudents = (
  students: Student[],
  statuses: Map<number, StudentStatus>
): Student[] => {
  const studentsCopy = [...students.filter((s) => !s.is_teacher)];

  return studentsCopy.sort((a, b) => {
    const statusA = statuses.get(a.user_id);
    const statusB = statuses.get(b.user_id);

    const tierA = resolveStudentTier(a, statusA);
    const tierB = resolveStudentTier(b, statusB);
    const tierDelta = tierPriority[tierA] - tierPriority[tierB];
    if (tierDelta !== 0) return tierDelta;

    const confidenceA = statusA?.confidence || 0;
    const confidenceB = statusB?.confidence || 0;
    if (confidenceA !== confidenceB) return confidenceB - confidenceA;

    return a.user_name.localeCompare(b.user_name, "uz", { sensitivity: "base" });
  });
};

export const getGroupedStudents = (
  students: Student[],
  statuses: Map<number, StudentStatus>
): StudentGroup[] => {
  const sorted = sortStudents(students, statuses);
  const groupsMap: Record<StudentTier, Student[]> = {
    hand_raised: [],
    verified: [],
    failed: [],
    pending: [],
  };

  sorted.forEach((student) => {
    const tier = resolveStudentTier(student, statuses.get(student.user_id));
    groupsMap[tier].push(student);
  });

  const groupMeta: Array<Pick<StudentGroup, "key" | "group" | "icon">> = [
    { key: "hand_raised", group: "Qol ko'targanlar", icon: "🔵" },
    { key: "verified", group: "Tasdiqlangan", icon: "✅" },
    { key: "failed", group: "Tasdiqlanmagan", icon: "❌" },
    { key: "pending", group: "Kutilmoqda", icon: "⏳" },
  ];

  return groupMeta
    .map((meta) => ({ ...meta, students: groupsMap[meta.key] }))
    .filter((group) => group.students.length > 0);
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
        color: "#94a3b8",
        animation: "spin",
        icon: "⏳",
        label: "Tekshirilmoqda",
        bgColor: "rgba(148, 163, 184, 0.12)",
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
