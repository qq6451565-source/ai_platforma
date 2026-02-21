import api from "./client";
import axios from "axios";
import type {
  AuthTokens,
  LoginPayload,
  RegisterPayload,
  RegisterResponse,
  RegisterStartPayload,
  RegisterFinalizePayload,
  GoogleAuthResponse,
  RegistrationProfilePayload,
  FaceVerificationResponse,
  ProfileAiVerificationResponse,
} from "../types/auth";


const publicApi = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000",
});

export async function login(payload: LoginPayload): Promise<AuthTokens> {
  const res = await api.post<AuthTokens>("/api/token/", payload);
  return res.data;
}

// Ochiq registratsiya: form-data (rasmlar bilan)
export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const form = new FormData();
  if (payload.full_name) form.append("full_name", payload.full_name);
  if (payload.first_name) form.append("first_name", payload.first_name);
  if (payload.last_name) form.append("last_name", payload.last_name);
  if (payload.email) form.append("email", payload.email);
  if (payload.phone) form.append("phone", payload.phone);
  if (payload.patronymic) form.append("patronymic", payload.patronymic);
  if (payload.birth_date) form.append("birth_date", payload.birth_date);
  if (payload.passport_series) form.append("passport_series", payload.passport_series);
  if (payload.passport_front) form.append("passport_front", payload.passport_front);
  if (payload.passport_back) form.append("passport_back", payload.passport_back);
  if (payload.selfie_image) form.append("selfie_image", payload.selfie_image);

  const res = await publicApi.post<RegisterResponse>("/api/enrollment/register/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function registerStart(payload: RegisterStartPayload): Promise<RegisterResponse> {
  const res = await publicApi.post<RegisterResponse>("/api/enrollment/register/start/", payload);
  return res.data;
}

export async function registerFinalize(payload: RegisterFinalizePayload): Promise<RegisterResponse> {
  const form = new FormData();
  form.append("passport_front", payload.passport_front);
  if (payload.passport_back) form.append("passport_back", payload.passport_back);
  form.append("selfie_image", payload.selfie_image);
  if (payload.direction_choice) form.append("direction_choice", String(payload.direction_choice));

  const res = await api.post<RegisterResponse>("/api/enrollment/register/finalize/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function googleAuth(token: string): Promise<GoogleAuthResponse> {
  const res = await api.post<GoogleAuthResponse>("/api/accounts/google/", { token });
  return res.data;
}

export async function updateRegistrationProfile(payload: RegistrationProfilePayload) {
  const res = await api.patch("/api/accounts/registration/profile/", payload);
  return res.data;
}

export async function uploadPassportFront(file: File) {
  const form = new FormData();
  form.append("passport_front", file);
  const res = await api.post("/api/accounts/registration/passport/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function submitFaceVerification(file: File): Promise<FaceVerificationResponse> {
  const form = new FormData();
  form.append("selfie_image", file);
  const res = await api.post<FaceVerificationResponse>("/api/accounts/registration/face/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function sendEmailVerification(email?: string) {
  const res = await api.post("/api/accounts/registration/email/send/", { email });
  return res.data;
}

export async function verifyEmailCode(code: string) {
  const res = await api.post("/api/accounts/registration/email/verify/", { code });
  return res.data;
}

export async function logout(): Promise<void> {
  await api.post("/api/accounts/logout/");
}

export async function runProfileAiVerification(): Promise<ProfileAiVerificationResponse> {
  const res = await api.post<ProfileAiVerificationResponse>("/api/enrollment/reverify/self/");
  return res.data;
}
