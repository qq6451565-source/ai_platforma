export type LessonAccessStatus =
  | "open"
  | "pending_attendance"
  | "blocked_absent"
  | "blocked_no_attendance"
  | "blocked_missing_lesson"
  | "inactive";

export type LessonAccessSnapshot = {
  allowed: boolean;
  status: LessonAccessStatus;
  reason?: string | null;
  attendance_status?: "present" | "absent" | null;
  attendance_finalized: boolean;
  attendance_finalized_at?: string | null;
  attendance_joined_ratio?: number | null;
  attendance_face_verified_ratio?: number | null;
  attendance_joined_seconds?: number | null;
  attendance_face_check_count?: number;
  attendance_face_success_count?: number;
};

export type TestItem = {
  id: number;
  title: string;
  description?: string;
  lesson?: number | null;
  lesson_topic?: string;
  subject?: number;
  subject_name?: string;
  group?: number;
  group_name?: string;
  teacher?: number;
  time_limit_minutes?: number;
  total_score?: number;
  is_active?: boolean;
  created_at?: string;
  access?: LessonAccessSnapshot | null;
};

export type OptionInput = {
  text: string;
  is_correct?: boolean;
};

export type QuestionInput = {
  text: string;
  order?: number;
  points?: number;
  options?: OptionInput[];
};

export type TestDetail = TestItem & {
  questions?: Array<{
    id: number;
    text: string;
    order?: number;
    points?: number;
    options?: Array<{
      id: number;
      text: string;
      is_correct?: boolean;
    }>;
  }>;
};
