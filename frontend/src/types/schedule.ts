export type LessonSlot = {
  id: number;
  timetable: number;
  subject: number;
  teacher: number;
  start_time: string;
  end_time: string;
  room?: string;
  mode?: string;
  subject_name?: string;
  teacher_name?: string;
};

export type Timetable = {
  id: number;
  group: number;
};
