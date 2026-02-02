import { apiBrowser } from '@/lib/api/browser';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { Term, TermCreateRequest, TermUpdateRequest } from './types';

export const adminTermsApi = {
  list: (params: {
    limit: number;
    offset: number;
    search?: string;
    status?: string;
  }) => apiBrowser.get<PaginatedResponse<Term>>(withQuery(API_V1.admin.terms, params)),
  create: (payload: TermCreateRequest) => apiBrowser.post<Term>(API_V1.admin.terms, payload),
  update: (id: string, payload: TermUpdateRequest) =>
    apiBrowser.patch<Term>(`${API_V1.admin.terms}/${id}`, payload),
  remove: (id: string) => apiBrowser.delete<void>(`${API_V1.admin.terms}/${id}`),
  setCurrent: (id: string) => apiBrowser.post<void>(`${API_V1.admin.terms}/${id}/set-current`, {}),
  generateSessions: (termId: string, payload: { date_from: string; date_to: string }) =>
    apiBrowser.post<{ created: number; skipped: number }>(API_V1.admin.generateSessions(termId), payload),
};
