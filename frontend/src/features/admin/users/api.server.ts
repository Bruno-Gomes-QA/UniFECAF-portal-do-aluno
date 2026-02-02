import 'server-only';

import { apiServer } from '@/lib/api/server';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { AdminUser } from './types';

export type ListUsersParams = {
  limit: number;
  offset: number;
  email?: string;
  role?: string;
  status?: string;
};

export const adminUsersServer = {
  list: (params: ListUsersParams) =>
    apiServer.get<PaginatedResponse<AdminUser>>(withQuery(API_V1.admin.users, params), {
      cache: 'no-store',
    }),
};

