import api from "./client";
import type { Group } from "../types/group";

export async function fetchGroups(): Promise<Group[]> {
  const res = await api.get<Group[]>("/api/groups/");
  return res.data;
}
