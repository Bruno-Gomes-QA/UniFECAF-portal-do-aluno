import { Metadata } from 'next';
import { apiServer } from '@/lib/api/server';
import { API_V1 } from '@/lib/api/routes';
import type { MeGradesResponse, MeAttendanceResponse, MeTermOption } from '@/types/portal';
import { GradesPageClient } from './grades-client';

export const metadata: Metadata = {
  title: 'Notas | Portal do Aluno',
  description: 'Suas notas e frequência por disciplina',
};

export default async function NotasPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const termId = Array.isArray(searchParams.term_id) ? searchParams.term_id[0] : searchParams.term_id;

  const [gradesData, attendanceData, termsData] = await Promise.all([
    apiServer.get<MeGradesResponse>(
      termId ? `${API_V1.me.grades}?term_id=${termId}` : API_V1.me.grades,
      { next: { revalidate: 60 } }
    ),
    apiServer.get<MeAttendanceResponse>(
      termId ? `${API_V1.me.attendance}?term_id=${termId}` : API_V1.me.attendance,
      { next: { revalidate: 60 } }
    ),
    apiServer.get<MeTermOption[]>(API_V1.me.terms, {
      next: { revalidate: 300 },
    }),
  ]);

  return (
    <GradesPageClient 
      grades={gradesData} 
      attendance={attendanceData}
      terms={termsData}
      selectedTermId={termId}
    />
  );
}
