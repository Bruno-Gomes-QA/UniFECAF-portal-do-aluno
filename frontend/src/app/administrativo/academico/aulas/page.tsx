import { FiltersBar } from '@/components/shared/filters-bar';
import { Pagination } from '@/components/shared/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getPagination } from '@/lib/pagination';
import { formatDateBR, formatWeekdayBR } from '@/lib/formatters/date';
import { adminSessionsServer } from '@/features/admin/academics/sessions/api.server';
import { adminSectionsServer } from '@/features/admin/academics/sections/api.server';
import { adminTermsServer } from '@/features/admin/academics/terms/api.server';
import { adminSubjectsServer } from '@/features/admin/academics/subjects/api.server';
import { CreateSessionSheet, DeleteSessionButton, EditSessionSheet } from '@/features/admin/academics/sessions/session-form-sheets';
import { AsyncSectionSelector } from '@/features/admin/academics/sessions/async-section-selector';
import { BookOpenCheck, Activity, Lightbulb, Plus, Cog, Calendar, Clock, DoorOpen, XCircle, CheckCircle, Search, CalendarDays, BookOpen, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sectionId = Array.isArray(searchParams.section_id) ? searchParams.section_id[0] : searchParams.section_id;
  const { page, pageSize, limit, offset } = getPagination(searchParams);

  // Carregar dados de turmas para o seletor
  let sections: any = { items: [], total: 0 };
  let terms: any = { items: [], total: 0 };
  let subjects: any = { items: [], total: 0 };
  
  try {
    const results = await Promise.all([
      adminSectionsServer.list({ limit: 500, offset: 0 }),
      adminTermsServer.list({ limit: 500, offset: 0 }),
      adminSubjectsServer.list({ limit: 500, offset: 0 }),
    ]);
    sections = results[0];
    terms = results[1];
    subjects = results[2];
  } catch (err) {
    console.error('Erro ao carregar turmas:', err);
  }

  const termMap = new Map<string, { id: string; code: string }>(terms.items.map((t: any) => [t.id, t]));
  const subjectMap = new Map<string, { id: string; name: string }>(subjects.items.map((s: any) => [s.id, s]));
  
  // Preparar opções de turmas com labels amigáveis
  const sectionOptions = sections.items.map((s: any) => {
    const term = termMap.get(s.term_id);
    const subject = subjectMap.get(s.subject_id);
    return {
      value: s.id,
      label: `${term?.code || '?'} • ${subject?.name || '?'} • ${s.code}`,
      code: s.code,
      termCode: term?.code,
      subjectName: subject?.name,
    };
  });

  // Encontrar seção atual
  const currentSection = sectionId ? sections.items.find((s: any) => s.id === sectionId) : null;
  const currentTerm = currentSection ? termMap.get(currentSection.term_id) : null;
  const currentSubject = currentSection ? subjectMap.get(currentSection.subject_id) : null;

  if (!sectionId) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-xl border bg-gradient-to-br from-card to-secondary/5 p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <BookOpenCheck className="h-32 w-32 text-secondary" />
          </div>
          
          <div className="space-y-1 relative z-10">
            <h1 className="text-2xl font-bold tracking-tight">Aulas</h1>
            <p className="text-muted-foreground">Selecione uma turma para gerenciar as aulas.</p>
          </div>
        </div>

        {/* Seletor de Turma */}
        <div className="rounded-xl border bg-card p-8 shadow-sm">
          <div className="max-w-md mx-auto space-y-6">
            <div className="text-center space-y-2">
              <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h2 className="text-lg font-semibold">Selecione uma turma</h2>
              <p className="text-sm text-muted-foreground">
                Escolha a turma abaixo para visualizar e gerenciar suas aulas.
              </p>
            </div>
            <AsyncSectionSelector />
          </div>
        </div>
      </div>
    );
  }

  const data = await adminSessionsServer.listBySection(sectionId, { limit, offset });
  
  // Estatísticas
  const totalAulas = data.total;
  const aulasCanceladas = data.items.filter((s: any) => s.is_canceled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border bg-gradient-to-br from-card to-secondary/5 p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <BookOpenCheck className="h-32 w-32 text-secondary" />
        </div>
        
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 -ml-2">
              <Link href="/administrativo/academico/aulas">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Aulas</h1>
          </div>
          <p className="text-muted-foreground">
            {currentTerm?.code && <Badge variant="outline" className="mr-2">{currentTerm.code}</Badge>}
            {currentSubject?.name || 'Disciplina'} — Turma {currentSection?.code || sectionId}
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Badge variant="secondary" className="h-10 px-4 gap-2 border-primary/20 shadow-sm font-semibold bg-background/80 backdrop-blur-md text-primary ring-1 ring-primary/10">
            <Activity className="h-4 w-4 text-secondary animate-pulse" />
            {totalAulas} aulas
          </Badge>
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
                  Informações sobre o gerenciamento de aulas.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 text-sm text-muted-foreground/90 border-t border-border/50">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <CalendarDays className="h-3.5 w-3.5 text-secondary" />
                  </div>
                  <p>
                    Use <span className="font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">Gerar Aulas</span> na tela de Semestres para criar aulas automaticamente baseado nos horários.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                    <XCircle className="h-3.5 w-3.5 text-orange-600" />
                  </div>
                  <p>
                    Marcar aula como <span className="font-bold text-orange-600 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">cancelada</span> preserva o registro mas não conta presença.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <p>
                    Cada aula pode ter sua <span className="font-bold text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">própria sala</span> diferente da sala padrão da turma.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <CreateSessionSheet 
            sectionId={sectionId}
            trigger={
              <Button 
                size="icon" 
                className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-secondary border-none shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 active:scale-95 group"
              >
                <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
              </Button>
            }
          />
        </div>
      </div>

      {/* Filtro de Turma */}
      <FiltersBar>
        <TooltipProvider>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full">
            <div className="flex-1 max-w-md">
              <AsyncSectionSelector currentValue={sectionId} />
            </div>
            {aulasCanceladas > 0 && (
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                <XCircle className="h-3.5 w-3.5 mr-1" />
                {aulasCanceladas} canceladas
              </Badge>
            )}
          </div>
        </TooltipProvider>
      </FiltersBar>

      {/* Tabela */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="relative">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-b border-border/60">
                <TableHead className="w-[20%] pl-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    Data
                  </div>
                </TableHead>
                <TableHead className="w-[15%]">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    Dia
                  </div>
                </TableHead>
                <TableHead className="w-[20%]">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    Horário
                  </div>
                </TableHead>
                <TableHead className="w-[20%]">
                  <div className="flex items-center gap-2">
                    <DoorOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    Sala
                  </div>
                </TableHead>
                <TableHead className="w-[15%]">Status</TableHead>
                <TableHead className="text-right pr-6">
                  <Cog className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Search className="h-8 w-8 opacity-20" />
                      <p>Nenhuma aula cadastrada.</p>
                      <p className="text-xs">Use &quot;Gerar Aulas&quot; na tela de Semestres ou adicione manualmente.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((s: any) => (
                  <TableRow key={s.id} className={`group transition-colors ${s.is_canceled ? 'opacity-60 bg-muted/20' : 'hover:bg-muted/30'}`}>
                    <TableCell className="pl-6 py-3 font-medium">
                      {formatDateBR(s.session_date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {formatWeekdayBR(s.session_date)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {s.room || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {s.is_canceled ? (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          <XCircle className="h-3 w-3 mr-1" />
                          Cancelada
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ativa
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
                          <Link href={`/administrativo/academico/presencas?session_id=${s.id}`}>
                            <BookOpen className="h-3.5 w-3.5 mr-1" />
                            Presenças
                          </Link>
                        </Button>
                        <EditSessionSheet session={s} />
                        <DeleteSessionButton sessionId={s.id} label={`${formatDateBR(s.session_date)} • ${s.start_time.slice(0, 5)}`} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="border-t p-4 bg-muted/5">
          <Pagination page={page} pageSize={pageSize} total={data.total} />
        </div>
      </div>
    </div>
  );
}
