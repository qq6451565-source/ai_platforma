export type Assignment = {
  id: number;
  lesson?: number | null;
  lesson_topic?: string;
  teacher_subject: number;
  title: string;
  description?: string;
  file?: string | null;
  deadline: string;
  created_at?: string;
  subject?: string;
  group_names?: string[];
};
