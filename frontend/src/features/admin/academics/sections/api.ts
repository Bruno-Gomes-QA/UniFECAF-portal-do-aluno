import { apiBrowser } from '@/lib/api/browser';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { Section, SectionCreateRequest, SectionUpdateRequest } from './types';

export const adminSectionsApi = {
  list: (params: { limit: number; offset: number; term_id?: string; subject_id?: string; course_id?: string }) =>
    apiBrowser.get<PaginatedResponse<Section>>(withQuery(API_V1.admin.sections, params)),
  create: (payload: SectionCreateRequest) => apiBrowser.post<Section>(API_V1.admin.sections, payload),
  update: (id: string, payload: SectionUpdateRequest) =>
    apiBrowser.patch<Section>(`${API_V1.admin.sections}/${id}`, payload),
  remove: (id: string) => apiBrowser.delete<void>(`${API_V1.admin.sections}/${id}`),
};
