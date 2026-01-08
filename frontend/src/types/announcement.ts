export type Announcement = {
  id: number;
  title: string;
  message: string;
  subject?: number | null;
  subject_name?: string | null;
  group?: number | null;
  group_name?: string | null;
  creator?: number;
  creator_name?: string;
  created_at?: string;
};
