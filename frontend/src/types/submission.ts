export type Submission = {
  id: number;
  assignment: number;
  student: number;
  file?: string | null;
  comment?: string;
  submitted_at?: string;
  grade?: number | null;
  teacher_comment?: string;
};
