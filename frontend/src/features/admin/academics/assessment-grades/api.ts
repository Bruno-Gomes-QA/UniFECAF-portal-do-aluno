import { apiBrowser } from '@/lib/api/browser';
import { API_V1 } from '@/lib/api/routes';
import type { AssessmentGrade } from './types';

export const adminAssessmentGradesApi = {
  create: (payload: { assessment_id: string; student_id: string; score: number }) =>
    apiBrowser.post<AssessmentGrade>(API_V1.admin.assessmentGrades, payload),
  update: (id: string, payload: { score: number }) =>
    apiBrowser.patch<AssessmentGrade>(API_V1.admin.assessmentGrade(id), payload),
  remove: (id: string) => apiBrowser.delete<void>(API_V1.admin.assessmentGrade(id)),
};
