import 'server-only';

import { apiServer } from '@/lib/api/server';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { Attendance } from './types';

type AttendanceListParams = {
  limit: number;
  offset: number;
  session_id?: string;
};

export const adminAttendanceServer = {
  list: (params: AttendanceListParams) =>
    apiServer.get<PaginatedResponse<Attendance>>(withQuery(API_V1.admin.attendance, params), { cache: 'no-store' }),
};

