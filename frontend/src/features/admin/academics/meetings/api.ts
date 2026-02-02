import { apiBrowser } from '@/lib/api/browser';
import { API_V1 } from '@/lib/api/routes';
import type { SectionMeeting } from './types';

export const adminMeetingsApi = {
  listBySection: (sectionId: string) =>
    apiBrowser.get<SectionMeeting[]>(API_V1.admin.sectionMeetings(sectionId)),
  createForSection: (sectionId: string, payload: { weekday: number; start_time: string; end_time: string; room?: string | null }) =>
    apiBrowser.post<SectionMeeting>(API_V1.admin.sectionMeetings(sectionId), payload),
  update: (meetingId: string, payload: Partial<{ weekday: number; start_time: string; end_time: string; room: string | null }>) =>
    apiBrowser.patch<SectionMeeting>(API_V1.admin.meeting(meetingId), payload),
  remove: (meetingId: string) => apiBrowser.delete<void>(API_V1.admin.meeting(meetingId)),
};

