import 'server-only';

import { apiServer } from '@/lib/api/server';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { AssessmentGrade } from './types';

export const adminAssessmentGradesServer = {
  list: (params: { limit: number; offset: number }) =>
    apiServer.get<PaginatedResponse<AssessmentGrade>>(withQuery(API_V1.admin.assessmentGrades, params), {
      cache: 'no-store',
    }),
};

