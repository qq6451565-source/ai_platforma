import api from "./client";
import type { AuthTokens, LoginPayload, RegisterPayload } from "../types/auth";

export async function login(payload: LoginPayload): Promise<AuthTokens> {
  const res = await api.post<AuthTokens>("/api/token/", payload);
  return res.data;
}

// Ochiq registratsiya: form-data (rasmlar bilan)
export async function register(payload: RegisterPayload): Promise<AuthTokens> {
  const form = new FormData();
  if (payload.username) form.append("username", payload.username);
  if (payload.email) form.append("email", payload.email);
  if (payload.password) form.append("password", payload.password);
  if (payload.first_name) form.append("first_name", payload.first_name);
  if (payload.last_name) form.append("last_name", payload.last_name);
  if (payload.phone) form.append("phone", payload.phone);
  if (payload.passport_image) form.append("passport_image", payload.passport_image);
  if (payload.selfie_image) form.append("selfie_image", payload.selfie_image);

  // Backenddagi register endpoint: /api/accounts/register/
  const res = await api.post<AuthTokens>("/api/accounts/register/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function logout(): Promise<void> {
  await api.post("/api/accounts/logout/");
}
