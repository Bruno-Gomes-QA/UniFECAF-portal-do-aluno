export type Enrollment = {
  id: string;
  student_id: string;
  section_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

// Alias for consistency
export type SectionEnrollment = Enrollment;

