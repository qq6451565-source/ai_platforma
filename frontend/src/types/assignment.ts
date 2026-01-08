export type Assignment = {
  id: number;
  teacher_subject: number;
  title: string;
  description?: string;
  file?: string | null;
  deadline: string;
  created_at?: string;
};
