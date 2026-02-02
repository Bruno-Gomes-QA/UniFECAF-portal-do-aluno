'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  AlertTriangle, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Users, 
  XCircle, 
  TrendingUp,
  Award,
  Lightbulb,
  Sparkles,
  Target,
  CalendarDays,
} from 'lucide-react';

import type { MeGradesResponse, MeAttendanceResponse, MeGradeDetailInfo, MeAttendanceSubjectInfo, MeTermOption } from '@/types/portal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type GradesPageClientProps = {
  grades: MeGradesResponse;
  attendance: MeAttendanceResponse;
  terms: MeTermOption[];
  selectedTermId?: string;
};

function TipsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="size-10 shrink-0 rounded-full border-secondary/30 bg-secondary/10 text-secondary shadow-[0_0_12px_rgba(37,185,121,0.25)] hover:bg-secondary/20 hover:text-secondary"
        >
          <Lightbulb className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-secondary" />
            Como funcionam as notas
          </DialogTitle>
          <DialogDescription>
            Entenda o sistema de avaliação da instituição
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-4">
            <h4 className="font-medium text-secondary">📊 Média de Aprovação</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              A nota mínima para aprovação direta é <strong>6,0</strong>. Notas entre 4,0 e 5,9 vão para exame final.
            </p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <h4 className="font-medium text-primary">📚 Frequência Mínima</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              É necessário ter no mínimo <strong>75% de presença</strong> para aprovação, independente da nota.
            </p>
          </div>
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-4">
            <h4 className="font-medium text-warning">⚠️ Status Em Risco</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Disciplinas com nota atual abaixo de 5,0 ou frequência abaixo de 80% aparecem como &quot;em risco&quot;.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getGradeColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground';
  const val = Number(score);
  if (val >= 7) return 'text-secondary';
  if (val >= 5) return 'text-warning';
  return 'text-destructive';
}

function getStatusBadge(status: string, needsExam: boolean) {
  if (status === 'APPROVED') {
    return (
      <Badge variant="outline" className="border-secondary/30 bg-secondary/10 text-secondary gap-1">
        <CheckCircle2 className="size-3" />
        Aprovado
      </Badge>
    );
  }
  if (status === 'FAILED') {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="size-3" />
        Reprovado
      </Badge>
    );
  }
  if (needsExam) {
    return (
      <Badge variant="warning" className="gap-1">
        <AlertTriangle className="size-3" />
        Em Exame
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <Clock className="size-3" />
      Em Andamento
    </Badge>
  );
}

function GradeCard({ grade }: { grade: MeGradeDetailInfo }) {
  return (
    <AccordionItem value={grade.section_id} className="border rounded-xl px-4 bg-card shadow-sm">
      <AccordionTrigger className="hover:no-underline py-4">
        <div className="flex items-center justify-between w-full pr-4">
          <div className="text-left">
            <p className="font-semibold">{grade.subject_name}</p>
            <p className="text-sm text-muted-foreground">{grade.subject_code}</p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(grade.status, grade.needs_exam)}
            <div className={cn(
              'flex size-12 items-center justify-center rounded-xl font-bold text-lg',
              grade.final_score !== null && Number(grade.final_score) >= 6 
                ? 'bg-secondary/10 text-secondary' 
                : grade.final_score !== null && Number(grade.final_score) < 5 
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-muted text-muted-foreground'
            )}>
              {grade.final_score !== null ? Number(grade.final_score).toFixed(1) : '-'}
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        {grade.components.length > 0 ? (
          <div className="rounded-lg border bg-muted/30 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Avaliação</TableHead>
                  <TableHead className="text-center">Peso</TableHead>
                  <TableHead className="text-right pr-4">Nota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grade.components.map((comp) => (
                  <TableRow key={comp.id} className="group">
                    <TableCell className="pl-4">
                      <div>
                        <p className="font-medium group-hover:text-primary transition-colors">{comp.label}</p>
                        {comp.graded_at && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(comp.graded_at).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono">
                        {(Number(comp.weight) * 100).toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <span className={cn('font-bold', getGradeColor(comp.score))}>
                        {comp.score !== null ? Number(comp.score).toFixed(1) : '-'}
                      </span>
                      <span className="text-muted-foreground">
                        {' '}/ {Number(comp.max_score).toFixed(0)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed">
            <Clock className="size-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma avaliação lançada ainda.
            </p>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

function AttendanceCard({ subject }: { subject: MeAttendanceSubjectInfo }) {
  const attendancePct = subject.total_sessions > 0
    ? ((subject.attended_sessions / subject.total_sessions) * 100)
    : 0;

  return (
    <Card className={cn(
      'overflow-hidden transition-all',
      subject.has_alert ? 'border-warning/50 shadow-[0_0_12px_rgba(234,179,8,0.15)]' : ''
    )}>
      <CardHeader className={cn(
        'pb-3 border-b',
        subject.has_alert ? 'bg-gradient-to-r from-warning/10 to-transparent' : 'bg-gradient-to-r from-secondary/5 to-transparent'
      )}>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{subject.subject_name}</CardTitle>
            <CardDescription>{subject.subject_code}</CardDescription>
          </div>
          {subject.has_alert ? (
            <Badge variant="warning" className="flex items-center gap-1 shadow-sm">
              <AlertTriangle className="size-3" />
              Risco
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1 border-secondary/30 bg-secondary/10 text-secondary">
              <CheckCircle2 className="size-3" />
              OK
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Frequência</span>
            <span className={cn(
              'font-bold text-lg',
              attendancePct >= 75 ? 'text-secondary' : attendancePct >= 60 ? 'text-warning' : 'text-destructive'
            )}>
              {attendancePct.toFixed(0)}%
            </span>
          </div>
          <div className="relative">
            <Progress
              value={attendancePct}
              className={cn(
                'h-3 rounded-full',
                subject.has_alert ? '[&>div]:bg-warning' : '[&>div]:bg-secondary'
              )}
            />
            <div 
              className="absolute top-0 h-3 w-0.5 bg-foreground/50" 
              style={{ left: '75%' }}
              title="Mínimo: 75%"
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">Mínimo: 75%</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-secondary/10 p-3 text-center">
            <p className="text-2xl font-bold text-secondary">{subject.attended_sessions}</p>
            <p className="text-xs text-muted-foreground">Presenças</p>
          </div>
          <div className="rounded-lg bg-destructive/10 p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{subject.absences_count}</p>
            <p className="text-xs text-muted-foreground">Faltas</p>
          </div>
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="text-2xl font-bold">{subject.total_sessions}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>

        {subject.sessions.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              Histórico de Aulas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {subject.sessions.slice(0, 10).map((session) => (
                <div
                  key={session.session_id}
                  className={cn(
                    'size-8 rounded-lg flex items-center justify-center transition-transform hover:scale-110',
                    session.status === 'PRESENT' && 'bg-secondary/20 text-secondary',
                    session.status === 'ABSENT' && 'bg-destructive/20 text-destructive',
                    session.status === 'JUSTIFIED' && 'bg-primary/20 text-primary',
                    session.status === 'LATE' && 'bg-warning/20 text-warning'
                  )}
                  title={`${new Date(session.session_date + 'T00:00:00').toLocaleDateString('pt-BR')} - ${
                    session.status === 'PRESENT' ? 'Presente' :
                    session.status === 'ABSENT' ? 'Ausente' :
                    session.status === 'JUSTIFIED' ? 'Justificado' : 'Atrasado'
                  }`}
                >
                  {session.status === 'PRESENT' && <CheckCircle2 className="size-4" />}
                  {session.status === 'ABSENT' && <XCircle className="size-4" />}
                  {session.status === 'JUSTIFIED' && <Clock className="size-4" />}
                  {session.status === 'LATE' && <Clock className="size-4" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GradesTab({ grades }: { grades: MeGradesResponse }) {
  if (grades.grades.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <BookOpen className="size-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium">Nenhuma nota disponível</p>
          <p className="text-sm text-muted-foreground mt-1">As notas aparecerão aqui quando lançadas.</p>
        </CardContent>
      </Card>
    );
  }

  const approved = grades.grades.filter((g) => g.status === 'APPROVED').length;
  const atRisk = grades.grades.filter((g) => g.needs_exam || g.status === 'FAILED').length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="overflow-hidden border-l-4 border-l-secondary">
          <CardHeader className="pb-2 bg-gradient-to-r from-secondary/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-secondary/10 shadow-[0_0_12px_rgba(37,185,121,0.2)]">
                <TrendingUp className="size-5 text-secondary" />
              </div>
              <div>
                <CardDescription>Média Geral</CardDescription>
                <CardTitle className={cn('text-2xl', getGradeColor(grades.average))}>
                  {grades.average !== null ? Number(grades.average).toFixed(1) : '-'}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
        </Card>
        <Card className="overflow-hidden border-l-4 border-l-primary">
          <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="size-5 text-primary" />
              </div>
              <div>
                <CardDescription>Disciplinas</CardDescription>
                <CardTitle className="text-2xl">{grades.grades.length}</CardTitle>
              </div>
            </div>
          </CardHeader>
        </Card>
        <Card className={cn(
          'overflow-hidden border-l-4',
          atRisk > 0 ? 'border-l-destructive' : 'border-l-secondary'
        )}>
          <CardHeader className={cn(
            'pb-2 bg-gradient-to-r to-transparent',
            atRisk > 0 ? 'from-destructive/5' : 'from-secondary/5'
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex size-10 items-center justify-center rounded-lg',
                atRisk > 0 ? 'bg-destructive/10' : 'bg-secondary/10'
              )}>
                <Target className={cn('size-5', atRisk > 0 ? 'text-destructive' : 'text-secondary')} />
              </div>
              <div>
                <CardDescription>Em Risco</CardDescription>
                <CardTitle className={cn('text-2xl', atRisk > 0 ? 'text-destructive' : 'text-secondary')}>
                  {atRisk}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Accordion type="multiple" className="space-y-3">
        {grades.grades.map((grade) => (
          <GradeCard key={grade.section_id} grade={grade} />
        ))}
      </Accordion>
    </div>
  );
}

function AttendanceTab({ attendance }: { attendance: MeAttendanceResponse }) {
  if (attendance.subjects.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <Users className="size-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium">Nenhum registro de frequência</p>
          <p className="text-sm text-muted-foreground mt-1">Os registros aparecerão aqui.</p>
        </CardContent>
      </Card>
    );
  }

  const withAlert = attendance.subjects.filter((s) => s.has_alert).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="overflow-hidden border-l-4 border-l-secondary">
          <CardHeader className="pb-2 bg-gradient-to-r from-secondary/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-secondary/10 shadow-[0_0_12px_rgba(37,185,121,0.2)]">
                <Award className="size-5 text-secondary" />
              </div>
              <div>
                <CardDescription>Frequência Geral</CardDescription>
                <CardTitle className={cn(
                  'text-2xl',
                  attendance.overall_attendance_pct !== null && Number(attendance.overall_attendance_pct) >= 75 
                    ? 'text-secondary' 
                    : 'text-warning'
                )}>
                  {attendance.overall_attendance_pct !== null
                    ? `${Number(attendance.overall_attendance_pct).toFixed(0)}%`
                    : '-'}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
        </Card>
        <Card className={cn(
          'overflow-hidden border-l-4',
          withAlert > 0 ? 'border-l-warning' : 'border-l-secondary'
        )}>
          <CardHeader className={cn(
            'pb-2 bg-gradient-to-r to-transparent',
            withAlert > 0 ? 'from-warning/5' : 'from-secondary/5'
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex size-10 items-center justify-center rounded-lg',
                withAlert > 0 ? 'bg-warning/10' : 'bg-secondary/10'
              )}>
                <AlertTriangle className={cn('size-5', withAlert > 0 ? 'text-warning' : 'text-secondary')} />
              </div>
              <div>
                <CardDescription>Em Alerta</CardDescription>
                <CardTitle className={cn('text-2xl', withAlert > 0 ? 'text-warning' : 'text-secondary')}>
                  {withAlert}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {attendance.subjects.map((subject) => (
          <AttendanceCard key={subject.section_id} subject={subject} />
        ))}
      </div>
    </div>
  );
}

export function GradesPageClient({ grades, attendance, terms, selectedTermId }: GradesPageClientProps) {
  const [activeTab, setActiveTab] = useState<'grades' | 'attendance'>('grades');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Find the current term or the selected one
  const currentTerm = terms.find(t => t.is_current);
  const effectiveTermId = selectedTermId || currentTerm?.id;
  const selectedTerm = terms.find(t => t.id === effectiveTermId);
  const isCurrentTermSelected = !selectedTermId || selectedTerm?.is_current;

  const handleTermChange = (termId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (termId === currentTerm?.id) {
      params.delete('term_id');
    } else {
      params.set('term_id', termId);
    }
    router.push(`/notas?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-primary/5 p-6 shadow-sm">
        <BookOpen className="pointer-events-none absolute -right-8 -top-8 size-48 rotate-12 text-primary opacity-5" />
        
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-secondary" />
              <span className="text-sm font-medium text-secondary">Desempenho Acadêmico</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Notas e Frequência</h1>
            <p className="text-sm text-muted-foreground">
              {grades.grades.length} disciplina{grades.grades.length !== 1 ? 's' : ''} no período selecionado
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Term Selector */}
            <Select value={effectiveTermId || ''} onValueChange={handleTermChange}>
              <SelectTrigger className="w-[160px] h-10 bg-background/50 backdrop-blur-sm">
                <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Selecionar termo" />
              </SelectTrigger>
              <SelectContent>
                {terms.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    <span className="flex items-center gap-2">
                      {term.code}
                      {term.is_current && (
                        <Badge variant="outline" className="h-5 text-[10px] border-secondary/30 bg-secondary/10 text-secondary">
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {grades.average !== null && (
              <Badge 
                variant="outline" 
                className={cn(
                  'h-10 gap-2 px-4 font-semibold shadow-sm backdrop-blur-sm',
                  Number(grades.average) >= 6 
                    ? 'border-secondary/30 bg-secondary/10 text-secondary' 
                    : 'border-warning/30 bg-warning/10 text-warning'
                )}
              >
                <TrendingUp className="size-4" />
                Média: {Number(grades.average).toFixed(1)}
              </Badge>
            )}
            <TipsDialog />
          </div>
        </div>

        {/* Historical notice */}
        {!isCurrentTermSelected && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            <span>Exibindo dados históricos do semestre <strong>{grades.term_code}</strong></span>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'grades' | 'attendance')}>
        <TabsList className="grid w-full max-w-sm grid-cols-2 h-12">
          <TabsTrigger value="grades" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BookOpen className="size-4" />
            Notas
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="size-4" />
            Frequência
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grades" className="mt-6">
          <GradesTab grades={grades} />
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <AttendanceTab attendance={attendance} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
