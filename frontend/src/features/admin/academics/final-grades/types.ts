export type FinalGrade = {
  id: string;
  section_id: string;
  student_id: string;
  student_name?: string;
  student_ra?: string;
  final_score: number | string | null;
  absences_count: number;
  absences_pct: number | string;
  status: string;
  calculated_at: string;
  created_at: string;
  updated_at: string;
};
