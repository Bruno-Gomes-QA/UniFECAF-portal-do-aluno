import 'server-only';

import { apiServer } from '@/lib/api/server';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { StudentDocument, DocumentStats } from './types';

type ListParams = {
  limit: number;
  offset: number;
  student_id?: string;
  doc_type?: string;
  status?: string;
  search?: string;
};

export const adminStudentDocumentsServer = {
  list: (params: ListParams) =>
    apiServer.get<PaginatedResponse<StudentDocument>>(withQuery(API_V1.admin.studentDocuments, params), { cache: 'no-store' }),
  stats: () =>
    apiServer.get<DocumentStats>(`${API_V1.admin.studentDocuments}/stats`, { cache: 'no-store' }),
};

