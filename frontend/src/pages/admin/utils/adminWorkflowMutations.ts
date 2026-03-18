import type { QueryClient } from "@tanstack/react-query";

export const ADMIN_QUERY_KEYS = {
  users: ["admin-users"] as const,
  studentPlacementUsers: ["admin-users", "student-placement"] as const,
  teacherWorkloadUsers: ["admin-users", "teacher-workload"] as const,
  directions: ["admin-directions"] as const,
  groups: ["admin-groups"] as const,
  subjects: ["admin-subjects"] as const,
  studentProfiles: ["admin-student-profiles"] as const,
  teacherSubjects: ["admin-teacher-subjects"] as const,
  passports: ["admin-passports"] as const,
};

export const ADMIN_INVALIDATION_GROUPS = {
  usersOnly: [ADMIN_QUERY_KEYS.users] as const,
  userDirectory: [
    ADMIN_QUERY_KEYS.users,
    ADMIN_QUERY_KEYS.studentPlacementUsers,
    ADMIN_QUERY_KEYS.teacherWorkloadUsers,
  ] as const,
  roleChange: [
    ADMIN_QUERY_KEYS.users,
    ADMIN_QUERY_KEYS.studentPlacementUsers,
    ADMIN_QUERY_KEYS.teacherWorkloadUsers,
    ADMIN_QUERY_KEYS.studentProfiles,
    ADMIN_QUERY_KEYS.teacherSubjects,
  ] as const,
  studentPlacement: [
    ADMIN_QUERY_KEYS.users,
    ADMIN_QUERY_KEYS.studentPlacementUsers,
    ADMIN_QUERY_KEYS.studentProfiles,
  ] as const,
  teacherWorkload: [
    ADMIN_QUERY_KEYS.teacherSubjects,
    ADMIN_QUERY_KEYS.teacherWorkloadUsers,
  ] as const,
  teacherSubjectsOnly: [ADMIN_QUERY_KEYS.teacherSubjects] as const,
  passportsOnly: [ADMIN_QUERY_KEYS.passports] as const,
};

const toErrorMessage = (value: unknown) => {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === "string" && item.trim());
    return typeof first === "string" ? first : null;
  }
  return null;
};

export const getAdminApiErrorMessage = (
  error: unknown,
  preferredFields: string[],
  fallback: string,
) => {
  const data = (error as any)?.response?.data;
  for (const field of preferredFields) {
    const message = toErrorMessage(data?.[field]);
    if (message) {
      return message;
    }
  }
  const detailMessage = toErrorMessage(data?.detail);
  if (detailMessage) {
    return detailMessage;
  }
  return fallback;
};

export const invalidateAdminQueries = async (
  queryClient: Pick<QueryClient, "invalidateQueries">,
  queryKeys: readonly (readonly unknown[])[],
) => {
  await Promise.all(
    queryKeys.map((queryKey) =>
      queryClient.invalidateQueries({
        queryKey,
      }),
    ),
  );
};
