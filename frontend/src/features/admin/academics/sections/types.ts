export type Section = {
  id: string;
  term_id: string;
  subject_id: string;
  code: string;
  room_default: string | null;
  capacity: number | null;
  created_at: string;
  updated_at: string;
};

export type SectionCreateRequest = {
  term_id: string;
  subject_id: string;
  code: string;
  room_default?: string | null;
  capacity?: number | null;
};

export type SectionUpdateRequest = Partial<SectionCreateRequest>;

