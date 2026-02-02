import 'server-only';

import { apiServer } from '@/lib/api/server';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { Course } from './types';

type ListParams = {
  limit: number;
  offset: number;
  is_active?: boolean;
  search?: string;
};

export const adminCoursesServer = {
  list: (params: ListParams) => {
    // Remove is_active if undefined to avoid using backend's default value (true)
    const cleanParams = { ...params };
    if (cleanParams.is_active === undefined) {
      delete cleanParams.is_active;
    }
    return apiServer.get<PaginatedResponse<Course>>(
      withQuery(API_V1.admin.courses, cleanParams), 
      { cache: 'no-store' }
    );
  },
  
  get: (id: string) =>
    apiServer.get<Course>(`${API_V1.admin.courses}/${id}`, { cache: 'no-store' }),
};
