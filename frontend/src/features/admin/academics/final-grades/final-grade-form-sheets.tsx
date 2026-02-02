'use client';

import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Pencil, Trash2 } from 'lucide-react';
import { ReactNode } from 'react';

import { adminFinalGradesApi } from '@/features/admin/academics/final-grades/api';
import { adminStudentsApi } from '@/features/admin/academics/students/api';
import type { FinalGrade } from '@/features/admin/academics/final-grades/types';
import { FormSheet } from '@/components/shared/form-sheet';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Combobox } from '@/components/shared/combobox';
import { AsyncCombobox } from '@/components/shared/async-combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatFinalGradeStatus, type FinalGradeStatus } from '@/features/admin/academics/i18n';

const createSchema = z.object({
  section_id: z.string().uuid(),
  student_id: z.string().uuid(),
  final_score: z.coerce.number().min(0).max(10).optional(),
  absences_count: z.coerce.number().int().min(0),
  absences_pct: z.coerce.number().min(0).max(100),
  status: z.enum(['IN_PROGRESS', 'APPROVED', 'FAILED']),
});

const updateSchema = z.object({
  final_score: z.coerce.number().min(0).max(10).optional(),
  absences_count: z.coerce.number().int().min(0).optional(),
  absences_pct: z.coerce.number().min(0).max(100).optional(),
  status: z.enum(['IN_PROGRESS', 'APPROVED', 'FAILED']).optional(),
});

type Option = { id: string; label: string; description?: string };

export function CreateFinalGradeSheet({
  sections,
  trigger,
}: {
  sections: Option[];
  trigger?: ReactNode;
}) {
  const router = useRouter();
  const firstSection = sections[0]?.id || '';

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
    <FormSheet
      title="Nova nota final"
      description="Cadastro manual por turma e aluno."
      triggerLabel={trigger ? undefined : "Nova nota final"}
      trigger={trigger}
      schema={createSchema}
      defaultValues={{
        section_id: firstSection,
        student_id: '',
        final_score: 0,
        absences_count: 0,
        absences_pct: 0,
        status: 'IN_PROGRESS',
      }}
      onSubmit={async (values) => {
        await adminFinalGradesApi.create({
          section_id: values.section_id,
          student_id: values.student_id,
          final_score: values.final_score ?? null,
          absences_count: values.absences_count,
          absences_pct: values.absences_pct,
          status: values.status,
        });
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="space-y-2">
            <Label>Turma</Label>
            {sections.length > 0 ? (
              <Combobox
                value={form.watch('section_id')}
                onValueChange={(v) => form.setValue('section_id', v)}
                options={sections.map((s) => ({ value: s.id, label: s.label, description: s.description }))}
                placeholder="Selecione uma turma"
                searchPlaceholder="Buscar turma..."
              />
            ) : (
              <Input id="section_id" {...form.register('section_id')} />
            )}
          </div>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="final_score">Nota</Label>
              <Input id="final_score" type="number" step="0.1" min={0} max={10} {...form.register('final_score')} />
            </div>
            <div className="space-y-2">
              <Label>Situação</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(v) => form.setValue('status', v as FinalGradeStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(['IN_PROGRESS', 'APPROVED', 'FAILED'] as const).map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatFinalGradeStatus(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="absences_count">Faltas</Label>
              <Input id="absences_count" type="number" min={0} {...form.register('absences_count')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="absences_pct">Faltas (%)</Label>
              <Input id="absences_pct" type="number" step="0.01" min={0} max={100} {...form.register('absences_pct')} />
            </div>
          </div>
        </>
      )}
    </FormSheet>
  );
}

export function EditFinalGradeSheet({ grade }: { grade: FinalGrade }) {
  const router = useRouter();
  return (
    <FormSheet
      title="Editar nota final"
      description={`Nota: ${grade.final_score === null ? '—' : Number(grade.final_score).toFixed(1)} • ${formatFinalGradeStatus(grade.status as FinalGradeStatus)}`}
      trigger={
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Editar
        </Button>
      }
      schema={updateSchema}
      defaultValues={{
        final_score: grade.final_score === null ? undefined : Number(grade.final_score),
        absences_count: grade.absences_count,
        absences_pct: Number(grade.absences_pct),
        status: grade.status as 'IN_PROGRESS' | 'APPROVED' | 'FAILED',
      }}
      onSubmit={async (values) => {
        await adminFinalGradesApi.update(grade.id, {
          final_score: values.final_score ?? null,
          absences_count: values.absences_count,
          absences_pct: values.absences_pct,
          status: values.status,
        });
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="final_score">Nota</Label>
              <Input id="final_score" type="number" step="0.1" min={0} max={10} {...form.register('final_score')} />
            </div>
            <div className="space-y-2">
              <Label>Situação</Label>
              <Select
                value={form.watch('status') ?? '__unchanged__'}
                onValueChange={(v) =>
                  form.setValue('status', (v === '__unchanged__' ? undefined : v) as FinalGradeStatus | undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unchanged__">Não alterar</SelectItem>
                  {(['IN_PROGRESS', 'APPROVED', 'FAILED'] as const).map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatFinalGradeStatus(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="absences_count">Faltas</Label>
              <Input id="absences_count" type="number" min={0} {...form.register('absences_count')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="absences_pct">Faltas (%)</Label>
              <Input id="absences_pct" type="number" step="0.01" min={0} max={100} {...form.register('absences_pct')} />
            </div>
          </div>
        </>
      )}
    </FormSheet>
  );
}

export function DeleteFinalGradeButton({ gradeId, label }: { gradeId: string; label?: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title="Remover nota final?"
      description={label || gradeId}
      confirmLabel="Remover"
      onConfirm={async () => {
        await adminFinalGradesApi.remove(gradeId);
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
