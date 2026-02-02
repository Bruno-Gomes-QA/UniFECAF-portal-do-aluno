'use client';

import { useRouter } from 'next/navigation';
import { Controller, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Pencil, Power, PowerOff, Trash2, Info } from 'lucide-react';

import { adminSubjectsApi } from '@/features/admin/academics/subjects/api';
import type { Subject } from '@/features/admin/academics/subjects/types';
import { handleApiError } from '@/lib/api/error-handler';
import { FormDialog } from '@/components/shared/form-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/shared/combobox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type CourseOption = { id: string; name: string; duration_terms: number; is_active: boolean };

const createSchema = z.object({
  course_id: z.string().uuid('Curso obrigatório'),
  code: z.string()
    .min(2, 'Código deve ter no mínimo 2 caracteres')
    .max(20, 'Código deve ter no máximo 20 caracteres')
    .regex(/^[A-Z0-9\-]+$/i, 'Apenas letras, números e hífen')
    .transform(v => v.toUpperCase()),
  name: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(200, 'Nome deve ter no máximo 200 caracteres'),
  credits: z.coerce.number()
    .int('Deve ser número inteiro')
    .min(1, 'Mínimo 1 crédito')
    .max(20, 'Máximo 20 créditos'),
  term_number: z.coerce.number()
    .int('Deve ser número inteiro')
    .min(1, 'Mínimo 1º semestre')
    .max(20, 'Máximo 20º semestre')
    .optional()
    .or(z.literal('')),
});

const editSchema = z.object({
  course_id: z.string().uuid('Curso obrigatório'),
  name: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(200, 'Nome deve ter no máximo 200 caracteres'),
  credits: z.coerce.number()
    .int('Deve ser número inteiro')
    .min(1, 'Mínimo 1 crédito')
    .max(20, 'Máximo 20 créditos'),
  term_number: z.coerce.number()
    .int('Deve ser número inteiro')
    .min(1, 'Mínimo 1º semestre')
    .max(20, 'Máximo 20º semestre')
    .optional()
    .or(z.literal('')),
});

function TermNumberSelect({ 
  control, 
  courses 
}: { 
  control: any; 
  courses: CourseOption[];
}) {
  const courseId = useWatch({ control, name: 'course_id' });
  const selectedCourse = courses.find(c => c.id === courseId);
  const maxTerm = selectedCourse?.duration_terms || 10;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="term_number">Semestre Sugerido</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground">
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Indica em qual semestre da grade a disciplina é geralmente oferecida.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Controller
        control={control}
        name="term_number"
        render={({ field }) => (
          <Select 
            value={field.value?.toString() || 'none'} 
            onValueChange={(v) => field.onChange(v === 'none' ? '' : Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Opcional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Não definido</SelectItem>
              {Array.from({ length: maxTerm }, (_, i) => i + 1).map((term) => (
                <SelectItem key={term} value={term.toString()}>
                  {term}º Semestre
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <p className="text-xs text-muted-foreground">
        {selectedCourse ? `Curso tem ${selectedCourse.duration_terms} semestres` : 'Selecione um curso'}
      </p>
    </div>
  );
}

export function CreateSubjectSheet({ 
  courses, 
  defaultCourseId,
  trigger 
}: { 
  courses: CourseOption[]; 
  defaultCourseId?: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const activeCourses = courses.filter(c => c.is_active);
  const firstCourse = defaultCourseId || activeCourses[0]?.id || '';

  return (
    <FormDialog
      title="Nova disciplina"
      description="Cadastre uma disciplina para um curso."
      triggerLabel="Nova disciplina"
      trigger={trigger}
      schema={createSchema}
      defaultValues={{
        course_id: firstCourse,
        code: '',
        name: '',
        credits: 4,
        term_number: '',
      }}
      onSubmit={async (values) => {
        await adminSubjectsApi.create({
          course_id: values.course_id,
          code: values.code.toUpperCase(),
          name: values.name,
          credits: values.credits,
          term_number: values.term_number || null,
        });
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="space-y-2">
            <Label>Curso</Label>
            <Combobox
              value={form.watch('course_id')}
              onValueChange={(v) => form.setValue('course_id', v)}
              options={activeCourses.map((c) => ({ value: c.id, label: `${c.name}` }))}
              placeholder="Selecione um curso"
              searchPlaceholder="Buscar curso..."
            />
            <p className="text-xs text-muted-foreground">Apenas cursos ativos são listados.</p>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input 
                id="code" 
                placeholder="MAT-101" 
                className="uppercase"
                {...form.register('code')} 
              />
              <p className="text-xs text-muted-foreground">Sigla única da disciplina</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="credits">Créditos</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground">
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>1 crédito = 15 horas de aula</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input 
                id="credits" 
                type="number" 
                min={1} 
                max={20}
                {...form.register('credits')} 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Disciplina</Label>
            <Input 
              id="name" 
              placeholder="Cálculo Diferencial e Integral I" 
              {...form.register('name')} 
            />
          </div>
          
          <TermNumberSelect control={form.control} courses={courses} />
        </>
      )}
    </FormDialog>
  );
}

export function EditSubjectSheet({ subject, courses }: { subject: Subject; courses: CourseOption[] }) {
  const router = useRouter();
  const hasActiveSections = (subject.sections_count || 0) > 0;

  return (
    <FormDialog
      title="Editar disciplina"
      description={`${subject.code} - ${subject.name}`}
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground">
          <Pencil className="h-3.5 w-3.5" />
          <span className="sr-only">Editar</span>
        </Button>
      }
      schema={editSchema}
      defaultValues={{
        course_id: subject.course_id,
        name: subject.name,
        credits: subject.credits,
        term_number: subject.term_number ?? '',
      }}
      onSubmit={async (values) => {
        await adminSubjectsApi.update(subject.id, {
          course_id: values.course_id,
          name: values.name,
          credits: values.credits,
          term_number: values.term_number || null,
        });
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="space-y-2">
            <Label>Código</Label>
            <Input value={subject.code} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Código não pode ser alterado.</p>
          </div>
          
          <div className="space-y-2">
            <Label>Curso</Label>
            {hasActiveSections ? (
              <>
                <Input 
                  value={subject.course_name || courses.find(c => c.id === subject.course_id)?.name || 'N/A'} 
                  disabled 
                  className="bg-muted" 
                />
                <p className="text-xs text-amber-600">Disciplina possui turmas. Curso não pode ser alterado.</p>
              </>
            ) : (
              <Combobox
                value={form.watch('course_id')}
                onValueChange={(v) => form.setValue('course_id', v)}
                options={courses.filter(c => c.is_active).map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Selecione um curso"
                searchPlaceholder="Buscar curso..."
              />
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Disciplina</Label>
            <Input id="name" {...form.register('name')} />
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="credits">Créditos</Label>
              <Input 
                id="credits" 
                type="number" 
                min={1} 
                max={20}
                {...form.register('credits')} 
              />
              <p className="text-xs text-muted-foreground">{subject.workload_hours}h de carga horária</p>
            </div>
            
            <TermNumberSelect control={form.control} courses={courses} />
          </div>
        </>
      )}
    </FormDialog>
  );
}

export function ToggleSubjectStatusButton({ subject }: { subject: Subject }) {
  const router = useRouter();
  const isActive = subject.is_active;
  
  if (isActive) {
    return (
      <ConfirmDialog
        title="Desativar disciplina?"
        description={`A disciplina "${subject.name}" será desativada. Disciplinas inativas não podem ter novas turmas criadas.`}
        confirmLabel="Desativar"
        onConfirm={async () => {
          try {
            await adminSubjectsApi.deactivate(subject.id);
            router.refresh();
          } catch (err) {
            handleApiError(err, 'Erro ao desativar disciplina.');
          }
        }}
        trigger={
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
            <PowerOff className="h-3.5 w-3.5" />
            <span className="sr-only">Desativar</span>
          </Button>
        }
      />
    );
  }
  
  return (
    <ConfirmDialog
      title="Reativar disciplina?"
      description={`A disciplina "${subject.name}" será reativada e poderá ter novas turmas.`}
      confirmLabel="Reativar"
      onConfirm={async () => {
        try {
          await adminSubjectsApi.activate(subject.id);
          router.refresh();
        } catch (err) {
          handleApiError(err, 'Erro ao reativar disciplina.');
        }
      }}
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600">
          <Power className="h-3.5 w-3.5" />
          <span className="sr-only">Reativar</span>
        </Button>
      }
    />
  );
}

export function DeleteSubjectButton({ subject }: { subject: Subject }) {
  const router = useRouter();
  
  // Não permite excluir se tem turmas
  if ((subject.sections_count || 0) > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground cursor-not-allowed opacity-50"
                disabled
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Disciplina possui {subject.sections_count} turma(s). Desative em vez de excluir.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <ConfirmDialog
      title="Remover disciplina?"
      description={`Isto removerá permanentemente a disciplina "${subject.name}". Esta ação não pode ser desfeita.`}
      confirmLabel="Remover"
      onConfirm={async () => {
        await adminSubjectsApi.remove(subject.id);
        router.refresh();
      }}
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
          <span className="sr-only">Remover</span>
        </Button>
      }
    />
  );
}
