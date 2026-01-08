import api from "./client";
import type { User } from "../types/user";

export async function fetchMe(): Promise<User> {
  const res = await api.get<User>("/api/accounts/me/");
  return res.data;
}
