import 'server-only';

import { apiServer } from '@/lib/api/server';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { Invoice, InvoiceSummary } from './types';

export const adminInvoicesServer = {
  list: (params: {
    limit: number;
    offset: number;
    student_id?: string;
    status?: string;
    due_date_from?: string;
    due_date_to?: string;
    search?: string;
  }) => apiServer.get<PaginatedResponse<Invoice>>(withQuery(API_V1.admin.invoices, params), { cache: 'no-store' }),

  summary: (params?: { student_id?: string; term_id?: string; due_date_from?: string; due_date_to?: string }) =>
    apiServer.get<InvoiceSummary>(withQuery(`${API_V1.admin.invoices}/summary`, params || {}), { cache: 'no-store' }),
};

