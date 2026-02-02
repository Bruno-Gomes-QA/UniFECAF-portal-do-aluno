import { FileSpreadsheet, Activity, Lightbulb, Star, BarChart3 } from 'lucide-react';

import { Pagination } from '@/components/shared/pagination';
import { FiltersForm } from '@/components/shared/filters-form';
import { FiltersSelect } from '@/components/shared/filters-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getPagination } from '@/lib/pagination';
import { formatDateBR } from '@/lib/formatters/date';
import { formatAssessmentKind } from '@/features/admin/academics/i18n';
import { adminAssessmentGradesServer } from '@/features/admin/academics/assessment-grades/api.server';
import { adminAssessmentsServer } from '@/features/admin/academics/assessments/api.server';
import { adminSectionsServer } from '@/features/admin/academics/sections/api.server';
import { adminTermsServer } from '@/features/admin/academics/terms/api.server';
import { adminSubjectsServer } from '@/features/admin/academics/subjects/api.server';
import { CreateAssessmentGradeSheet, DeleteAssessmentGradeButton, EditAssessmentGradeSheet } from '@/features/admin/academics/assessment-grades/assessment-grade-form-sheets';

export default async function AdminAssessmentGradesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { page, pageSize, limit, offset } = getPagination(searchParams);
  const assessmentFilter = typeof searchParams.assessment_id === 'string' ? searchParams.assessment_id : '';

  let data: any = { items: [], total: 0 };
  let assessments: any = { items: [], total: 0 };
  let sections: any = { items: [], total: 0 };
  let terms: any = { items: [], total: 0 };
  let subjects: any = { items: [], total: 0 };
  let error: string | null = null;

  try {
    const results = await Promise.all([
      adminAssessmentGradesServer.list({
        limit,
        offset,
        ...(assessmentFilter && { assessment_id: assessmentFilter }),
      }),
      adminAssessmentsServer.list({ limit: 500, offset: 0 }),
      adminSectionsServer.list({ limit: 500, offset: 0 }),
      adminTermsServer.list({ limit: 500, offset: 0 }),
      adminSubjectsServer.list({ limit: 500, offset: 0 }),
    ]);
    data = results[0];
    assessments = results[1];
    sections = results[2];
    terms = results[3];
    subjects = results[4];
  } catch (err: any) {
    console.error('Falha ao carregar notas:', err);
    error = err.message || 'Erro ao carregar dados.';
  }

  const termMap = new Map<string, string>(terms.items.map((t: any) => [t.id, t.code]));
  const subjectMap = new Map<string, { code: string; name: string }>(subjects.items.map((s: any) => [s.id, { code: s.code, name: s.name }]));

  const sectionLabel = (code: string, termId: string, subjectId: string) => {
    const subject = subjectMap.get(subjectId);
    return `${termMap.get(termId) || '?'} • ${subject?.code || '?'} • ${code}`;
  };

  const sectionMap = new Map<string, string>(sections.items.map((s: any) => [s.id, sectionLabel(s.code, s.term_id, s.subject_id)]));

  const assessmentLabel = (name: string, sectionId: string) =>
    `${name} — ${sectionMap.get(sectionId) || sectionId}`;

  const assessmentMap = new Map<string, { label: string; name: string; kind: string; max_score: number }>(assessments.items.map((a: any) => [a.id, { 
    label: assessmentLabel(a.name, a.section_id), 
    name: a.name,
    kind: a.kind,
    max_score: a.max_score 
  }]));

  const assessmentOptions = assessments.items.map((a: any) => ({
    id: a.id,
    label: assessmentLabel(a.name, a.section_id),
    description: a.due_date ? `Data: ${formatDateBR(a.due_date)}` : undefined,
  }));

  const assessmentFilterOptions = [
    { value: '', label: 'Todas avaliações' },
    ...assessments.items.map((a: any) => ({
      value: a.id,
      label: assessmentLabel(a.name, a.section_id),
    })),
  ];

  // Stats
  const avgScore = data.items.length > 0 
    ? (data.items.reduce((sum: number, g: any) => sum + Number(g.score), 0) / data.items.length).toFixed(1)
    : '—';

  return (
    <div className="space-y-6">
      {/* Header com gradiente */}
      <div className="relative rounded-xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 p-6 text-white overflow-hidden">
        <div className="absolute -right-8 -top-8 opacity-10">
          <FileSpreadsheet className="h-48 w-48" strokeWidth={0.5} />
        </div>
        <div className="relative space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Notas de Avaliações</h1>
            </div>
            <p className="text-orange-100">
              Lançamento de notas individuais por avaliação e aluno.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              {data.total} notas lançadas
            </Badge>
            {data.items.length > 0 && (
              <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                Média: {avgScore}
              </Badge>
            )}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 gap-1.5 h-7 px-2">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Dicas
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dicas — Notas de Avaliações</DialogTitle>
                  <DialogDescription>
                    Informações úteis para gerenciar notas.
                  </DialogDescription>
                </DialogHeader>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Filtre por avaliação para ver notas de uma prova específica</li>
                  <li>• Nota máxima é definida na avaliação (normalmente 10)</li>
                  <li>• Notas acima do máximo não são impedidas, mas evite</li>
                  <li>• Cada nota é vinculada a um aluno e uma avaliação</li>
                  <li>• O cálculo da nota final considera pesos de cada avaliação</li>
                </ul>
              </DialogContent>
            </Dialog>
            <CreateAssessmentGradeSheet
              assessments={assessmentOptions}
              trigger={
                <Button size="sm" className="bg-white text-orange-600 hover:bg-orange-50 gap-1.5">
                  <Star className="h-3.5 w-3.5" />
                  Nova Nota
                </Button>
              }
            />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <FiltersForm>
        <FiltersSelect
          name="assessment_id"
          allLabel="Todas as avaliações"
          options={assessmentFilterOptions}
        />
      </FiltersForm>

      {/* Tabela */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {error ? (
          <div className="p-8 text-center bg-destructive/5">
            <p className="font-medium text-destructive">{error}</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Avaliação</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Aluno</TableHead>
                  <TableHead className="text-center">Nota</TableHead>
                  <TableHead className="text-right w-[160px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center">
                      <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">Nenhuma nota cadastrada.</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {assessmentFilter ? 'Altere os filtros ou crie uma nova nota.' : 'Clique em "Nova Nota" para começar.'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((g: any) => {
                    const assessment = assessmentMap.get(g.assessment_id);
                    return (
                      <TableRow key={g.id} className="group hover:bg-muted/30">
                        <TableCell className="max-w-[280px]">
                          <div className="truncate font-medium text-sm" title={assessment?.label || g.assessment_id}>
                            {assessment?.name || g.assessment_id}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {sectionMap.get(assessments.items.find((a: any) => a.id === g.assessment_id)?.section_id) || ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {formatAssessmentKind(assessment?.kind || '')}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          <div className="flex flex-col">
                            <span className="truncate text-sm font-medium">{g.student_name || 'Aluno não encontrado'}</span>
                            {g.student_ra && (
                              <span className="truncate text-xs text-muted-foreground">{g.student_ra}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={Number(g.score) >= ((assessment?.max_score ?? 10) * 0.7) ? 'success' : Number(g.score) >= ((assessment?.max_score ?? 10) * 0.5) ? 'secondary' : 'destructive'}
                            className="font-mono"
                          >
                            {Number(g.score).toFixed(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <EditAssessmentGradeSheet grade={g} />
                            <DeleteAssessmentGradeButton gradeId={g.id} label={`${assessment?.name || 'Nota'} — ${g.student_name || 'Aluno'}`} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <div className="border-t p-4 bg-muted/20">
              <Pagination page={page} pageSize={pageSize} total={data.total} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
