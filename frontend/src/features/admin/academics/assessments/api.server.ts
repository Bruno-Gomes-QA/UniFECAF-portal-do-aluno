import 'server-only';

import { apiServer } from '@/lib/api/server';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { Assessment } from './types';

export const adminAssessmentsServer = {
  list: (params: { limit: number; offset: number }) =>
    apiServer.get<PaginatedResponse<Assessment>>(withQuery(API_V1.admin.assessments, params), { cache: 'no-store' }),
};

