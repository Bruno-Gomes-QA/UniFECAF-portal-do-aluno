export type DegreeType = 'TECNOLOGO' | 'BACHARELADO' | 'LICENCIATURA' | 'TECNICO' | 'POS_GRADUACAO';

export type Course = {
  id: string;
  code: string;
  name: string;
  degree_type: DegreeType;
  duration_terms: number;
  is_active: boolean;
  students_count: number;
  subjects_count: number;
  created_at: string;
  updated_at: string;
};

export type CourseCreateRequest = {
  code: string;
  name: string;
  degree_type: DegreeType;
  duration_terms: number;
};

/**
 * Update request for courses.
 * Note: code is immutable after creation.
 */
export type CourseUpdateRequest = {
  name?: string;
  degree_type?: DegreeType;
  duration_terms?: number;
};
