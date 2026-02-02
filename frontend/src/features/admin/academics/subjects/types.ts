export type Subject = {
  id: string;
  course_id: string;
  course_name: string;
  code: string;
  name: string;
  credits: number;
  workload_hours: number;
  term_number: number | null;
  is_active: boolean;
  sections_count: number;
  created_at: string;
  updated_at: string;
};

export type SubjectCreateRequest = {
  course_id: string;
  code: string;
  name: string;
  credits: number;
  term_number?: number | null;
  is_active?: boolean;
};

/**
 * Update request for subjects.
 * Note: code is immutable after creation.
 * Note: course_id only changeable if no sections exist.
 */
export type SubjectUpdateRequest = {
  course_id?: string;
  name?: string;
  credits?: number;
  term_number?: number | null;
  is_active?: boolean;
};
