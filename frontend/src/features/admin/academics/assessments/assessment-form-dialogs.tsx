'use client';

import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Pencil, Trash2, FileText, Calendar, Weight, Star, BookOpen, Tag } from 'lucide-react';
import { ReactNode } from 'react';

import { adminAssessmentsApi } from '@/features/admin/academics/assessments/api';
import type { Assessment } from '@/features/admin/academics/assessments/types';
import { FormDialog } from '@/components/shared/form-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Combobox } from '@/components/shared/combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatAssessmentKind } from '@/features/admin/academics/i18n';

const schema = z.object({
  section_id: z.string().uuid('Selecione uma turma'),
  name: z.string().min(1, 'Nome é obrigatório'),
  kind: z.string().min(1, 'Tipo é obrigatório'),
  weight: z.coerce.number().gt(0, 'Peso deve ser maior que 0'),
  max_score: z.coerce.number().gt(0, 'Nota máxima deve ser maior que 0'),
  due_date: z.string().optional(),
});

const ASSESSMENT_KINDS = [
  { value: 'EXAM', label: 'Prova', icon: FileText },
  { value: 'ASSIGNMENT', label: 'Trabalho', icon: BookOpen },
  { value: 'PROJECT', label: 'Projeto', icon: FileText },
  { value: 'QUIZ', label: 'Quiz', icon: FileText },
  { value: 'PRESENTATION', label: 'Apresentação', icon: FileText },
  { value: 'PARTICIPATION', label: 'Participação', icon: FileText },
] as const;

type SectionOption = { id: string; label: string; description?: string };

export function CreateAssessmentDialog({ 
  sections,
  trigger,
}: { 
  sections: SectionOption[];
  trigger?: ReactNode;
}) {
  const router = useRouter();
  const firstSection = sections[0]?.id || '';
  
  return (
    <FormDialog
      title="Nova Avaliação"
      description="Cadastre uma nova avaliação para a turma selecionada."
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
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              Turma
            </Label>
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
            {form.formState.errors.section_id && (
              <p className="text-sm text-destructive">{form.formState.errors.section_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Nome da Avaliação
            </Label>
            <Input 
              id="name" 
              placeholder="Ex: Prova 1, Trabalho Final..." 
              {...form.register('name')} 
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Tipo
              </Label>
              <Select
                value={form.watch('kind')}
                onValueChange={(v) => form.setValue('kind', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {ASSESSMENT_KINDS.map((kind) => (
                    <SelectItem key={kind.value} value={kind.value}>
                      <div className="flex items-center gap-2">
                        <kind.icon className="h-4 w-4 text-muted-foreground" />
                        {kind.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Data (opcional)
              </Label>
              <Input id="due_date" type="date" {...form.register('due_date')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="weight" className="flex items-center gap-2">
                <Weight className="h-4 w-4 text-muted-foreground" />
                Peso
              </Label>
              <Input 
                id="weight" 
                type="number" 
                step="0.1" 
                min="0.1"
                {...form.register('weight')} 
              />
              {form.formState.errors.weight && (
                <p className="text-sm text-destructive">{form.formState.errors.weight.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_score" className="flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                Nota Máxima
              </Label>
              <Input 
                id="max_score" 
                type="number" 
                step="0.5" 
                min="1"
                {...form.register('max_score')} 
              />
              {form.formState.errors.max_score && (
                <p className="text-sm text-destructive">{form.formState.errors.max_score.message}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </FormDialog>
  );
}

export function EditAssessmentDialog({ assessment, sections }: { assessment: Assessment; sections: SectionOption[] }) {
  const router = useRouter();
  
  return (
    <FormDialog
      title="Editar Avaliação"
      description={`Editando: ${assessment.name}`}
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
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              Turma
            </Label>
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
            <Label htmlFor="name" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Nome da Avaliação
            </Label>
            <Input id="name" {...form.register('name')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Tipo
              </Label>
              <Select
                value={form.watch('kind')}
                onValueChange={(v) => form.setValue('kind', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ASSESSMENT_KINDS.map((kind) => (
                    <SelectItem key={kind.value} value={kind.value}>
                      <div className="flex items-center gap-2">
                        <kind.icon className="h-4 w-4 text-muted-foreground" />
                        {kind.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Data (opcional)
              </Label>
              <Input id="due_date" type="date" {...form.register('due_date')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="weight" className="flex items-center gap-2">
                <Weight className="h-4 w-4 text-muted-foreground" />
                Peso
              </Label>
              <Input id="weight" type="number" step="0.1" {...form.register('weight')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_score" className="flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                Nota Máxima
              </Label>
              <Input id="max_score" type="number" step="0.5" {...form.register('max_score')} />
            </div>
          </div>
        </div>
      )}
    </FormDialog>
  );
}

export function DeleteAssessmentButton({ assessmentId, label }: { assessmentId: string; label: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title="Remover avaliação?"
      description={`A avaliação "${label}" será removida permanentemente. Esta ação não pode ser desfeita.`}
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
