'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { adminMeetingsApi } from '@/features/admin/academics/meetings/api';
import type { SectionMeeting } from '@/features/admin/academics/meetings/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

const WEEKDAYS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
];

export function MeetingsSheet({ sectionId, sectionLabel }: { sectionId: string; sectionLabel: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<SectionMeeting[]>([]);

  const [weekday, setWeekday] = React.useState(1);
  const [startTime, setStartTime] = React.useState('19:00:00');
  const [endTime, setEndTime] = React.useState('21:00:00');
  const [room, setRoom] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminMeetingsApi.listBySection(sectionId);
      setItems(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar horários.');
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const create = async () => {
    try {
      await adminMeetingsApi.createForSection(sectionId, {
        weekday,
        start_time: startTime,
        end_time: endTime,
        room: room || null,
      });
      toast.success('Horário criado.');
      await load();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar horário.');
    }
  };

  const remove = async (id: string) => {
    try {
      await adminMeetingsApi.remove(id);
      toast.success('Horário removido.');
      await load();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover horário.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          Horários
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Horários</DialogTitle>
          <DialogDescription>Turma: {sectionLabel}</DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          <div className="rounded-xl border p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Dia da semana</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={weekday}
                  onChange={(e) => setWeekday(Number(e.target.value))}
                >
                  {WEEKDAYS.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Sala (opcional)</Label>
                <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Sala 1" />
              </div>
              <div className="space-y-2">
                <Label>Início</Label>
                <Input value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="19:00:00" />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="21:00:00" />
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={create}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar horário
              </Button>
            </div>
          </div>

          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dia</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Sala</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum horário cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{WEEKDAYS.find((w) => w.value === m.weekday)?.label || m.weekday}</TableCell>
                      <TableCell>
                        {m.start_time.slice(0, 5)}–{m.end_time.slice(0, 5)}
                      </TableCell>
                      <TableCell>{m.room || '-'}</TableCell>
                      <TableCell className="text-right">
                        <ConfirmDialog
                          title="Remover horário?"
                          description={`${WEEKDAYS.find((w) => w.value === m.weekday)?.label || m.weekday} • ${m.start_time.slice(0, 5)}–${m.end_time.slice(0, 5)}`}
                          confirmLabel="Remover"
                          onConfirm={async () => remove(m.id)}
                          trigger={
                            <Button variant="destructive" size="sm">
                              <Trash2 className="mr-1 h-4 w-4" />
                              Remover
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
