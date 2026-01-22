export type GradebookEntry = {
  id: number;
  student: number;
  subject: number;
  assignment_score: number;
  midterm_score: number;
  total_score: number;
  updated_at: string;
  subject_name?: string;
};
