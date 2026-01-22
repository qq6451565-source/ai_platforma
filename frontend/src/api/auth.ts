import api from "./client";
import type { AuthTokens, LoginPayload, RegisterPayload, RegisterResponse } from "../types/auth";

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
  if (payload.passport_front) form.append("passport_front", payload.passport_front);
  if (payload.passport_back) form.append("passport_back", payload.passport_back);
  if (payload.selfie_image) form.append("selfie_image", payload.selfie_image);

  const res = await api.post<RegisterResponse>("/api/enrollment/register/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function logout(): Promise<void> {
  await api.post("/api/accounts/logout/");
}
