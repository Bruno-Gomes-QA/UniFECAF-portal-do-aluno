import { apiBrowser } from '@/lib/api/browser';
import { API_V1 } from '@/lib/api/routes';
import type { FinalGrade } from './types';

export const adminFinalGradesApi = {
  create: (payload: { section_id: string; student_id: string; final_score?: number | null; absences_count: number; absences_pct: number; status: string }) =>
    apiBrowser.post<FinalGrade>(API_V1.admin.finalGrades, payload),
  update: (id: string, payload: Partial<{ final_score: number | null; absences_count: number; absences_pct: number; status: string }>) =>
    apiBrowser.patch<FinalGrade>(API_V1.admin.finalGrade(id), payload),
  remove: (id: string) => apiBrowser.delete<void>(API_V1.admin.finalGrade(id)),
};
