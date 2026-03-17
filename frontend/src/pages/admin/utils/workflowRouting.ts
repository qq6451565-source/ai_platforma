export type AdminHubTab = "users" | "student-placement" | "teacher-workload";

type AdminHubSearchUpdate = {
  tab?: AdminHubTab;
  role?: string | null;
  userId?: number | null;
};

export const getRequestedUserId = (search: string) => {
  const raw = new URLSearchParams(search).get("userId");
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const updateAdminHubSearch = (search: string, updates: AdminHubSearchUpdate) => {
  const params = new URLSearchParams(search);

  if (updates.tab) {
    params.set("tab", updates.tab);
  }

  if (updates.role === null) {
    params.delete("role");
  } else if (updates.role !== undefined) {
    params.set("role", updates.role);
  }

  if (updates.userId === null) {
    params.delete("userId");
  } else if (updates.userId !== undefined) {
    params.set("userId", String(updates.userId));
  }

  const nextSearch = params.toString();
  return nextSearch ? `?${nextSearch}` : "";
};

export const clearRequestedUserIdSearch = (search: string) =>
  updateAdminHubSearch(search, { userId: null });
