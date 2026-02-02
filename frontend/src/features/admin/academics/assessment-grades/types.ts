export type AssessmentGrade = {
  id: string;
  assessment_id: string;
  student_id: string;
  student_name?: string;
  student_ra?: string;
  score: number | string;
  created_at: string;
  updated_at: string;
};
