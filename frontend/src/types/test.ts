export type TestItem = {
  id: number;
  title: string;
  description?: string;
  subject?: number;
  subject_name?: string;
  group?: number;
  group_name?: string;
  teacher?: number;
  time_limit_minutes?: number;
  pass_score?: number;
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
