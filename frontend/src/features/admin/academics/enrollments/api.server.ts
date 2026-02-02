import 'server-only';

import { apiServer } from '@/lib/api/server';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { Enrollment } from './types';

export const adminEnrollmentsServer = {
  list: (params: { 
    limit: number; 
    offset: number;
    term_id?: string;
    section_id?: string;
    student_id?: string;
    status?: string;
  }) =>
    apiServer.get<PaginatedResponse<Enrollment>>(withQuery(API_V1.admin.enrollments, params), {
      cache: 'no-store',
    }),
};

