import api from "./client";
import type { User } from "../types/user";

export async function updateProfile(form: Partial<User> & { face_image?: File }): Promise<User> {
  const data = new FormData();
  if (form.first_name !== undefined) data.append("first_name", form.first_name);
  if (form.last_name !== undefined) data.append("last_name", form.last_name);
  if (form.email !== undefined) data.append("email", form.email);
  if (form.phone !== undefined) data.append("phone", form.phone as string);
  if (form.face_image) data.append("face_image", form.face_image);
  const res = await api.patch<User>("/api/accounts/me/", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function changePassword(payload: { old_password: string; new_password: string }) {
  const res = await api.post("/api/accounts/change-password/", payload);
  return res.data;
}
