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
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  passport_front?: File;
  passport_back?: File;
  selfie_image?: File;
};

export type RegisterResponse = {
  detail: string;
  applicant_id: number;
  status: "pending" | "verified" | "rejected" | "approved";
};
