'use client';

import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Pencil, Trash2 } from 'lucide-react';
import { ReactNode } from 'react';

import { adminAttendanceApi } from '@/features/admin/academics/attendance/api';
import { adminStudentsApi } from '@/features/admin/academics/students/api';
import type { Attendance } from '@/features/admin/academics/attendance/types';
import { FormDialog } from '@/components/shared/form-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { AsyncCombobox } from '@/components/shared/async-combobox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatAttendanceStatus, type AttendanceStatus } from '@/features/admin/academics/i18n';

const createSchema = z.object({
  session_id: z.string().uuid(),
  student_id: z.string().uuid(),
  status: z.enum(['PRESENT', 'ABSENT', 'EXCUSED']),
});

const updateSchema = z.object({
  status: z.enum(['PRESENT', 'ABSENT', 'EXCUSED']),
});

export function CreateAttendanceSheet({ 
  sessionId = '',
  trigger,
}: { 
  sessionId?: string;
  trigger?: ReactNode;
}) {
  const router = useRouter();

  const loadStudents = async ({ search, offset, limit }: { search: string; offset: number; limit: number }) => {
    try {
      const result = await adminStudentsApi.list({ 
        search: search || undefined,
        limit, 
        offset 
      });
      return {
        options: result.items.map(student => ({
          value: student.user_id,
          label: `${student.full_name} (${student.ra})`,
          description: `Status: ${student.status}`
        })),
        hasMore: result.total > offset + limit
      };
    } catch (error) {
      return { options: [], hasMore: false };
    }
  };

  return (
    <FormDialog
      title="Nova presença"
      description="Registre presença de um aluno na aula."
      triggerLabel={trigger ? undefined : "Nova presença"}
      trigger={trigger}
      schema={createSchema}
      defaultValues={{ session_id: sessionId, student_id: '', status: 'PRESENT' }}
      onSubmit={async (values) => {
        await adminAttendanceApi.create(values);
        router.refresh();
      }}
    >
      {(form) => (
        <>
          {!sessionId && (
            <div className="space-y-2">
              <Label>ID da aula</Label>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-mono"
                {...form.register('session_id')}
                placeholder="UUID da aula"
              />
              <p className="text-xs text-muted-foreground">Use o ID disponível na tela de Aulas.</p>
            </div>
          )}
          {sessionId && <input type="hidden" {...form.register('session_id')} />}
          <div className="space-y-2">
            <Label>Aluno</Label>
            <AsyncCombobox
              value={form.watch('student_id')}
              onValueChange={(v) => form.setValue('student_id', v)}
              loadOptions={loadStudents}
              placeholder="Buscar aluno por nome ou RA"
              searchPlaceholder="Digite para buscar..."
            />
            {form.formState.errors.student_id && (
              <p className="text-xs text-destructive">Selecione um aluno</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Situação</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(v) => form.setValue('status', v as AttendanceStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {(['PRESENT', 'ABSENT', 'EXCUSED'] as const).map((status) => (
                  <SelectItem key={status} value={status}>
                    {formatAttendanceStatus(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </FormDialog>
  );
}

export function EditAttendanceSheet({ record }: { record: Attendance }) {
  const router = useRouter();
  return (
    <FormDialog
      title="Editar presença"
      description={record.id}
      trigger={
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Editar
        </Button>
      }
      schema={updateSchema}
      defaultValues={{ status: record.status as 'PRESENT' | 'ABSENT' | 'EXCUSED' }}
      onSubmit={async (values) => {
        await adminAttendanceApi.update(record.id, values);
        router.refresh();
      }}
    >
      {(form) => (
        <div className="space-y-2">
          <Label>Situação</Label>
          <Select
            value={form.watch('status')}
            onValueChange={(v) => form.setValue('status', v as AttendanceStatus)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {(['PRESENT', 'ABSENT', 'EXCUSED'] as const).map((status) => (
                <SelectItem key={status} value={status}>
                  {formatAttendanceStatus(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </FormDialog>
  );
}

export function DeleteAttendanceButton({ attendanceId }: { attendanceId: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title="Remover presença?"
      description={attendanceId}
      confirmLabel="Remover"
      onConfirm={async () => {
        await adminAttendanceApi.remove(attendanceId);
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
