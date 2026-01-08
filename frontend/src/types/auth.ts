export type AuthTokens = {
  access: string;
  refresh?: string;
  role?: "student" | "teacher" | "admin";
  user_id?: number;
  token_version?: number;
};

export type LoginPayload = {
  username: string;
  password: string;
};

export type RegisterPayload = {
  username?: string; // agar backend avtomatik bersa, yubormasak ham bo'ladi
  email?: string;
  password?: string; // agar backend avtomatik bersa, yubormasak ham bo'ladi
  first_name?: string;
  last_name?: string;
  phone?: string;
  passport_image?: File;
  selfie_image?: File;
};
