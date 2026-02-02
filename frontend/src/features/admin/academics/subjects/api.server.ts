import 'server-only';

import { apiServer } from '@/lib/api/server';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { Subject } from './types';

type ListParams = {
  limit: number;
  offset: number;
  course_id?: string;
  is_active?: boolean;
  search?: string;
};

export const adminSubjectsServer = {
  list: (params: ListParams) => {
    // Remove is_active if undefined to avoid using backend's default value (true)
    const cleanParams = { ...params };
    if (cleanParams.is_active === undefined) {
      delete cleanParams.is_active;
    }
    return apiServer.get<PaginatedResponse<Subject>>(
      withQuery(API_V1.admin.subjects, cleanParams), 
      { cache: 'no-store' }
    );
  },
  
  get: (id: string) =>
    apiServer.get<Subject>(`${API_V1.admin.subjects}/${id}`, { cache: 'no-store' }),
};
