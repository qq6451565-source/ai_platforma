export type GradebookEntry = {
  id: number;
  student: number;
  subject: number;
  semester: number;
  attendance_score: number;
  assignment_score: number;
  midterm_score: number;
  final_score: number;
  total_score: number;
  updated_at: string;
};
