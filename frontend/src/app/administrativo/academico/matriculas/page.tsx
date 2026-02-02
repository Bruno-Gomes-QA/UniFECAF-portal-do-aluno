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
import { adminEnrollmentsServer } from '@/features/admin/academics/enrollments/api.server';
import { CreateEnrollmentSheet, DeleteEnrollmentButton, EditEnrollmentStatusSheet } from '@/features/admin/academics/enrollments/enrollment-form-sheet';
import { adminStudentsServer } from '@/features/admin/academics/students/api.server';
import { adminSectionsServer } from '@/features/admin/academics/sections/api.server';
import { adminTermsServer } from '@/features/admin/academics/terms/api.server';
import { adminSubjectsServer } from '@/features/admin/academics/subjects/api.server';
import { formatEnrollmentStatus, enrollmentStatusOptions } from '@/features/admin/academics/i18n';
import { UserPlus, Activity, Lightbulb, Plus, Cog, Search, Filter, Users2, BookOpen, Calendar, CheckCircle, XCircle, Lock, GraduationCap } from 'lucide-react';
import Link from 'next/link';

export default async function AdminEnrollmentsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { page, pageSize, limit, offset } = getPagination(searchParams);
  const search = Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search;
  const termId = Array.isArray(searchParams.term_id) ? searchParams.term_id[0] : searchParams.term_id;
  const statusFilter = Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status;

  let enrollments: any = { items: [], total: 0 };
  let students: any = { items: [], total: 0 };
  let sections: any = { items: [], total: 0 };
  let terms: any = { items: [], total: 0 };
  let subjects: any = { items: [], total: 0 };
  let error: string | null = null;

  try {
    const results = await Promise.all([
      adminEnrollmentsServer.list({ 
        limit, 
        offset,
        term_id: termId,
        status: statusFilter,
      }),
      adminStudentsServer.list({ limit: 500, offset: 0 }),
      adminSectionsServer.list({ limit: 500, offset: 0, term_id: termId }),
      adminTermsServer.list({ limit: 500, offset: 0 }),
      adminSubjectsServer.list({ limit: 500, offset: 0 }),
    ]);
    enrollments = results[0];
    students = results[1];
    sections = results[2];
    terms = results[3];
    subjects = results[4];
  } catch (err: any) {
    console.error('Falha ao carregar matrículas:', err);
    error = err.message || 'Erro ao carregar dados.';
  }

  const studentOptions = students.items.map((s: any) => ({ id: s.user_id, label: `${s.full_name} (${s.ra})` }));

  const termMap = new Map<string, { id: string; code: string }>(terms.items.map((t: any) => [t.id, t]));
  const subjectMap = new Map<string, { id: string; name: string }>(subjects.items.map((s: any) => [s.id, s]));
  const sectionMap = new Map<string, { id: string; term_id: string; subject_id: string; code: string }>(sections.items.map((s: any) => [s.id, s]));
  
  const sectionLabel = (section: { term_id: string; subject_id: string; code: string }) => {
    const term = termMap.get(section.term_id);
    const subject = subjectMap.get(section.subject_id);
    return `${term?.code || '?'} • ${subject?.name || '?'} • ${section.code}`;
  };
  
  const sectionOptions = sections.items.map((s: any) => ({ id: s.id, label: sectionLabel(s) }));
  const studentMap = new Map<string, string>(studentOptions.map((s: { id: string; label: string }) => [s.id, s.label]));
  const sectionLabelMap = new Map<string, string>(sectionOptions.map((s: { id: string; label: string }) => [s.id, s.label]));

  // Filter items - term_id and status are now filtered by API, keep search for client-side
  let filteredItems = enrollments.items;
  
  if (search) {
    const searchLower = search.toLowerCase();
    filteredItems = filteredItems.filter((e: any) => {
      const studentLabel = studentMap.get(e.student_id)?.toLowerCase() || '';
      const sectionLabel = sectionLabelMap.get(e.section_id)?.toLowerCase() || '';
      return studentLabel.includes(searchLower) || sectionLabel.includes(searchLower);
    });
  }

  // Options for selects
  const termSelectOptions = terms.items.map((t: any) => ({ value: t.id, label: t.code }));
  const statusSelectOptions = enrollmentStatusOptions.map(o => ({ value: o.value, label: o.label }));

  // Stats
  const enrolled = enrollments.items.filter((e: any) => e.status === 'ENROLLED').length;
  const completed = enrollments.items.filter((e: any) => e.status === 'COMPLETED').length;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'ENROLLED': return 'success';
      case 'COMPLETED': return 'secondary';
      case 'DROPPED': return 'destructive';
      case 'LOCKED': return 'warning';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ENROLLED': return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'COMPLETED': return <GraduationCap className="h-3 w-3 mr-1" />;
      case 'DROPPED': return <XCircle className="h-3 w-3 mr-1" />;
      case 'LOCKED': return <Lock className="h-3 w-3 mr-1" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border bg-gradient-to-br from-card to-secondary/5 p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <UserPlus className="h-32 w-32 text-secondary" />
        </div>
        
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Matrículas</h1>
          <p className="text-muted-foreground">Gerencie matrículas de alunos nas turmas.</p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Badge variant="secondary" className="h-10 px-4 gap-2 border-primary/20 shadow-sm font-semibold bg-background/80 backdrop-blur-md text-primary ring-1 ring-primary/10">
            <Activity className="h-4 w-4 text-secondary animate-pulse" />
            {enrollments.total} matrículas
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
                  Informações sobre o gerenciamento de matrículas.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 text-sm text-muted-foreground/90 border-t border-border/50">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <p>
                    <span className="font-bold text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">Matriculado</span> é o status padrão do aluno ativo na turma.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                    <Lock className="h-3.5 w-3.5 text-orange-600" />
                  </div>
                  <p>
                    <span className="font-bold text-orange-600 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">Trancado</span> indica que o aluno pausou a matrícula temporariamente.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <XCircle className="h-3.5 w-3.5 text-red-600" />
                  </div>
                  <p>
                    <span className="font-bold text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">Desistente</span> significa que o aluno abandonou a disciplina.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <GraduationCap className="h-3.5 w-3.5 text-secondary" />
                  </div>
                  <p>
                    <span className="font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">Concluído</span> indica que o aluno finalizou a disciplina.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <CreateEnrollmentSheet 
            students={studentOptions} 
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
                placeholder="Nome do aluno ou turma..." 
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
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Status</Label>
              </div>
              <FiltersSelect name="status" defaultValue={statusFilter} allLabel="Todos" options={statusSelectOptions} />
            </div>

            <Button type="submit" className="sm:ml-auto h-9 gap-2 shadow-sm">
              <Filter className="h-3.5 w-3.5" />
              Filtrar
            </Button>
            <Button asChild variant="ghost" className="h-9">
              <Link href="/administrativo/academico/matriculas">Limpar</Link>
            </Button>
          </FiltersForm>
        </TooltipProvider>
      </FiltersBar>

      {/* Tabela */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-muted-foreground bg-destructive/5 flex flex-col items-center gap-2">
            <UserPlus className="h-8 w-8 text-destructive/50 mb-2" />
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
                      <Users2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Aluno
                    </div>
                  </TableHead>
                  <TableHead className="w-[40%]">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                      Turma
                    </div>
                  </TableHead>
                  <TableHead className="w-[15%]">Status</TableHead>
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
                        <p>Nenhuma matrícula encontrada.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((e: any) => {
                    const section = sectionMap.get(e.section_id);
                    const term = section ? termMap.get(section.term_id) : null;
                    const subject = section ? subjectMap.get(section.subject_id) : null;
                    
                    return (
                      <TableRow key={e.id} className="group transition-colors hover:bg-muted/30">
                        <TableCell className="pl-6 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium truncate max-w-[250px]" title={studentMap.get(e.student_id)}>
                              {studentMap.get(e.student_id) || e.student_id}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium truncate max-w-[300px]" title={subject?.name}>
                              {subject?.name || 'Disciplina desconhecida'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {term?.code} • Turma {section?.code}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(e.status) as any} className="text-xs">
                            {getStatusIcon(e.status)}
                            {formatEnrollmentStatus(e.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <EditEnrollmentStatusSheet enrollment={e} />
                            <DeleteEnrollmentButton enrollmentId={e.id} label={`${studentMap.get(e.student_id)}`} />
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
          <Pagination page={page} pageSize={pageSize} total={enrollments?.total || 0} />
        </div>
      </div>
    </div>
  );
}
