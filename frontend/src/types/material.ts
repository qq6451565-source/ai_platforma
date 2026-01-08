export type Material = {
  id: number;
  title: string;
  description: string;
  subject: number;
  subject_name?: string;
  teacher?: number;
  teacher_name?: string;
  group?: number;
  group_name?: string;
  material_type?: string;
  file?: string;
  created_at?: string;
};
