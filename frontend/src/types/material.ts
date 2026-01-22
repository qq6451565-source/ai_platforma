export type MaterialResource = {
  id: number;
  version: number;
  resource_type: "file" | "link" | "video";
  title?: string;
  file?: string;
  url?: string;
  created_at?: string;
};

export type MaterialVersion = {
  version: number;
  resources: MaterialResource[];
};

export type Material = {
  id: number;
  title: string;
  description: string;
  lesson?: number | null;
  lesson_topic?: string;
  subject: number;
  subject_name?: string;
  teacher?: number;
  teacher_name?: string;
  group?: number | null;
  group_name?: string;
  group_ids?: number[];
  group_names?: string[];
  material_type?: string | null;
  file?: string | null;
  current_version?: number;
  resources?: MaterialResource[];
  versions?: MaterialVersion[];
  created_at?: string;
  updated_at?: string;
};
