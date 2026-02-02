'use client';

import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Pencil, Trash2 } from 'lucide-react';
import { ReactNode } from 'react';

import { adminSessionsApi } from '@/features/admin/academics/sessions/api';
import type { ClassSession } from '@/features/admin/academics/sessions/types';
import { FormSheet } from '@/components/shared/form-sheet';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const schema = z.object({
  session_date: z.string().min(1),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  room: z.string().optional(),
  is_canceled: z.boolean(),
});

export function CreateSessionSheet({ 
  sectionId,
  trigger,
}: { 
  sectionId: string;
  trigger?: ReactNode;
}) {
  const router = useRouter();
  return (
    <FormSheet
      title="Nova aula"
      description="Crie uma aula por data."
      triggerLabel={trigger ? undefined : "Nova aula"}
      trigger={trigger}
      schema={schema}
      defaultValues={{
        session_date: '',
        start_time: '19:00:00',
        end_time: '21:00:00',
        room: '',
        is_canceled: false,
      }}
      onSubmit={async (values) => {
        await adminSessionsApi.createForSection(sectionId, {
          session_date: values.session_date,
          start_time: values.start_time,
          end_time: values.end_time,
          room: values.room || null,
          is_canceled: values.is_canceled,
        });
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="session_date">Data</Label>
              <Input id="session_date" type="date" {...form.register('session_date')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room">Sala (opcional)</Label>
              <Input id="room" placeholder="Sala 1" {...form.register('room')} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_time">Início</Label>
              <Input id="start_time" placeholder="19:00:00" {...form.register('start_time')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Fim</Label>
              <Input id="end_time" placeholder="21:00:00" {...form.register('end_time')} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
            <div>
              <p className="text-sm font-medium">Cancelada</p>
              <p className="text-xs text-muted-foreground">Marque se a aula não ocorrerá.</p>
            </div>
            <Switch checked={form.watch('is_canceled')} onCheckedChange={(v) => form.setValue('is_canceled', v)} />
          </div>
        </>
      )}
    </FormSheet>
  );
}

export function EditSessionSheet({ session }: { session: ClassSession }) {
  const router = useRouter();
  return (
    <FormSheet
      title="Editar aula"
      description={`${session.session_date} • ${session.start_time}`}
      trigger={
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Editar
        </Button>
      }
      schema={schema}
      defaultValues={{
        session_date: session.session_date,
        start_time: session.start_time,
        end_time: session.end_time,
        room: session.room || '',
        is_canceled: session.is_canceled,
      }}
      onSubmit={async (values) => {
        await adminSessionsApi.update(session.id, {
          session_date: values.session_date,
          start_time: values.start_time,
          end_time: values.end_time,
          room: values.room || null,
          is_canceled: values.is_canceled,
        });
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="session_date">Data</Label>
              <Input id="session_date" type="date" {...form.register('session_date')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room">Sala (opcional)</Label>
              <Input id="room" {...form.register('room')} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_time">Início</Label>
              <Input id="start_time" {...form.register('start_time')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Fim</Label>
              <Input id="end_time" {...form.register('end_time')} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
            <div>
              <p className="text-sm font-medium">Cancelada</p>
              <p className="text-xs text-muted-foreground">Marque se a aula não ocorrerá.</p>
            </div>
            <Switch checked={form.watch('is_canceled')} onCheckedChange={(v) => form.setValue('is_canceled', v)} />
          </div>
        </>
      )}
    </FormSheet>
  );
}

export function DeleteSessionButton({ sessionId, label }: { sessionId: string; label: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title="Remover aula?"
      description={label}
      confirmLabel="Remover"
      onConfirm={async () => {
        await adminSessionsApi.remove(sessionId);
        router.refresh();
      }}
      trigger={
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Remover
        </Button>
      }
    />
  );
}

