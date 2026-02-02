import { apiBrowser } from '@/lib/api/browser';
import { API_V1 } from '@/lib/api/routes';
import type { Assessment } from './types';

export const adminAssessmentsApi = {
  create: (payload: { section_id: string; name: string; kind: string; weight: number; max_score: number; due_date?: string | null }) =>
    apiBrowser.post<Assessment>(API_V1.admin.assessments, payload),
  update: (id: string, payload: Partial<{ section_id: string; name: string; kind: string; weight: number; max_score: number; due_date: string | null }>) =>
    apiBrowser.patch<Assessment>(API_V1.admin.assessment(id), payload),
  remove: (id: string) => apiBrowser.delete<void>(API_V1.admin.assessment(id)),
};
