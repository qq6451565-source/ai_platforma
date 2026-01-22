export type User = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  phone?: string | null;
  face_image?: string | null;
  group?: number | null;
};
