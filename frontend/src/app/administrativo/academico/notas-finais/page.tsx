import { Award, Activity, Lightbulb, CheckCircle, XCircle, Clock, Plus, TrendingUp } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { FiltersBar } from '@/components/shared/filters-bar';
import { FiltersForm } from '@/components/shared/filters-form';
import { FiltersSelect } from '@/components/shared/filters-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getPagination } from '@/lib/pagination';
import { formatDateTimeBR } from '@/lib/formatters/date';
import { adminFinalGradesServer } from '@/features/admin/academics/final-grades/api.server';
import { adminSectionsServer } from '@/features/admin/academics/sections/api.server';
import { adminTermsServer } from '@/features/admin/academics/terms/api.server';
import { adminSubjectsServer } from '@/features/admin/academics/subjects/api.server';
import { CreateFinalGradeSheet, DeleteFinalGradeButton, EditFinalGradeSheet } from '@/features/admin/academics/final-grades/final-grade-form-sheets';
import { formatFinalGradeStatus, type FinalGradeStatus } from '@/features/admin/academics/i18n';

const statusVariant: Record<string, 'success' | 'destructive' | 'secondary' | 'outline'> = {
  APPROVED: 'success',
  FAILED: 'destructive',
  IN_PROGRESS: 'secondary',
};

const statusIcon: Record<string, any> = {
  APPROVED: CheckCircle,
  FAILED: XCircle,
  IN_PROGRESS: Clock,
};

export default async function AdminFinalGradesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { page, pageSize, limit, offset } = getPagination(searchParams);
  const statusFilter = typeof searchParams.status === 'string' ? searchParams.status : '';
  const sectionFilter = typeof searchParams.section_id === 'string' ? searchParams.section_id : '';

  let data: any = { items: [], total: 0 };
  let sections: any = { items: [], total: 0 };
  let terms: any = { items: [], total: 0 };
  let subjects: any = { items: [], total: 0 };
  let error: string | null = null;

  try {
    const results = await Promise.all([
      adminFinalGradesServer.list({
        limit,
        offset,
        ...(statusFilter && { status: statusFilter }),
        ...(sectionFilter && { section_id: sectionFilter }),
      }),
      adminSectionsServer.list({ limit: 500, offset: 0 }),
      adminTermsServer.list({ limit: 500, offset: 0 }),
      adminSubjectsServer.list({ limit: 500, offset: 0 }),
    ]);
    data = results[0];
    sections = results[1];
    terms = results[2];
    subjects = results[3];
  } catch (err: any) {
    console.error('Falha ao carregar notas finais:', err);
    error = err.message || 'Erro ao carregar dados.';
  }

  const termMap = new Map<string, string>(terms.items.map((t: any) => [t.id, t.code]));
  const subjectMap = new Map<string, { code: string; name: string }>(subjects.items.map((s: any) => [s.id, { code: s.code, name: s.name }]));

  const sectionLabel = (code: string, termId: string, subjectId: string) => {
    const subject = subjectMap.get(subjectId);
    return `${termMap.get(termId) || '?'} • ${subject?.code || '?'} • ${code}`;
  };

  const sectionOptions = sections.items.map((s: any) => ({
    id: s.id,
    label: sectionLabel(s.code, s.term_id, s.subject_id),
    description: s.room_default ? `Sala ${s.room_default}` : undefined,
  }));

  const sectionFilterOptions = [
    { value: '', label: 'Todas turmas' },
    ...sections.items.map((s: any) => ({
      value: s.id,
      label: sectionLabel(s.code, s.term_id, s.subject_id),
    })),
  ];

  const sectionMap = new Map(sections.items.map((s: any) => [s.id, sectionLabel(s.code, s.term_id, s.subject_id)]));

  const statusFilterOptions = [
    { value: '', label: 'Todas situações' },
    { value: 'IN_PROGRESS', label: 'Em andamento' },
    { value: 'APPROVED', label: 'Aprovados' },
    { value: 'FAILED', label: 'Reprovados' },
  ];

  // Stats
  const approved = data.items.filter((g: any) => g.status === 'APPROVED').length;
  const failed = data.items.filter((g: any) => g.status === 'FAILED').length;
  const inProgress = data.items.filter((g: any) => g.status === 'IN_PROGRESS').length;

  return (
    <div className="space-y-6">
      {/* Header com gradiente */}
      <div className="relative rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 p-6 text-white overflow-hidden">
        <div className="absolute -right-8 -top-8 opacity-10">
          <Award className="h-48 w-48" strokeWidth={0.5} />
        </div>
        <div className="relative space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Notas Finais</h1>
            </div>
            <p className="text-emerald-100">
              Resultados consolidados por aluno e turma — aprovações, reprovações e em andamento.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              {data.total} registros
            </Badge>
            <Badge variant="secondary" className="bg-green-400/30 text-white hover:bg-green-400/40 gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              {approved} aprovados
            </Badge>
            <Badge variant="secondary" className="bg-red-400/30 text-white hover:bg-red-400/40 gap-1.5">
              <XCircle className="h-3.5 w-3.5" />
              {failed} reprovados
            </Badge>
            <Badge variant="secondary" className="bg-yellow-400/30 text-white hover:bg-yellow-400/40 gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {inProgress} em andamento
            </Badge>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 gap-1.5 h-7 px-2">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Dicas
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dicas — Notas Finais</DialogTitle>
                  <DialogDescription>
                    Informações sobre o cálculo de notas finais.
                  </DialogDescription>
                </DialogHeader>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Nota final = média ponderada das avaliações</li>
                  <li>• Aprovação geralmente requer nota ≥ 6.0 e ≤ 25% faltas</li>
                  <li>• &quot;Em andamento&quot; = turma ainda não fechada</li>
                  <li>• Faltas (%) é calculada sobre total de aulas</li>
                  <li>• Notas podem ser lançadas manualmente ou calculadas</li>
                </ul>
              </DialogContent>
            </Dialog>
            <CreateFinalGradeSheet
              sections={sectionOptions}
              trigger={
                <Button size="sm" className="bg-white text-emerald-600 hover:bg-emerald-50 gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Nova Nota Final
                </Button>
              }
            />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <FiltersForm>
        <FiltersSelect
          name="section_id"
          allLabel="Todas turmas"
          options={sectionFilterOptions}
        />
        <FiltersSelect
          name="status"
          allLabel="Todas situações"
          options={statusFilterOptions}
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
                  <TableHead>Turma</TableHead>
                  <TableHead>Aluno</TableHead>
                  <TableHead className="text-center">Situação</TableHead>
                  <TableHead className="text-center">Nota</TableHead>
                  <TableHead className="text-center">Faltas</TableHead>
                  <TableHead>Calculado em</TableHead>
                  <TableHead className="text-right w-[160px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center">
                      <Award className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">Nenhuma nota final cadastrada.</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {sectionFilter || statusFilter ? 'Altere os filtros ou crie uma nova nota.' : 'Clique em "Nova Nota Final" para começar.'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((g: any) => {
                    const StatusIcon = statusIcon[g.status] || Clock;
                    return (
                      <TableRow key={g.id} className="group hover:bg-muted/30">
                        <TableCell className="max-w-[280px]">
                          <span className="truncate text-sm font-medium" title={sectionMap.get(g.section_id) || g.section_id}>
                            {sectionMap.get(g.section_id) || g.section_id}
                          </span>
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
                          <Badge variant={statusVariant[g.status] || 'secondary'} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {formatFinalGradeStatus(g.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-mono font-semibold ${
                            g.final_score === null ? 'text-muted-foreground' :
                            Number(g.final_score) >= 6 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {g.final_score === null ? '—' : Number(g.final_score).toFixed(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-sm">{g.absences_count}</span>
                            <span className={`text-xs ${Number(g.absences_pct) > 25 ? 'text-red-500' : 'text-muted-foreground'}`}>
                              ({Number(g.absences_pct).toFixed(0)}%)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTimeBR(g.calculated_at)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <EditFinalGradeSheet grade={g} />
                            <DeleteFinalGradeButton 
                              gradeId={g.id} 
                              label={`${sectionMap.get(g.section_id) || 'Turma'} — ${g.student_name || 'Aluno'}`} 
                            />
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
