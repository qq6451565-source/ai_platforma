import api from "./client";
import type { Material } from "../types/material";

export async function fetchMaterials(): Promise<Material[]> {
  const res = await api.get<Material[]>("/api/materials/");
  return res.data;
}

export async function createMaterial(payload: {
  title: string;
  description?: string;
  subject: number;
  teacher?: number;
  group: number;
  material_type: string;
  file?: File;
}) {
  const form = new FormData();
  form.append("title", payload.title);
  if (payload.description) form.append("description", payload.description);
  form.append("subject", String(payload.subject));
  if (payload.teacher) form.append("teacher", String(payload.teacher));
  form.append("group", String(payload.group));
  form.append("material_type", payload.material_type);
  if (payload.file) form.append("file", payload.file);
  const res = await api.post("/api/materials/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
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
    description?: string;
    subject?: number;
    teacher?: number;
    group?: number;
    material_type?: string;
    file?: File | null;
  }
) {
  const form = new FormData();
  if (payload.title !== undefined) form.append("title", payload.title);
  if (payload.description !== undefined) form.append("description", payload.description);
  if (payload.subject !== undefined) form.append("subject", String(payload.subject));
  if (payload.teacher !== undefined) form.append("teacher", String(payload.teacher));
  if (payload.group !== undefined) form.append("group", String(payload.group));
  if (payload.material_type !== undefined) form.append("material_type", payload.material_type);
  if (payload.file !== undefined) {
    if (payload.file === null) form.append("file", "");
    else form.append("file", payload.file);
  }
  const res = await api.patch(`/api/materials/${id}/`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}
