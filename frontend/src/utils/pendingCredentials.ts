const PENDING_CREDENTIALS_KEY = "pending_credentials";

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
  localStorage.setItem(PENDING_CREDENTIALS_KEY, JSON.stringify(payload));
};

export const getPendingCredentials = (): PendingCredentials | null => {
  const raw = localStorage.getItem(PENDING_CREDENTIALS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingCredentials;
    if (!parsed?.username || !parsed?.password) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const clearPendingCredentials = () => {
  localStorage.removeItem(PENDING_CREDENTIALS_KEY);
};
