'use client';

import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { toast } from 'sonner';

import { adminNotificationsApi } from '@/features/admin/comm/notifications/api';
import type { Notification } from '@/features/admin/comm/notifications/types';
import { FormSheet } from '@/components/shared/form-sheet';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  formatNotificationChannel,
  formatNotificationPriority,
  formatNotificationType,
  type NotificationChannel,
  type NotificationPriority,
  type NotificationType,
} from '@/features/admin/comm/i18n';

const schema = z.object({
  type: z.enum(['ACADEMIC', 'FINANCIAL', 'ADMIN']),
  channel: z.enum(['IN_APP', 'EMAIL', 'SMS']),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH']),
  title: z.string().optional(),
  body: z.string().min(1),
});

const deliverSchema = z.object({
  all_students: z.boolean(),
  user_ids: z.string().optional(),
});

export function CreateNotificationSheet({ trigger }: { trigger?: React.ReactNode } = {}) {
  const router = useRouter();
  return (
    <FormSheet
      title="Nova notificação"
      description="Crie uma notificação."
      triggerLabel={trigger ? undefined : "Nova notificação"}
      trigger={trigger}
      schema={schema}
      defaultValues={{ type: 'ADMIN', channel: 'IN_APP', priority: 'NORMAL', title: '', body: '' }}
      onSubmit={async (values) => {
        await adminNotificationsApi.create({
          ...values,
          title: values.title || null,
        });
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.watch('type')}
                onValueChange={(v) => form.setValue('type', v as NotificationType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(['ACADEMIC', 'FINANCIAL', 'ADMIN'] as const).map((value) => (
                    <SelectItem key={value} value={value}>
                      {formatNotificationType(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select
                value={form.watch('channel')}
                onValueChange={(v) => form.setValue('channel', v as NotificationChannel)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(['IN_APP', 'EMAIL', 'SMS'] as const).map((value) => (
                    <SelectItem key={value} value={value}>
                      {formatNotificationChannel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={form.watch('priority')}
                onValueChange={(v) => form.setValue('priority', v as NotificationPriority)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(['LOW', 'NORMAL', 'HIGH'] as const).map((value) => (
                    <SelectItem key={value} value={value}>
                      {formatNotificationPriority(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Título (opcional)</Label>
            <Input id="title" {...form.register('title')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Mensagem</Label>
            <Textarea id="body" rows={6} {...form.register('body')} />
          </div>
        </>
      )}
    </FormSheet>
  );
}

export function EditNotificationSheet({ notification }: { notification: Notification }) {
  const router = useRouter();
  return (
    <FormSheet
      title="Editar notificação"
      description={notification.id}
      trigger={
        <Button variant="outline" size="sm">
          Editar
        </Button>
      }
      schema={schema}
      defaultValues={{
        type: notification.type as 'ACADEMIC' | 'FINANCIAL' | 'ADMIN',
        channel: notification.channel as 'IN_APP' | 'EMAIL' | 'SMS',
        priority: notification.priority as 'LOW' | 'NORMAL' | 'HIGH',
        title: notification.title || '',
        body: notification.body,
      }}
      onSubmit={async (values) => {
        await adminNotificationsApi.update(notification.id, {
          ...values,
          title: values.title || null,
        });
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.watch('type')}
                onValueChange={(v) => form.setValue('type', v as NotificationType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(['ACADEMIC', 'FINANCIAL', 'ADMIN'] as const).map((value) => (
                    <SelectItem key={value} value={value}>
                      {formatNotificationType(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select
                value={form.watch('channel')}
                onValueChange={(v) => form.setValue('channel', v as NotificationChannel)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(['IN_APP', 'EMAIL', 'SMS'] as const).map((value) => (
                    <SelectItem key={value} value={value}>
                      {formatNotificationChannel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={form.watch('priority')}
                onValueChange={(v) => form.setValue('priority', v as NotificationPriority)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(['LOW', 'NORMAL', 'HIGH'] as const).map((value) => (
                    <SelectItem key={value} value={value}>
                      {formatNotificationPriority(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Título (opcional)</Label>
            <Input id="title" {...form.register('title')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Mensagem</Label>
            <Textarea id="body" rows={6} {...form.register('body')} />
          </div>
        </>
      )}
    </FormSheet>
  );
}

export function DeliverNotificationSheet({ notificationId }: { notificationId: string }) {
  const router = useRouter();
  return (
    <FormSheet
      title="Entregar notificação"
      description="Entrega em massa (cria user_notifications)."
      trigger={
        <Button variant="secondary" size="sm">
          Entregar
        </Button>
      }
      schema={deliverSchema}
      defaultValues={{ all_students: true, user_ids: '' }}
      submitLabel="Entregar"
      onSubmit={async (values) => {
        const ids = (values.user_ids || '')
          .split(/[,\\n\\r\\t ]+/g)
          .map((s) => s.trim())
          .filter(Boolean);
        const result = await adminNotificationsApi.deliver(notificationId, {
          all_students: values.all_students,
          user_ids: ids,
        });
        toast.success(`Entregues: ${result.delivered} • Já existiam: ${result.skipped_existing}`);
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <Checkbox
              checked={form.watch('all_students')}
              onCheckedChange={(v) => form.setValue('all_students', Boolean(v))}
            />
            <div className="text-sm">
              <p className="font-medium">Entregar para todos os alunos</p>
              <p className="text-xs text-muted-foreground">Se marcado, ignora a lista de user_ids.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="user_ids">User IDs (separados por vírgula ou linha)</Label>
            <Textarea id="user_ids" rows={5} placeholder="UUID1\nUUID2" {...form.register('user_ids')} />
          </div>
        </>
      )}
    </FormSheet>
  );
}

export function DeleteNotificationButton({ notificationId }: { notificationId: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title="Remover notificação?"
      description={notificationId}
      confirmLabel="Remover"
      onConfirm={async () => {
        await adminNotificationsApi.remove(notificationId);
        router.refresh();
      }}
      trigger={
        <Button variant="destructive" size="sm">
          Remover
        </Button>
      }
    />
  );
}

export function ArchiveNotificationButton({ notificationId, isArchived }: { notificationId: string; isArchived: boolean }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title={isArchived ? "Desarquivar notificação?" : "Arquivar notificação?"}
      description={isArchived ? "A notificação voltará a aparecer na lista principal." : "A notificação será movida para o arquivo."}
      confirmLabel={isArchived ? "Desarquivar" : "Arquivar"}
      onConfirm={async () => {
        if (isArchived) {
          await adminNotificationsApi.unarchive(notificationId);
          toast.success('Notificação desarquivada!');
        } else {
          await adminNotificationsApi.archive(notificationId);
          toast.success('Notificação arquivada!');
        }
        router.refresh();
      }}
      trigger={
        <Button variant="outline" size="sm">
          {isArchived ? 'Desarquivar' : 'Arquivar'}
        </Button>
      }
    />
  );
}
