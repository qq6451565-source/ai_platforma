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
  statusReason?: string;
  lastVerifiedAt?: string | null;
  successRate?: number | null;
  attendanceStatus?: "present" | "absent" | null;
  attendanceRatio?: number | null;
  attendanceSamples?: number | null;
  joinedSeconds?: number | null;
  joinedRatio?: number | null;
  eligibilityStatus?: "eligible" | "risk" | "blocked" | null;
  eligibilityReason?: string | null;
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

export interface StudentMetricChip {
  key: "joined" | "face" | "checks";
  label: string;
  value: string;
}

export interface StudentEligibilityBadge {
  label: string;
  className: string;
  tone: "eligible" | "risk" | "blocked";
  reason: string;
}

export interface StudentEligibilitySummary {
  eligible: number;
  risk: number;
  blocked: number;
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

const formatRatioPercent = (value?: number | null) => {
  if (value == null) return null;
  return `${Math.round(value * 100)}%`;
};

const formatWholePercent = (value?: number | null) => {
  if (value == null) return null;
  return `${Math.round(value)}%`;
};

export const getStudentMetricChips = (status?: StudentStatus): StudentMetricChip[] => {
  if (!status) return [];

  const chips: StudentMetricChip[] = [];
  const joinedRatio = formatRatioPercent(status.joinedRatio);
  const successRate = formatWholePercent(status.successRate);
  const hasJoinedProgress = (status.joinedSeconds ?? 0) > 0 || (status.joinedRatio ?? 0) > 0;
  const hasFaceChecks = (status.attendanceSamples ?? 0) > 0 || (status.successRate ?? 0) > 0;
  const samples =
    status.attendanceSamples != null && status.attendanceSamples > 0
      ? String(status.attendanceSamples)
      : null;

  if (joinedRatio && hasJoinedProgress) {
    chips.push({ key: "joined", label: "Qat", value: joinedRatio });
  }
  if (successRate && hasFaceChecks) {
    chips.push({ key: "face", label: "Face", value: successRate });
  }
  if (samples) {
    chips.push({ key: "checks", label: "Tek", value: samples });
  }

  return chips;
};

export const getStudentMetricsSummary = (status?: StudentStatus): string => {
  return getStudentMetricChips(status)
    .map((chip) => `${chip.label} ${chip.value}`)
    .join(" | ");
};

export const getStudentAttendanceNote = (status?: StudentStatus): string => {
  if (!status) return "";
  if (status.attendanceStatus === "present") return "Live: bor";
  if (status.attendanceStatus === "absent") return "Live: yo'q";
  if ((status.attendanceSamples ?? 0) > 0) return "Live: kutilmoqda";
  return "";
};

export const getStudentEligibilityBadge = (
  status?: StudentStatus
): StudentEligibilityBadge | null => {
  const tone = status?.eligibilityStatus ?? "blocked";
  const reason = status?.eligibilityReason || "Davomat hali yig'ilmagan.";

  if (tone === "eligible") {
    return {
      label: "Eligible",
      className: "eligibility-eligible",
      tone,
      reason,
    };
  }
  if (tone === "risk") {
    return {
      label: "Risk",
      className: "eligibility-risk",
      tone,
      reason,
    };
  }
  return {
    label: "Blocked",
    className: "eligibility-blocked",
    tone: "blocked",
    reason,
  };
};

export const summarizeEligibility = (
  students: Student[],
  statuses: Map<number, StudentStatus>
): StudentEligibilitySummary => {
  return students
    .filter((student) => !student.is_teacher)
    .reduce<StudentEligibilitySummary>(
      (summary, student) => {
        const badge = getStudentEligibilityBadge(statuses.get(student.user_id));
        if (!badge) return summary;
        summary[badge.tone] += 1;
        return summary;
      },
      { eligible: 0, risk: 0, blocked: 0 }
    );
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
    { key: "hand_raised", group: "Qol ko'targanlar", icon: "HR" },
    { key: "verified", group: "Tasdiqlangan", icon: "OK" },
    { key: "failed", group: "Tasdiqlanmagan", icon: "NO" },
    { key: "pending", group: "Kutilmoqda", icon: "..." },
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
        color: "var(--color-success)",
        animation: "pulse-green",
        icon: "OK",
        label: "Tasdiqlandi",
        bgColor: "rgba(var(--color-success-rgb), 0.1)",
      };
    case "NOT_DETECTED":
      return {
        color: "var(--color-error)",
        animation: "shake-red",
        icon: "NO",
        label: "Tasdiqlandi emas",
        bgColor: "rgba(var(--color-error-rgb), 0.1)",
      };
    case "MULTIPLE":
      return {
        color: "var(--color-warning)",
        animation: "pulse-yellow",
        icon: "WARN",
        label: "Ko'p yuzlar",
        bgColor: "rgba(var(--color-warning-rgb), 0.1)",
      };
    case "CHECKING":
    default:
      return {
        color: "var(--color-text-muted)",
        animation: "spin",
        icon: "...",
        label: "Tekshirilmoqda",
        bgColor: "rgba(var(--scanner-border-rgb), 0.12)",
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
        ? `${((detectedCount / studentCount) * 100).toFixed(0)}%`
        : "0%",
  };
};
