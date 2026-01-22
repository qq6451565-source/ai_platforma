export type Submission = {
  id: number;
  assignment: number;
  student: number;
  student_name?: string | null;
  student_username?: string | null;
  student_group_name?: string | null;
  file?: string | null;
  comment?: string;
  submitted_at?: string;
  grade?: number | null;
  teacher_comment?: string;
  assignment_title?: string;
  lesson_topic?: string;
  subject_name?: string;
  group_name?: string;
  teacher_name?: string | null;
};
