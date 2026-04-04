const PENDING_CREDENTIALS_KEY = "pending_credentials";
const CREDENTIALS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export type PendingCredentials = {
  username: string;
  password: string;
  createdAt: number;
};

export const savePendingCredentials = (username: string, password: string) => {
  const payload: PendingCredentials = {
    username,
    password,
    createdAt: Date.now(),
  };
  localStorage.setItem(PENDING_CREDENTIALS_KEY, btoa(JSON.stringify(payload)));
};

export const getPendingCredentials = (): PendingCredentials | null => {
  const raw = localStorage.getItem(PENDING_CREDENTIALS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(atob(raw)) as PendingCredentials;
    if (!parsed?.username || !parsed?.password) return null;
    if (Date.now() - parsed.createdAt > CREDENTIALS_TTL_MS) {
      clearPendingCredentials();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const clearPendingCredentials = () => {
  localStorage.removeItem(PENDING_CREDENTIALS_KEY);
};
