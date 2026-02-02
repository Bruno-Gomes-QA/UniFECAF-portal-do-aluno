'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Controller } from 'react-hook-form';
import { z } from 'zod';
import { Info, Pencil, BookOpen, ExternalLink, Power, PowerOff, Trash2 } from 'lucide-react';

import { adminCoursesApi } from '@/features/admin/academics/courses/api';
import type { Course, DegreeType } from '@/features/admin/academics/courses/types';
import type { Subject } from '@/features/admin/academics/subjects/types';import { handleApiError } from '@/lib/api/error-handler';import { DEGREE_TYPE_LABELS } from '@/features/admin/academics/courses/i18n';
import { FormDialog } from '@/components/shared/form-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const DEGREE_TYPES: DegreeType[] = ['TECNOLOGO', 'BACHARELADO', 'LICENCIATURA', 'TECNICO', 'POS_GRADUACAO'];

const createSchema = z.object({
  code: z.string()
    .min(2, 'Código deve ter no mínimo 2 caracteres')
    .max(10, 'Código deve ter no máximo 10 caracteres')
    .regex(/^[A-Z0-9]+$/i, 'Apenas letras e números')
    .transform(v => v.toUpperCase()),
  name: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(200, 'Nome deve ter no máximo 200 caracteres'),
  degree_type: z.enum(['TECNOLOGO', 'BACHARELADO', 'LICENCIATURA', 'TECNICO', 'POS_GRADUACAO'] as const),
  duration_terms: z.coerce.number()
    .int('Deve ser número inteiro')
    .min(1, 'Duração mínima é 1 semestre')
    .max(20, 'Duração máxima é 20 semestres'),
});

const editSchema = z.object({
  name: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(200, 'Nome deve ter no máximo 200 caracteres'),
  degree_type: z.enum(['TECNOLOGO', 'BACHARELADO', 'LICENCIATURA', 'TECNICO', 'POS_GRADUACAO'] as const),
  duration_terms: z.coerce.number()
    .int('Deve ser número inteiro')
    .min(1, 'Duração mínima é 1 semestre')
    .max(20, 'Duração máxima é 20 semestres'),
});

export function CreateCourseSheet({ trigger }: { trigger?: React.ReactNode }) {
  const router = useRouter();
  
  return (
    <FormDialog
      title="Novo curso"
      description="Cadastre um novo curso para a instituição."
      triggerLabel="Novo curso"
      trigger={trigger}
      schema={createSchema}
      defaultValues={{ 
        code: '', 
        name: '', 
        degree_type: 'TECNOLOGO' as const, 
        duration_terms: 5 
      }}
      onSubmit={async (values) => {
        await adminCoursesApi.create({
          code: values.code.toUpperCase(),
          name: values.name,
          degree_type: values.degree_type,
          duration_terms: values.duration_terms,
        });
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input 
                id="code" 
                placeholder="ADS" 
                className="uppercase"
                {...form.register('code')} 
              />
              <p className="text-xs text-muted-foreground">Sigla única do curso (ex: ADS, ADM)</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Tipo de Grau</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground">
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Defina a modalidade de ensino do curso.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Controller
                control={form.control}
                name="degree_type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEGREE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {DEGREE_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Curso</Label>
            <Input 
              id="name" 
              placeholder="Análise e Desenvolvimento de Sistemas" 
              {...form.register('name')} 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="duration_terms">Duração (semestres)</Label>
            <Input 
              id="duration_terms" 
              type="number" 
              min={1} 
              max={20}
              {...form.register('duration_terms')} 
            />
            <p className="text-xs text-muted-foreground">Quantidade de semestres para conclusão.</p>
          </div>
        </>
      )}
    </FormDialog>
  );
}

export function EditCourseSheet({ course }: { course: Course }) {
  const router = useRouter();
  
  return (
    <FormDialog
      title="Editar curso"
      description={`${course.code} - ${course.name}`}
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground">
          <Pencil className="h-3.5 w-3.5" />
          <span className="sr-only">Editar</span>
        </Button>
      }
      schema={editSchema}
      defaultValues={{
        name: course.name,
        degree_type: course.degree_type,
        duration_terms: course.duration_terms,
      }}
      onSubmit={async (values) => {
        await adminCoursesApi.update(course.id, {
          name: values.name,
          degree_type: values.degree_type,
          duration_terms: values.duration_terms,
        });
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="space-y-2">
            <Label>Código</Label>
            <Input value={course.code} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Código não pode ser alterado.</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Curso</Label>
            <Input id="name" {...form.register('name')} />
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de Grau</Label>
              <Controller
                control={form.control}
                name="degree_type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEGREE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {DEGREE_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration_terms">Duração (semestres)</Label>
              <Input 
                id="duration_terms" 
                type="number" 
                min={1} 
                max={20}
                {...form.register('duration_terms')} 
              />
            </div>
          </div>
        </>
      )}
    </FormDialog>
  );
}

export function CourseSubjectsDialog({ course }: { course: Course }) {
  const [open, setOpen] = React.useState(false);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setLoading(true);
      adminCoursesApi.listSubjects(course.id)
        .then(data => setSubjects(data.items))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open, course.id]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground">
          <BookOpen className="h-3.5 w-3.5" />
          <span className="sr-only">Ver Disciplinas</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Disciplinas de {course.name}
          </DialogTitle>
          <DialogDescription>
            {course.subjects_count} disciplina(s) cadastrada(s) para este curso.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto border rounded-lg">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              <div className="animate-pulse">Carregando disciplinas...</div>
            </div>
          ) : subjects.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma disciplina cadastrada para este curso.</p>
              <Button variant="link" asChild className="mt-2">
                <a href={`/administrativo/academico/disciplinas?course_id=${course.id}`}>
                  Cadastrar primeira disciplina
                </a>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-center">Créditos</TableHead>
                  <TableHead className="text-center">Semestre</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-sm">{s.code}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm">{s.credits}</span>
                      <span className="text-xs text-muted-foreground ml-1">({s.workload_hours}h)</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {s.term_number ? (
                        <Badge variant="outline">{s.term_number}º</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={s.is_active ? 'default' : 'secondary'}>
                        {s.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" asChild>
            <a href={`/administrativo/academico/disciplinas?course_id=${course.id}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver todas as disciplinas
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ToggleCourseStatusButton({ course }: { course: Course }) {
  const router = useRouter();
  const isActive = course.is_active;
  
  if (isActive) {
    return (
      <ConfirmDialog
        title="Desativar curso?"
        description={`O curso "${course.name}" será desativado. Cursos inativos não aceitam novas matrículas de alunos.`}
        confirmLabel="Desativar"
        onConfirm={async () => {
          try {
            await adminCoursesApi.deactivate(course.id);
            router.refresh();
          } catch (err) {
            handleApiError(err, 'Erro ao desativar curso.');
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
      title="Reativar curso?"
      description={`O curso "${course.name}" será reativado e poderá receber novas matrículas.`}
      confirmLabel="Reativar"
      onConfirm={async () => {
        try {
          await adminCoursesApi.activate(course.id);
          router.refresh();
        } catch (err) {
          handleApiError(err, 'Erro ao reativar curso.');
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

export function DeleteCourseButton({ course }: { course: Course }) {
  const router = useRouter();
  
  // Não permite excluir se tem alunos
  if (course.students_count > 0) {
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
            <p>Curso possui {course.students_count} aluno(s). Desative em vez de excluir.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <ConfirmDialog
      title="Remover curso?"
      description={`Isto removerá permanentemente o curso "${course.name}" e todas as disciplinas vinculadas. Esta ação não pode ser desfeita.`}
      confirmLabel="Remover"
      onConfirm={async () => {
        await adminCoursesApi.remove(course.id);
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
