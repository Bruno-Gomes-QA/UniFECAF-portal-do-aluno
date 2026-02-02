import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FiltersBar } from '@/components/shared/filters-bar';
import { FiltersForm } from '@/components/shared/filters-form';
import { Pagination } from '@/components/shared/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { apiServer } from '@/lib/api/server';
import { API_V1 } from '@/lib/api/routes';
import { getPagination } from '@/lib/pagination';
import type { PaginatedResponse } from '@/types/api';
import { formatDateTimeBR } from '@/lib/formatters/date';
import { requireRole } from '@/lib/auth/server';
import { NotificationsList } from './notifications-client';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  Archive, 
  Sparkles, 
  Lightbulb, 
  AlertTriangle,
  MessageSquare,
  Filter,
  Inbox,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type MeNotificationInfo = {
  id: string;
  notification_id: string;
  type: string;
  priority: string;
  title: string | null;
  body: string;
  delivered_at: string;
  read_at: string | null;
  archived_at: string | null;
  is_read: boolean;
};

type MeUnreadCountResponse = { unread_count: number };

export default async function StudentNotificationsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  await requireRole('STUDENT');

  const { page, pageSize, limit, offset } = getPagination(searchParams);

  const [data, unreadCount] = await Promise.all([
    apiServer.get<PaginatedResponse<MeNotificationInfo>>(
      `${API_V1.me.notifications}?limit=${limit}&offset=${offset}`,
      { next: { revalidate: 15 } }
    ),
    apiServer.get<MeUnreadCountResponse>(API_V1.me.unreadCount, { next: { revalidate: 15 } }),
  ]);

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-warning/5 p-6 shadow-sm">
        <Bell className="pointer-events-none absolute -right-8 -top-8 size-48 rotate-12 text-warning opacity-5" />
        
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-secondary" />
              <span className="text-sm font-medium text-secondary">Central de Avisos</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Notificações</h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe avisos e comunicados importantes
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`h-10 gap-2 px-4 font-semibold shadow-sm ${
                unreadCount.unread_count > 0 
                  ? 'border-warning/30 bg-warning/10 text-warning' 
                  : 'border-secondary/30 bg-secondary/10 text-secondary'
              }`}
            >
              <MessageSquare className={`size-4 ${unreadCount.unread_count > 0 ? 'animate-pulse' : ''}`} />
              {unreadCount.unread_count} não lida{unreadCount.unread_count !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <NotificationsList initialItems={data.items} />

      {/* Pagination */}
      {data.items.length > 0 && (
        <Pagination page={page} pageSize={pageSize} total={data.total} />
      )}
    </div>
  );
}
