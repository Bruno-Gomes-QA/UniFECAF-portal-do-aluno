import 'server-only';

import { apiServer } from '@/lib/api/server';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { Section } from './types';

type SectionListParams = {
  limit: number;
  offset: number;
  term_id?: string;
  subject_id?: string;
  course_id?: string;
};

export const adminSectionsServer = {
  list: (params: SectionListParams) =>
    apiServer.get<PaginatedResponse<Section>>(withQuery(API_V1.admin.sections, params), { cache: 'no-store' }),
};

