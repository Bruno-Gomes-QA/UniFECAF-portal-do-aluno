export type Term = {
  id: string;
  code: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  sections_count: number;
  created_at: string;
  updated_at: string;
};

export type TermCreateRequest = {
  code: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
};

export type TermUpdateRequest = Partial<TermCreateRequest>;

