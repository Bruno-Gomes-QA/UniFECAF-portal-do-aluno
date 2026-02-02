import { Metadata } from 'next';
import { apiServer } from '@/lib/api/server';
import { API_V1 } from '@/lib/api/routes';
import type { MeScheduleTodayResponse, MeScheduleWeekResponse } from '@/types/portal';
import { SchedulePageClient } from './schedule-client';

export const metadata: Metadata = {
  title: 'Horários | Portal do Aluno',
  description: 'Grade de horários e aulas da semana',
};

export default async function HorariosPage() {
  const [todayData, weekData] = await Promise.all([
    apiServer.get<MeScheduleTodayResponse>(API_V1.me.scheduleToday, {
      next: { revalidate: 60 },
    }),
    apiServer.get<MeScheduleWeekResponse>(API_V1.me.scheduleWeek, {
      next: { revalidate: 60 },
    }),
  ]);

  return <SchedulePageClient today={todayData} week={weekData} />;
}
