export type LessonSlot = {
  id: number;
  timetable: number;
  subject: number;
  teacher: number;
  start_time: string;
  end_time: string;
  room?: string;
  mode?: string;
};

export type Timetable = {
  id: number;
  group: number;
  semester: number;
};
