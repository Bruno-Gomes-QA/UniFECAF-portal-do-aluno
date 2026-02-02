'use client';

import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Pencil, Trash2 } from 'lucide-react';
import { ReactNode, useState } from 'react';

import { adminAssessmentGradesApi } from '@/features/admin/academics/assessment-grades/api';
import { adminStudentsApi } from '@/features/admin/academics/students/api';
import type { AssessmentGrade } from '@/features/admin/academics/assessment-grades/types';
import { FormDialog } from '@/components/shared/form-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Combobox } from '@/components/shared/combobox';
import { AsyncCombobox } from '@/components/shared/async-combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const createSchema = z.object({
  assessment_id: z.string().uuid(),
  student_id: z.string().uuid(),
  score: z.coerce.number().min(0),
});

const updateSchema = z.object({
  score: z.coerce.number().min(0),
});

type Option = { id: string; label: string; description?: string };

export function CreateAssessmentGradeSheet({
  assessments,
  trigger,
}: {
  assessments: Option[];
  trigger?: ReactNode;
}) {
  const router = useRouter();
  const [studentValue, setStudentValue] = useState('');
  const firstAssessment = assessments[0]?.id || '';

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
      title="Nova nota"
      description="Cadastro manual de nota por avaliação."
      triggerLabel={trigger ? undefined : "Nova nota"}
      trigger={trigger}
      schema={createSchema}
      defaultValues={{ assessment_id: firstAssessment, student_id: '', score: 0 }}
      onSubmit={async (values) => {
        await adminAssessmentGradesApi.create(values);
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="space-y-2">
            <Label>Avaliação</Label>
            {assessments.length > 0 ? (
              <Combobox
                value={form.watch('assessment_id')}
                onValueChange={(v) => form.setValue('assessment_id', v)}
                options={assessments.map((a) => ({ value: a.id, label: a.label, description: a.description }))}
                placeholder="Selecione uma avaliação"
                searchPlaceholder="Buscar avaliação..."
              />
            ) : (
              <Input id="assessment_id" placeholder="UUID da avaliação" {...form.register('assessment_id')} />
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
          <div className="space-y-2">
            <Label htmlFor="score">Nota</Label>
            <Input id="score" type="number" step="0.1" min={0} {...form.register('score')} />
          </div>
        </>
      )}
    </FormDialog>
  );
}

export function EditAssessmentGradeSheet({ grade }: { grade: AssessmentGrade }) {
  const router = useRouter();
  return (
    <FormDialog
      title="Editar nota"
      description={`Nota: ${Number(grade.score).toFixed(1)}`}
      trigger={
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Editar
        </Button>
      }
      schema={updateSchema}
      defaultValues={{ score: Number(grade.score) }}
      onSubmit={async (values) => {
        await adminAssessmentGradesApi.update(grade.id, values);
        router.refresh();
      }}
    >
      {(form) => (
        <div className="space-y-2">
          <Label htmlFor="score">Nota</Label>
          <Input id="score" type="number" step="0.1" min={0} {...form.register('score')} />
        </div>
      )}
    </FormDialog>
  );
}

export function DeleteAssessmentGradeButton({ gradeId, label }: { gradeId: string; label?: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title="Remover nota?"
      description={label || gradeId}
      confirmLabel="Remover"
      onConfirm={async () => {
        await adminAssessmentGradesApi.remove(gradeId);
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
