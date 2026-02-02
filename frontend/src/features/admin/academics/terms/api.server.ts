import 'server-only';

import { apiServer } from '@/lib/api/server';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { Term } from './types';

export const adminTermsServer = {
  list: (params: { limit: number; offset: number }) =>
    apiServer.get<PaginatedResponse<Term>>(withQuery(API_V1.admin.terms, params), { cache: 'no-store' }),
  getById: (id: string) =>
    apiServer.get<Term>(`${API_V1.admin.terms}/${id}`, { cache: 'no-store' }),
};

