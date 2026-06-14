import api from "./client";
import type { Material } from "../types/material";

export async function fetchMaterials(): Promise<Material[]> {
  const res = await api.get<Material[]>("/api/materials/");
  return res.data;
}

export async function fetchMaterialById(id: string | number): Promise<Material> {
  const res = await api.get<Material>(`/api/materials/${id}/`);
  return res.data;
}

export async function createMaterial(payload: {
  title: string;
  lesson?: number;
  subject?: number;
  teacher?: number;
  groups?: number[];
  files?: File[];
}) {
  const form = new FormData();
  form.append("title", payload.title);
  if (payload.lesson !== undefined) form.append("lesson", String(payload.lesson));
  if (payload.subject !== undefined) form.append("subject", String(payload.subject));
  if (payload.teacher !== undefined) form.append("teacher", String(payload.teacher));
  if (payload.groups) payload.groups.forEach((g) => form.append("groups", String(g)));
  if (payload.files) payload.files.forEach((f) => form.append("files", f));
  const res = await api.post("/api/materials/", form);
  return res.data;
}

export async function deleteMaterial(id: number) {
  const res = await api.delete(`/api/materials/${id}/`);
  return res.data;
}

export async function updateMaterial(
  id: number,
  payload: {
    title?: string;
    lesson?: number | null;
    subject?: number;
    teacher?: number;
    groups?: number[];
    files?: File[];
  }
) {
  const form = new FormData();
  if (payload.title !== undefined) form.append("title", payload.title);
  if (payload.lesson !== undefined) {
    if (payload.lesson === null) form.append("lesson", "");
    else form.append("lesson", String(payload.lesson));
  }
  if (payload.subject !== undefined) form.append("subject", String(payload.subject));
  if (payload.teacher !== undefined) form.append("teacher", String(payload.teacher));
  if (payload.groups !== undefined) payload.groups.forEach((g) => form.append("groups", String(g)));
  if (payload.files) payload.files.forEach((f) => form.append("files", f));
  const res = await api.patch(`/api/materials/${id}/`, form);
  return res.data;
}
