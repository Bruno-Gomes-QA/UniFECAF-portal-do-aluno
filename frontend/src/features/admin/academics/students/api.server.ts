import 'server-only';

import { apiServer } from '@/lib/api/server';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { Student } from './types';

export const adminStudentsServer = {
  list: (params: { 
    limit: number; 
    offset: number; 
    status?: string;
    user_id?: string;
    search?: string;
  }) =>
    apiServer.get<PaginatedResponse<Student>>(withQuery(API_V1.admin.students, params), { cache: 'no-store' }),
};
