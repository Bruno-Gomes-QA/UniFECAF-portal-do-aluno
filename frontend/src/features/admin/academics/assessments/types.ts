export type Assessment = {
  id: string;
  section_id: string;
  name: string;
  kind: string;
  weight: number | string;
  max_score: number | string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

