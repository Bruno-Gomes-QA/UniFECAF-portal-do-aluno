'use client';

import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Pencil, Trash2 } from 'lucide-react';
import { ReactNode } from 'react';
import { toast } from 'sonner';

import { adminEnrollmentsApi } from '@/features/admin/academics/enrollments/api';
import type { SectionEnrollment } from '@/features/admin/academics/enrollments/types';
import { FormDialog } from '@/components/shared/form-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Combobox } from '@/components/shared/combobox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatEnrollmentStatus, type EnrollmentStatus } from '@/features/admin/academics/i18n';

const schema = z.object({
  student_id: z.string().uuid(),
  section_id: z.string().uuid(),
  status: z.enum(['ENROLLED', 'LOCKED', 'DROPPED', 'COMPLETED']),
});

const statusSchema = z.object({
  status: z.enum(['ENROLLED', 'LOCKED', 'DROPPED', 'COMPLETED']),
});

type Option = { id: string; label: string };

export function CreateEnrollmentSheet({
  students,
  sections,
  trigger,
}: {
  students: Option[];
  sections: Option[];
  trigger?: ReactNode;
}) {
  const router = useRouter();

  return (
    <FormDialog
      title="Nova matrícula"
      description="Crie uma matrícula para o aluno na turma."
      triggerLabel={trigger ? undefined : "Nova matrícula"}
      trigger={trigger}
      schema={schema}
      defaultValues={{
        student_id: students[0]?.id || '',
        section_id: sections[0]?.id || '',
        status: 'ENROLLED',
      }}
      onSubmit={async (values) => {
        await adminEnrollmentsApi.create(values);
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="space-y-2">
            <Label>Aluno</Label>
            <Combobox
              value={form.watch('student_id')}
              onValueChange={(v) => form.setValue('student_id', v)}
              options={students.map((s) => ({ value: s.id, label: s.label }))}
              placeholder="Selecione um aluno"
              searchPlaceholder="Buscar aluno..."
            />
          </div>
          <div className="space-y-2">
            <Label>Turma</Label>
            <Combobox
              value={form.watch('section_id')}
              onValueChange={(v) => form.setValue('section_id', v)}
              options={sections.map((s) => ({ value: s.id, label: s.label }))}
              placeholder="Selecione uma turma"
              searchPlaceholder="Buscar turma..."
            />
          </div>
          <div className="space-y-2">
            <Label>Situação</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(v) => form.setValue('status', v as EnrollmentStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {(['ENROLLED', 'LOCKED', 'DROPPED', 'COMPLETED'] as const).map((status) => (
                  <SelectItem key={status} value={status}>
                    {formatEnrollmentStatus(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border p-3 text-xs text-muted-foreground bg-muted/30">
            Dica: se a API retornar erro de conflito, ajuste as turmas para não cair no mesmo dia da semana.
          </div>
        </>
      )}
    </FormDialog>
  );
}

export function EditEnrollmentStatusSheet({ enrollment }: { enrollment: SectionEnrollment }) {
  const router = useRouter();

  return (
    <FormDialog
      title="Alterar status da matrícula"
      description="Atualize o status da matrícula do aluno."
      trigger={
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Status
        </Button>
      }
      schema={statusSchema}
      defaultValues={{
        status: enrollment.status as EnrollmentStatus,
      }}
      onSubmit={async (values) => {
        await adminEnrollmentsApi.updateStatus(enrollment.id, values.status);
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="space-y-2">
            <Label>Situação</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(v) => form.setValue('status', v as EnrollmentStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {(['ENROLLED', 'LOCKED', 'DROPPED', 'COMPLETED'] as const).map((status) => (
                  <SelectItem key={status} value={status}>
                    {formatEnrollmentStatus(status)}
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

export function DeleteEnrollmentButton({ enrollmentId, label }: { enrollmentId: string; label?: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title="Remover matrícula?"
      description={label 
        ? `Remover matrícula de ${label}? Matrículas com presenças, notas de avaliação ou notas finais não podem ser removidas.` 
        : `Matrícula: ${enrollmentId}. Matrículas com presenças, notas de avaliação ou notas finais não podem ser removidas.`}
      confirmLabel="Remover"
      onConfirm={async () => {
        try {
          await adminEnrollmentsApi.remove(enrollmentId);
          toast.success('Matrícula removida com sucesso!');
          router.refresh();
        } catch (error: any) {
          const message = error?.message || 'Erro ao remover matrícula';
          toast.error(message);
        }
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
