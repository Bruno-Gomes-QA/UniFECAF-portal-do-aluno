import { FiltersBar } from '@/components/shared/filters-bar';
import { FiltersForm } from '@/components/shared/filters-form';
import { FiltersSelect } from '@/components/shared/filters-select';
import { Pagination } from '@/components/shared/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { formatDateBR } from '@/lib/formatters/date';
import { adminAssessmentsServer } from '@/features/admin/academics/assessments/api.server';
import { adminSectionsServer } from '@/features/admin/academics/sections/api.server';
import { adminTermsServer } from '@/features/admin/academics/terms/api.server';
import { adminSubjectsServer } from '@/features/admin/academics/subjects/api.server';
import { CreateAssessmentDialog, DeleteAssessmentButton, EditAssessmentDialog } from '@/features/admin/academics/assessments/assessment-form-dialogs';
import { formatAssessmentKind, assessmentKindOptions } from '@/features/admin/academics/i18n';
import { FileText, Activity, Lightbulb, Plus, Cog, Search, Filter, Users2, BookOpen, Calendar, Tag, Percent, CalendarDays, ClipboardList } from 'lucide-react';
import Link from 'next/link';

export default async function AdminAssessmentsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { page, pageSize, limit, offset } = getPagination(searchParams);
  const search = Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search;
  const termId = Array.isArray(searchParams.term_id) ? searchParams.term_id[0] : searchParams.term_id;
  const kindFilter = Array.isArray(searchParams.kind) ? searchParams.kind[0] : searchParams.kind;

  let data: any = { items: [], total: 0 };
  let sections: any = { items: [], total: 0 };
  let terms: any = { items: [], total: 0 };
  let subjects: any = { items: [], total: 0 };
  let error: string | null = null;

  try {
    // Buscar todas as avaliações para poder filtrar por termo no client-side
    // (já que a API não suporta filtro direto por term_id)
    const results = await Promise.all([
      adminAssessmentsServer.list({ limit: 500, offset: 0 }),
      adminSectionsServer.list({ limit: 500, offset: 0 }),
      adminTermsServer.list({ limit: 500, offset: 0 }),
      adminSubjectsServer.list({ limit: 500, offset: 0 }),
    ]);
    data = results[0];
    sections = results[1];
    terms = results[2];
    subjects = results[3];
  } catch (err: any) {
    console.error('Falha ao carregar avaliações:', err);
    error = err.message || 'Erro ao carregar dados.';
  }

  const termMap = new Map<string, { id: string; code: string }>(terms.items.map((t: any) => [t.id, t]));
  const subjectMap = new Map<string, { id: string; name: string }>(subjects.items.map((s: any) => [s.id, s]));
  const sectionMap = new Map<string, { id: string; term_id: string; subject_id: string; code: string; room_default?: string }>(sections.items.map((s: any) => [s.id, s]));

  const sectionLabel = (section: { term_id: string; subject_id: string; code: string }) => {
    const term = termMap.get(section.term_id);
    const subject = subjectMap.get(section.subject_id);
    return `${term?.code || '?'} • ${subject?.name || '?'} • ${section.code}`;
  };

  const sectionOptions = sections.items.map((s: any) => ({
    id: s.id,
    label: sectionLabel(s),
    description: s.room_default ? `Sala ${s.room_default}` : undefined,
  }));

  const sectionLabelMap = new Map<string, string>(sectionOptions.map((s: { id: string; label: string }) => [s.id, s.label]));

  // Filter items (client-side porque a API não suporta term_id diretamente)
  let filteredItems = data.items;
  
  if (termId) {
    filteredItems = filteredItems.filter((a: any) => {
      const section = sectionMap.get(a.section_id);
      return section && section.term_id === termId;
    });
  }
  
  if (kindFilter) {
    filteredItems = filteredItems.filter((a: any) => a.kind === kindFilter);
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    filteredItems = filteredItems.filter((a: any) => {
      const sectionLabel = sectionLabelMap.get(a.section_id)?.toLowerCase() || '';
      return a.name.toLowerCase().includes(searchLower) || sectionLabel.includes(searchLower);
    });
  }

  // Aplicar paginação após filtros
  const paginatedItems = filteredItems.slice(offset, offset + limit);
  const filteredTotal = filteredItems.length;

  // Options for selects
  const termSelectOptions = terms.items.map((t: any) => ({ value: t.id, label: t.code }));
  const kindSelectOptions = assessmentKindOptions.map(o => ({ value: o.value, label: o.label }));

  const getKindColor = (kind: string) => {
    switch (kind) {
      case 'EXAM': return 'bg-red-100 text-red-700 border-red-200';
      case 'ASSIGNMENT': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'PROJECT': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'QUIZ': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'PRESENTATION': return 'bg-green-100 text-green-700 border-green-200';
      case 'PARTICIPATION': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border bg-gradient-to-br from-card to-secondary/5 p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <FileText className="h-32 w-32 text-secondary" />
        </div>
        
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Avaliações</h1>
          <p className="text-muted-foreground">Gerencie avaliações e trabalhos das turmas.</p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Badge variant="secondary" className="h-10 px-4 gap-2 border-primary/20 shadow-sm font-semibold bg-background/80 backdrop-blur-md text-primary ring-1 ring-primary/10">
            <Activity className="h-4 w-4 text-secondary animate-pulse" />
            {data.total} avaliações
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
                  Informações sobre o gerenciamento de avaliações.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 text-sm text-muted-foreground/90 border-t border-border/50">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <FileText className="h-3.5 w-3.5 text-red-600" />
                  </div>
                  <p>
                    <span className="font-bold text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">Prova</span> é avaliação presencial tradicional.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <ClipboardList className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <p>
                    <span className="font-bold text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">Trabalho</span> para atividades entregues fora de sala.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Percent className="h-3.5 w-3.5 text-secondary" />
                  </div>
                  <p>
                    O <span className="font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">peso</span> define a importância na média final (ex: 2.0 = 20%).
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                    <Calendar className="h-3.5 w-3.5 text-orange-600" />
                  </div>
                  <p>
                    A <span className="font-bold text-orange-600 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">data de entrega</span> é opcional mas ajuda no acompanhamento.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <CreateAssessmentDialog 
            sections={sectionOptions}
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

      {/* Filtros */}
      <FiltersBar>
        <TooltipProvider>
          <FiltersForm>
            <div className="grid flex-1 gap-2">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="search" className="font-medium">Buscar</Label>
              </div>
              <Input 
                id="search" 
                name="search" 
                placeholder="Nome da avaliação ou turma..." 
                defaultValue={search || ''} 
                className="h-9"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Semestre</Label>
              </div>
              <FiltersSelect name="term_id" defaultValue={termId} allLabel="Todos" options={termSelectOptions} />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Tipo</Label>
              </div>
              <FiltersSelect name="kind" defaultValue={kindFilter} allLabel="Todos" options={kindSelectOptions} />
            </div>

            <Button type="submit" className="sm:ml-auto h-9 gap-2 shadow-sm">
              <Filter className="h-3.5 w-3.5" />
              Filtrar
            </Button>
            <Button asChild variant="ghost" className="h-9">
              <Link href="/administrativo/academico/avaliacoes">Limpar</Link>
            </Button>
          </FiltersForm>
        </TooltipProvider>
      </FiltersBar>

      {/* Tabela */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-muted-foreground bg-destructive/5 flex flex-col items-center gap-2">
            <FileText className="h-8 w-8 text-destructive/50 mb-2" />
            <p className="font-medium text-destructive">{error}</p>
            <p className="text-sm">Tente recarregar a página ou limpar os filtros.</p>
          </div>
        ) : (
          <div className="relative">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-b border-border/60">
                  <TableHead className="w-[30%] pl-6">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                      Turma
                    </div>
                  </TableHead>
                  <TableHead className="w-[25%]">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      Nome
                    </div>
                  </TableHead>
                  <TableHead className="w-[15%]">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                      Tipo
                    </div>
                  </TableHead>
                  <TableHead className="w-[10%]">
                    <div className="flex items-center gap-2">
                      <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                      Peso
                    </div>
                  </TableHead>
                  <TableHead className="w-[10%]">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      Data
                    </div>
                  </TableHead>
                  <TableHead className="text-right pr-6">
                    <Cog className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Search className="h-8 w-8 opacity-20" />
                        <p>Nenhuma avaliação encontrada.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((a: any) => {
                    const section = sectionMap.get(a.section_id);
                    const term = section ? termMap.get(section.term_id) : null;
                    const subject = section ? subjectMap.get(section.subject_id) : null;
                    
                    return (
                      <TableRow key={a.id} className="group transition-colors hover:bg-muted/30">
                        <TableCell className="pl-6 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium truncate max-w-[250px]" title={subject?.name}>
                              {subject?.name || 'Disciplina desconhecida'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {term?.code} • Turma {section?.code}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{a.name}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${getKindColor(a.kind)}`}>
                            {formatAssessmentKind(a.kind)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{Number(a.weight)?.toFixed(1) || '1.0'}</span>
                        </TableCell>
                        <TableCell>
                          {a.due_date ? (
                            <span className="text-sm">{formatDateBR(a.due_date)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
                              <Link href={`/administrativo/academico/notas-avaliacoes?assessment_id=${a.id}`}>
                                <ClipboardList className="h-3.5 w-3.5 mr-1" />
                                Notas
                              </Link>
                            </Button>
                            <EditAssessmentDialog assessment={a} sections={sectionOptions} />
                            <DeleteAssessmentButton assessmentId={a.id} label={a.name} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="border-t p-4 bg-muted/5">
          <Pagination page={page} pageSize={pageSize} total={filteredTotal} />
        </div>
      </div>
    </div>
  );
}
