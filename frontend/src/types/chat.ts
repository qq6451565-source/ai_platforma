export type GroupMessage = {
  id: number;
  group: number;
  sender: number;
  sender_name?: string;
  text: string;
  file?: string | null;
  is_seen?: boolean;
  created_at?: string;
};
