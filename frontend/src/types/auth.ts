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

export type GoogleAuthResponse = AuthTokens & {
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    patronymic?: string | null;
    birth_year?: number | null;
    passport_series?: string | null;
    phone?: string | null;
    email_verified?: boolean;
  };
};

export type RegistrationProfilePayload = {
  first_name: string;
  last_name: string;
  patronymic: string;
  birth_year: number;
  passport_series: string;
  phone: string;
};

export type FaceVerificationResponse = {
  detail: string;
  faces_detected: number;
  has_embedding: boolean;
  match_result?: unknown;
};
