import Link from 'next/link';
import { FiltersBar } from '@/components/shared/filters-bar';
import { FiltersForm } from '@/components/shared/filters-form';
import { FiltersSelect } from '@/components/shared/filters-select';
import { Pagination } from '@/components/shared/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getPagination } from '@/lib/pagination';
import { adminAttendanceServer } from '@/features/admin/academics/attendance/api.server';
import { adminSectionsServer } from '@/features/admin/academics/sections/api.server';
import { adminSessionsServer } from '@/features/admin/academics/sessions/api.server';
import { adminTermsServer } from '@/features/admin/academics/terms/api.server';
import { adminSubjectsServer } from '@/features/admin/academics/subjects/api.server';
import { attendanceStatusOptions } from '@/features/admin/academics/i18n';
import { CreateAttendanceSheet, EditAttendanceSheet, DeleteAttendanceButton } from '@/features/admin/academics/attendance/attendance-form-sheets';
import { SelectorsClient } from './selectors-client';
import { formatDateBR, formatTimeBR, formatDateTimeBR } from '@/lib/formatters/date';
import {
  ClipboardCheck,
  Activity,
  Lightbulb,
  Plus,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users2,
  Clock,
  Cog,
  Search,
} from 'lucide-react';

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sectionId = Array.isArray(searchParams.section_id) ? searchParams.section_id[0] : searchParams.section_id;
  const sessionId = Array.isArray(searchParams.session_id) ? searchParams.session_id[0] : searchParams.session_id;
  const statusFilter = Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status;
  const { page, pageSize, limit, offset } = getPagination(searchParams);

  // Load sections, terms, subjects for selector
  let sections: any = { items: [], total: 0 };
  let terms: any = { items: [], total: 0 };
  let subjects: any = { items: [], total: 0 };
  let sessions: any = { items: [], total: 0 };
  let attendance: any = { items: [], total: 0 };
  let error: string | null = null;
  
  try {
    const results = await Promise.all([
      adminSectionsServer.list({ limit: 500, offset: 0 }),
      adminTermsServer.list({ limit: 500, offset: 0 }),
      adminSubjectsServer.list({ limit: 500, offset: 0 }),
    ]);
    sections = results[0];
    terms = results[1];
    subjects = results[2];
  } catch (err: any) {
    console.error('Erro ao carregar dados:', err);
    error = err.message || 'Erro ao carregar dados.';
  }

  const termMap = new Map<string, { id: string; code: string }>(terms.items.map((t: any) => [t.id, t]));
  const subjectMap = new Map<string, { id: string; name: string }>(subjects.items.map((s: any) => [s.id, s]));
  
  // Prepare section options
  const sectionOptions = sections.items.map((s: any) => {
    const term = termMap.get(s.term_id);
    const subject = subjectMap.get(s.subject_id);
    return {
      value: s.id,
      label: `${term?.code || '?'} • ${subject?.name || '?'} • ${s.code}`,
      termCode: term?.code,
      subjectName: subject?.name,
    };
  });

  // Find current section
  const currentSection = sectionId ? sections.items.find((s: any) => s.id === sectionId) : null;
  const currentTerm = currentSection ? termMap.get(currentSection.term_id) : null;
  const currentSubject = currentSection ? subjectMap.get(currentSection.subject_id) : null;

  // If section selected, load ALL sessions for that section
  if (sectionId) {
    try {
      sessions = await adminSessionsServer.listBySection(sectionId, { limit: 1000, offset: 0 });
    } catch (err) {
      console.error('Erro ao carregar aulas:', err);
    }
  }

  // If session selected, load attendance for that session
  if (sessionId) {
    try {
      attendance = await adminAttendanceServer.list({ limit, offset, session_id: sessionId });
    } catch (err: any) {
      console.error('Erro ao carregar presenças:', err);
      error = err.message || 'Erro ao carregar presenças.';
    }
  }

  // Session options (TODAS as aulas, ordenadas por data decrescente)
  const sessionOptions = sessions.items
    .sort((a: any, b: any) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())
    .map((s: any) => ({
      value: s.id,
      label: `${formatDateBR(s.session_date)} ${formatTimeBR(s.start_time)}${s.is_canceled ? ' (Cancelada)' : ''}`,
      date: s.session_date,
      isCanceled: s.is_canceled,
    }));

  // Find current session
  const currentSession = sessionId ? sessions.items.find((s: any) => s.id === sessionId) : null;

  // Filter attendance by status if provided
  let filteredItems = attendance.items;
  if (statusFilter) {
    filteredItems = filteredItems.filter((a: any) => a.status === statusFilter);
  }

  // Stats
  const present = filteredItems.filter((a: any) => a.status === 'PRESENT').length;
  const absent = filteredItems.filter((a: any) => a.status === 'ABSENT').length;
  const excused = filteredItems.filter((a: any) => a.status === 'EXCUSED').length;

  const statusSelectOptions = attendanceStatusOptions.map(o => ({ value: o.value, label: o.label }));

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'success';
      case 'ABSENT': return 'destructive';
      case 'EXCUSED': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT': return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'ABSENT': return <XCircle className="h-3 w-3 mr-1" />;
      case 'EXCUSED': return <AlertCircle className="h-3 w-3 mr-1" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border bg-gradient-to-br from-card to-secondary/5 p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <ClipboardCheck className="h-32 w-32 text-secondary" />
        </div>
        
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Presenças</h1>
          <p className="text-muted-foreground">
            {sectionId && sessionId ? (
              <>
                {currentTerm?.code && <Badge variant="outline" className="mr-2">{currentTerm.code}</Badge>}
                {currentSubject?.name || 'Disciplina'} — Turma {currentSection?.code || '?'}
                {currentSession && (
                  <Badge variant="secondary" className="ml-2">
                    {formatDateBR(currentSession.session_date)} {formatTimeBR(currentSession.start_time)}
                  </Badge>
                )}
              </>
            ) : (
              'Gerenciar chamadas e registros de frequência'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          {sessionId && (
            <Badge variant="secondary" className="h-10 px-4 gap-2 border-primary/20 shadow-sm font-semibold bg-background/80 backdrop-blur-md text-primary ring-1 ring-primary/10">
              <Activity className="h-4 w-4 text-secondary animate-pulse" />
              {filteredItems.length} registros
            </Badge>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-secondary border-none shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 group active:scale-95"
              >
                <Lightbulb className="h-5 w-5 fill-secondary/10 group-hover:fill-secondary/20 transition-all" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-primary font-bold">
                  <Lightbulb className="h-6 w-6 text-secondary fill-secondary/10" />
                  Dica Rápida
                </DialogTitle>
                <DialogDescription>
                  Informações sobre o registro de presenças.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 text-sm text-muted-foreground/90 border-t border-border/50">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <p>
                    <span className="font-bold text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">Presente</span> é o status para alunos que compareceram.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <XCircle className="h-3.5 w-3.5 text-red-600" />
                  </div>
                  <p>
                    <span className="font-bold text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">Ausente</span> é para alunos que faltaram sem justificativa.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                    <AlertCircle className="h-3.5 w-3.5 text-orange-600" />
                  </div>
                  <p>
                    <span className="font-bold text-orange-600 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">Justificado</span> conta como presença (atestado).
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {sessionId && (
            <CreateAttendanceSheet 
              sessionId={sessionId}
              trigger={
                <Button 
                  size="icon" 
                  className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-secondary border-none shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 active:scale-95 group"
                >
                  <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* Selectors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seleção de Turma e Aula</CardTitle>
          <CardDescription>Escolha a turma e a aula para gerenciar as presenças</CardDescription>
        </CardHeader>
        <CardContent>
          <SelectorsClient
            sectionId={sectionId}
            sessionId={sessionId}
            sectionOptions={sectionOptions}
            sessionOptions={sessionOptions}
            currentSection={currentSection}
            currentTerm={currentTerm}
            currentSubject={currentSubject}
            currentSession={currentSession}
          />
        </CardContent>
      </Card>

      {/* Show table only if session is selected */}
      {sessionId && (
        <>
          {/* Filters */}
          <FiltersBar>
            <TooltipProvider>
              <FiltersForm>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">Status</Label>
                  </div>
                  <FiltersSelect name="status" defaultValue={statusFilter} allLabel="Todos" options={statusSelectOptions} />
                </div>

                <input type="hidden" name="section_id" value={sectionId} />
                <input type="hidden" name="session_id" value={sessionId} />

                <Button type="submit" className="sm:ml-auto h-9 gap-2 shadow-sm">
                  <Filter className="h-3.5 w-3.5" />
                  Filtrar
                </Button>
                <Button asChild variant="ghost" className="h-9">
                  <Link href={`/administrativo/academico/presencas?section_id=${sectionId}&session_id=${sessionId}`}>Limpar</Link>
                </Button>
              </FiltersForm>
            </TooltipProvider>
          </FiltersBar>

          {/* Stats */}
          {filteredItems.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="text-green-600 border-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                {present} presentes
              </Badge>
              <Badge variant="outline" className="text-red-600 border-red-300">
                <XCircle className="h-3 w-3 mr-1" />
                {absent} ausentes
              </Badge>
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                <AlertCircle className="h-3 w-3 mr-1" />
                {excused} justificados
              </Badge>
            </div>
          )}

          {/* Table */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            {error ? (
              <div className="p-8 text-center text-muted-foreground bg-destructive/5 flex flex-col items-center gap-2">
                <ClipboardCheck className="h-8 w-8 text-destructive/50 mb-2" />
                <p className="font-medium text-destructive">{error}</p>
                <p className="text-sm">Tente recarregar a página.</p>
              </div>
            ) : (
              <div className="relative">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-b border-border/60">
                      <TableHead className="w-[40%] pl-6">
                        <div className="flex items-center gap-2">
                          <Users2 className="h-3.5 w-3.5 text-muted-foreground" />
                          Aluno
                        </div>
                      </TableHead>
                      <TableHead className="w-[20%]">Status</TableHead>
                      <TableHead className="w-[25%]">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          Registrado em
                        </div>
                      </TableHead>
                      <TableHead className="text-right pr-6">
                        <Cog className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Search className="h-8 w-8 opacity-20" />
                            <p>Nenhuma presença registrada para esta aula.</p>
                            <p className="text-xs">Use o botão + para adicionar registros.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItems.map((a: any) => (
                        <TableRow key={a.id} className="group transition-colors hover:bg-muted/30">
                          <TableCell className="pl-6 py-3">
                            <div className="flex flex-col">
                              <span className="font-medium">{a.student_name}</span>
                              <span className="text-xs text-muted-foreground font-mono">RA: {a.student_ra}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(a.status) as any} className="text-xs">
                              {getStatusIcon(a.status)}
                              {attendanceStatusOptions.find(o => o.value === a.status)?.label || a.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {a.recorded_at ? formatDateTimeBR(a.recorded_at) : '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <EditAttendanceSheet record={a} />
                              <DeleteAttendanceButton attendanceId={a.id} />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="border-t p-4 bg-muted/5">
              <Pagination page={page} pageSize={pageSize} total={attendance.total || 0} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
