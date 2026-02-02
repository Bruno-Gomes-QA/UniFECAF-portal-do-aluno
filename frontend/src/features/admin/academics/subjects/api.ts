import { apiBrowser } from '@/lib/api/browser';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { Subject, SubjectCreateRequest, SubjectUpdateRequest } from './types';

export const adminSubjectsApi = {
  list: (params: { limit: number; offset: number }) =>
    apiBrowser.get<PaginatedResponse<Subject>>(withQuery(API_V1.admin.subjects, params)),
  
  create: (payload: SubjectCreateRequest) => 
    apiBrowser.post<Subject>(API_V1.admin.subjects, payload),
  
  update: (id: string, payload: SubjectUpdateRequest) =>
    apiBrowser.patch<Subject>(`${API_V1.admin.subjects}/${id}`, payload),
  
  remove: (id: string) => 
    apiBrowser.delete<void>(`${API_V1.admin.subjects}/${id}`),
  
  deactivate: (id: string) =>
    apiBrowser.patch<void>(`${API_V1.admin.subjects}/${id}/deactivate`, {}),
  
  activate: (id: string) =>
    apiBrowser.patch<void>(`${API_V1.admin.subjects}/${id}/activate`, {}),
};
