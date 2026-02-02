import 'server-only';

import { apiServer } from '@/lib/api/server';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { FinalGrade } from './types';

export const adminFinalGradesServer = {
  list: (params: { limit: number; offset: number }) =>
    apiServer.get<PaginatedResponse<FinalGrade>>(withQuery(API_V1.admin.finalGrades, params), { cache: 'no-store' }),
};

