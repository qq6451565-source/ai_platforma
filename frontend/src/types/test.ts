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
