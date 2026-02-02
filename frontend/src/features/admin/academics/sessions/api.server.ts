import 'server-only';

import { apiServer } from '@/lib/api/server';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { ClassSession } from './types';

export const adminSessionsServer = {
  listBySection: (sectionId: string, params: { limit: number; offset: number }) =>
    apiServer.get<PaginatedResponse<ClassSession>>(withQuery(API_V1.admin.sectionSessions(sectionId), params), {
      cache: 'no-store',
    }),
};

