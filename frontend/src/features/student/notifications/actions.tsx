'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { apiBrowser } from '@/lib/api/browser';
import { ApiClientError } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';

export function MarkReadButton({ id, read }: { id: string; read: boolean }) {
  const router = useRouter();
  const action = async () => {
    try {
      await apiBrowser.post<void>(`/api/v1/me/notifications/${id}/${read ? 'read' : 'unread'}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
      else toast.error('Erro ao atualizar notificação.');
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={action}>
      {read ? 'Marcar lida' : 'Marcar não lida'}
    </Button>
  );
}

export function ArchiveNotificationButton({ id }: { id: string }) {
  const router = useRouter();
  const action = async () => {
    try {
      await apiBrowser.post<void>(`/api/v1/me/notifications/${id}/archive`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
      else toast.error('Erro ao arquivar.');
    }
  };
  return (
    <Button variant="destructive" size="sm" onClick={action}>
      Arquivar
    </Button>
  );
}

