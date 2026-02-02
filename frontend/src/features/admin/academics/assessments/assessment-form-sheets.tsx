'use client';

import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Pencil, Trash2 } from 'lucide-react';
import { ReactNode } from 'react';

import { adminAssessmentsApi } from '@/features/admin/academics/assessments/api';
import type { Assessment } from '@/features/admin/academics/assessments/types';
import { FormSheet } from '@/components/shared/form-sheet';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Combobox } from '@/components/shared/combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatAssessmentKind } from '@/features/admin/academics/i18n';

const schema = z.object({
  section_id: z.string().uuid(),
  name: z.string().min(1),
  kind: z.string().min(1),
  weight: z.coerce.number().gt(0),
  max_score: z.coerce.number().gt(0),
  due_date: z.string().optional(),
});

const ASSESSMENT_KINDS = ['EXAM', 'ASSIGNMENT', 'PROJECT', 'QUIZ', 'PRESENTATION', 'PARTICIPATION'] as const;

type SectionOption = { id: string; label: string; description?: string };

export function CreateAssessmentSheet({ 
  sections,
  trigger,
}: { 
  sections: SectionOption[];
  trigger?: ReactNode;
}) {
  const router = useRouter();
  const firstSection = sections[0]?.id || '';
  return (
    <FormSheet
      title="Nova avaliação"
      description="Cadastre uma avaliação por turma."
      triggerLabel={trigger ? undefined : "Nova avaliação"}
      trigger={trigger}
      schema={schema}
      defaultValues={{
        section_id: firstSection,
        name: '',
        kind: 'EXAM',
        weight: 1,
        max_score: 10,
        due_date: '',
      }}
      onSubmit={async (values) => {
        await adminAssessmentsApi.create({
          section_id: values.section_id,
          name: values.name,
          kind: values.kind,
          weight: values.weight,
          max_score: values.max_score,
          due_date: values.due_date || null,
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
              <Input id="section_id" placeholder="UUID da turma" {...form.register('section_id')} />
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kind">Tipo</Label>
              <Select
                value={form.watch('kind')}
                onValueChange={(v) => form.setValue('kind', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ASSESSMENT_KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {formatAssessmentKind(kind)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Data (opcional)</Label>
              <Input id="due_date" type="date" {...form.register('due_date')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" placeholder="Prova 1" {...form.register('name')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="weight">Peso</Label>
              <Input id="weight" type="number" step="0.1" {...form.register('weight')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_score">Nota máxima</Label>
              <Input id="max_score" type="number" step="0.1" {...form.register('max_score')} />
            </div>
          </div>
        </>
      )}
    </FormSheet>
  );
}

export function EditAssessmentSheet({ assessment, sections }: { assessment: Assessment; sections: SectionOption[] }) {
  const router = useRouter();
  return (
    <FormSheet
      title="Editar avaliação"
      description={assessment.name}
      trigger={
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Editar
        </Button>
      }
      schema={schema}
      defaultValues={{
        section_id: assessment.section_id,
        name: assessment.name,
        kind: assessment.kind,
        weight: Number(assessment.weight),
        max_score: Number(assessment.max_score),
        due_date: assessment.due_date || '',
      }}
      onSubmit={async (values) => {
        await adminAssessmentsApi.update(assessment.id, {
          section_id: values.section_id,
          name: values.name,
          kind: values.kind,
          weight: values.weight,
          max_score: values.max_score,
          due_date: values.due_date || null,
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kind">Tipo</Label>
              <Select
                value={form.watch('kind')}
                onValueChange={(v) => form.setValue('kind', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ASSESSMENT_KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {formatAssessmentKind(kind)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Data (opcional)</Label>
              <Input id="due_date" type="date" {...form.register('due_date')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" {...form.register('name')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="weight">Peso</Label>
              <Input id="weight" type="number" step="0.1" {...form.register('weight')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_score">Nota máxima</Label>
              <Input id="max_score" type="number" step="0.1" {...form.register('max_score')} />
            </div>
          </div>
        </>
      )}
    </FormSheet>
  );
}

export function DeleteAssessmentButton({ assessmentId, label }: { assessmentId: string; label: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title="Remover avaliação?"
      description={label}
      confirmLabel="Remover"
      onConfirm={async () => {
        await adminAssessmentsApi.remove(assessmentId);
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
