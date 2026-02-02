import 'server-only';

import { apiServer } from '@/lib/api/server';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { Payment } from './types';
import type { PaymentSummary } from './api';

export const adminPaymentsServer = {
  list: (params: { 
    limit: number; 
    offset: number; 
    invoice_id?: string; 
    student_id?: string;
    status?: string;
    search?: string;
  }) =>
    apiServer.get<PaginatedResponse<Payment>>(withQuery(API_V1.admin.payments, params), { cache: 'no-store' }),
  summary: (params?: { student_id?: string }) =>
    apiServer.get<PaymentSummary>(withQuery(`${API_V1.admin.payments}/summary`, params || {}), { cache: 'no-store' }),
};