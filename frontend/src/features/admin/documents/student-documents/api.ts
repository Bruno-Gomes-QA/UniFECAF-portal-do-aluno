import { apiBrowser } from '@/lib/api/browser';
import { API_V1 } from '@/lib/api/routes';
import type { StudentDocument, DocumentStats } from './types';

type CreatePayload = {
  student_id: string;
  doc_type: string;
  status: string;
  title?: string | null;
  description?: string | null;
  file_url?: string | null;
  file_size?: number | null;
  file_type?: string | null;
  generated_at?: string | null;
};

type UpdatePayload = Partial<{
  status: string;
  title: string | null;
  description: string | null;
  file_url: string | null;
  file_size: number | null;
  file_type: string | null;
  generated_at: string | null;
}>;

type GeneratePayload = {
  student_id: string;
  doc_type: string;
  title?: string | null;
  description?: string | null;
};

export const adminStudentDocumentsApi = {
  create: (payload: CreatePayload) =>
    apiBrowser.post<StudentDocument>(API_V1.admin.studentDocuments, payload),
  update: (id: string, payload: UpdatePayload) =>
    apiBrowser.patch<StudentDocument>(API_V1.admin.studentDocument(id), payload),
  remove: (id: string) => apiBrowser.delete<void>(API_V1.admin.studentDocument(id)),
  generate: (payload: GeneratePayload) =>
    apiBrowser.post<StudentDocument>(`${API_V1.admin.studentDocuments}/generate`, payload),
  stats: () =>
    apiBrowser.get<DocumentStats>(`${API_V1.admin.studentDocuments}/stats`),
};
