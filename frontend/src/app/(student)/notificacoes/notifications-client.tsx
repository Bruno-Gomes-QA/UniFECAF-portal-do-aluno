'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiBrowser } from '@/lib/api/browser';
import { ApiClientError } from '@/lib/api/errors';
import { formatDateTimeBR } from '@/lib/formatters/date';
import { 
  CheckCircle2, 
  Clock, 
  Archive, 
  AlertTriangle,
  Bell,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

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

function getPriorityBadge(priority: string, isRead: boolean, archived: boolean) {
  if (archived) {
    return (
      <Badge variant="outline" className="gap-1">
        <Archive className="size-3" />
        Arquivada
      </Badge>
    );
  }
  
  if (isRead) {
    return (
      <Badge variant="outline" className="gap-1 border-secondary/30 bg-secondary/10 text-secondary">
        <CheckCircle2 className="size-3" />
        Lida
      </Badge>
    );
  }

  switch (priority) {
    case 'URGENT':
      return (
        <Badge variant="destructive" className="gap-1 animate-pulse">
          <AlertTriangle className="size-3" />
          Urgente
        </Badge>
      );
    case 'HIGH':
      return (
        <Badge variant="warning" className="gap-1">
          <AlertTriangle className="size-3" />
          Alta
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-primary">
          <Clock className="size-3" />
          Não lida
        </Badge>
      );
  }
}

type NotificationsListProps = {
  initialItems: MeNotificationInfo[];
};

export function NotificationsList({ initialItems }: NotificationsListProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  // Ordenar: urgentes não lidas > alta prioridade não lidas > não lidas normais > lidas (mais recentes primeiro)
  const sortedItems = [...items].sort((a, b) => {
    // Se um está arquivado e o outro não, arquivado vai pro final
    if (a.archived_at && !b.archived_at) return 1;
    if (!a.archived_at && b.archived_at) return -1;
    
    // Prioridade urgentes não lidas primeiro
    const aUrgentUnread = a.priority === 'URGENT' && !a.is_read && !a.archived_at;
    const bUrgentUnread = b.priority === 'URGENT' && !b.is_read && !b.archived_at;
    if (aUrgentUnread && !bUrgentUnread) return -1;
    if (!aUrgentUnread && bUrgentUnread) return 1;
    
    // Alta prioridade não lidas
    const aHighUnread = a.priority === 'HIGH' && !a.is_read && !a.archived_at;
    const bHighUnread = b.priority === 'HIGH' && !b.is_read && !b.archived_at;
    if (aHighUnread && !bHighUnread) return -1;
    if (!aHighUnread && bHighUnread) return 1;
    
    // Não lidas normais
    const aUnread = !a.is_read && !a.archived_at;
    const bUnread = !b.is_read && !b.archived_at;
    if (aUnread && !bUnread) return -1;
    if (!aUnread && bUnread) return 1;
    
    // Por data (mais recentes primeiro)
    return new Date(b.delivered_at).getTime() - new Date(a.delivered_at).getTime();
  });

  const handleToggleRead = useCallback(async (id: string, currentlyRead: boolean) => {
    setLoadingIds(prev => new Set(prev).add(id));
    try {
      await apiBrowser.post<void>(`/api/v1/me/notifications/${id}/${currentlyRead ? 'unread' : 'read'}`);
      setItems(prev => prev.map(item => 
        item.id === id 
          ? { ...item, is_read: !currentlyRead, read_at: currentlyRead ? null : new Date().toISOString() }
          : item
      ));
      toast.success(currentlyRead ? 'Marcada como não lida' : 'Marcada como lida');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
      else toast.error('Erro ao atualizar notificação.');
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [router]);

  const handleArchive = useCallback(async (id: string) => {
    setLoadingIds(prev => new Set(prev).add(id));
    try {
      await apiBrowser.post<void>(`/api/v1/me/notifications/${id}/archive`);
      setItems(prev => prev.map(item => 
        item.id === id 
          ? { ...item, archived_at: new Date().toISOString() }
          : item
      ));
      toast.success('Notificação arquivada');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
      else toast.error('Erro ao arquivar.');
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [router]);

  const displayedItems = sortedItems;

  if (displayedItems.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-secondary/10">
            <Bell className="size-8 text-secondary" />
          </div>
          <p className="text-lg font-medium">Nenhuma notificação</p>
          <p className="text-sm text-muted-foreground mt-1">Você está em dia!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {displayedItems.map((n) => {
        const isLoading = loadingIds.has(n.id);
        return (
          <Card 
            key={n.id} 
            className={`overflow-hidden transition-all ${
              !n.is_read && !n.archived_at 
                ? 'border-primary/30 bg-primary/5 shadow-md' 
                : n.archived_at 
                  ? 'opacity-60' 
                  : ''
            }`}
          >
            <CardContent className="p-0">
              <div className="flex">
                {/* Priority indicator bar */}
                <div className={`w-1.5 shrink-0 ${
                  n.priority === 'URGENT' ? 'bg-destructive' :
                  n.priority === 'HIGH' ? 'bg-warning' :
                  'bg-primary'
                }`} />
                
                <div className="flex-1 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!n.is_read && !n.archived_at && (
                          <span className="size-2 rounded-full bg-primary animate-pulse shrink-0" />
                        )}
                        <span className="font-semibold text-sm sm:text-base break-words">{n.title || n.type}</span>
                        {getPriorityBadge(n.priority, n.is_read, !!n.archived_at)}
                      </div>
                      <p className="text-sm text-muted-foreground break-words">{n.body}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                        <Clock className="size-3 shrink-0" />
                        {formatDateTimeBR(n.delivered_at)}
                      </p>
                    </div>
                    
                    {!n.archived_at && (
                      <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 sm:flex-none gap-2"
                          onClick={() => handleToggleRead(n.id, n.is_read)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : n.is_read ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                          <span className="hidden sm:inline">{n.is_read ? 'Marcar não lida' : 'Marcar lida'}</span>
                          <span className="sm:hidden">{n.is_read ? 'Não lida' : 'Lida'}</span>
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          className="flex-1 sm:flex-none gap-2"
                          onClick={() => handleArchive(n.id)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Archive className="size-3.5" />
                          )}
                          <span className="hidden sm:inline">Arquivar</span>
                          <span className="sm:hidden">Arquivar</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
