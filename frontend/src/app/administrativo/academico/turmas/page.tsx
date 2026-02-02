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
import { adminSectionsServer } from '@/features/admin/academics/sections/api.server';
import { adminTermsServer } from '@/features/admin/academics/terms/api.server';
import { adminSubjectsServer } from '@/features/admin/academics/subjects/api.server';
import { adminCoursesServer } from '@/features/admin/academics/courses/api.server';
import { CreateSectionSheet, EditSectionSheet, DeleteSectionButton } from '@/features/admin/academics/sections/section-form-sheets';
import { MeetingsSheet } from '@/features/admin/academics/sections/meetings-sheet';
import { Users2, Activity, Filter, Search, Lightbulb, Plus, Cog, Calendar, BookOpen, GraduationCap, Clock, DoorOpen, Users } from 'lucide-react';
import Link from 'next/link';

export default async function AdminSectionsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { page, pageSize, limit, offset } = getPagination(searchParams);
  const search = Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search;
  const termId = Array.isArray(searchParams.term_id) ? searchParams.term_id[0] : searchParams.term_id;
  const courseId = Array.isArray(searchParams.course_id) ? searchParams.course_id[0] : searchParams.course_id;

  let sections: any = { items: [], total: 0 };
  let terms: any = { items: [], total: 0 };
  let subjects: any = { items: [], total: 0 };
  let courses: any = { items: [], total: 0 };
  let error: string | null = null;

  try {
    const results = await Promise.all([
      adminSectionsServer.list({ 
        limit, 
        offset, 
        term_id: termId || undefined,
        course_id: courseId || undefined,
      }),
      adminTermsServer.list({ limit: 500, offset: 0 }),
      adminSubjectsServer.list({ limit: 500, offset: 0 }),
      adminCoursesServer.list({ limit: 500, offset: 0 }),
    ]);
    sections = results[0];
    terms = results[1];
    subjects = results[2];
    courses = results[3];
  } catch (err: any) {
    console.error('Falha ao carregar turmas:', err);
    error = err.message || 'Erro ao carregar dados.';
  }

  // Build maps
  const termMap = new Map<string, { id: string; name: string; code: string; is_current: boolean }>(terms.items.map((t: any) => [t.id, t]));
  const subjectMap = new Map<string, { id: string; code: string; name: string; course_id: string }>(subjects.items.map((s: any) => [s.id, s]));
  const courseMap = new Map<string, { id: string; code: string; name: string }>(courses.items.map((c: any) => [c.id, c]));

  // Filter items only by search (term/course filters are applied server-side)
  let filteredItems = sections.items;
  
  if (search) {
    const searchLower = search.toLowerCase();
    filteredItems = filteredItems.filter((s: any) => {
      const subject = subjectMap.get(s.subject_id);
      const subjectName = subject?.name?.toLowerCase() || '';
      const subjectCode = subject?.code?.toLowerCase() || '';
      return s.code.toLowerCase().includes(searchLower) || 
             subjectName.includes(searchLower) ||
             subjectCode.includes(searchLower);
    });
  }

  // Options for selects
  const termOptions = terms.items.map((t: any) => ({ id: t.id, label: t.code }));
  const courseOptions = courses.items
    .filter((c: any) => c.is_active)
    .map((c: any) => ({ value: c.id, label: c.name }));
  const termSelectOptions = terms.items.map((t: any) => ({ value: t.id, label: t.code }));
  
  // Subject options with course info
  const subjectOptions = subjects.items
    .filter((s: any) => s.is_active)
    .map((s: any) => {
      const course = courseMap.get(s.course_id);
      return { 
        id: s.id, 
        label: `${s.code} — ${s.name}${course ? ` (${course.code})` : ''}` 
      };
    });

  return (
    <div className="space-y-6">
      {/* Header com gradiente - Padrão Users */}
      <div className="rounded-xl border bg-gradient-to-br from-card to-secondary/5 p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Users2 className="h-32 w-32 text-secondary" />
        </div>
        
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Turmas</h1>
          <p className="text-muted-foreground">Gerencie as turmas por semestre e disciplina.</p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Badge variant="secondary" className="h-10 px-4 gap-2 border-primary/20 shadow-sm font-semibold bg-background/80 backdrop-blur-md text-primary ring-1 ring-primary/10">
            <Activity className="h-4 w-4 text-secondary animate-pulse" />
            {sections.total} turmas
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
                  Informações sobre o gerenciamento de turmas.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 text-sm text-muted-foreground/90 border-t border-border/50">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="h-3.5 w-3.5 text-secondary" />
                  </div>
                  <p>
                    Use <span className="font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">Horários</span> para definir a grade semanal da turma (dias e horários).
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <BookOpen className="h-3.5 w-3.5 text-accent-foreground" />
                  </div>
                  <p>
                    Após definir horários, use <span className="font-bold text-foreground bg-accent/20 px-1.5 py-0.5 rounded border border-accent/20">Gerar Aulas</span> no semestre para criar as sessões automaticamente.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <Users className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <p>
                    A <span className="font-bold text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">capacidade</span> define o limite de alunos na turma. Deixe em branco para ilimitado.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <CreateSectionSheet 
            terms={termOptions} 
            subjects={subjectOptions} 
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
                placeholder="Código da turma ou disciplina..." 
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
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Curso</Label>
              </div>
              <FiltersSelect name="course_id" defaultValue={courseId} allLabel="Todos" options={courseOptions} />
            </div>

            <Button type="submit" className="sm:ml-auto h-9 gap-2 shadow-sm">
              <Filter className="h-3.5 w-3.5" />
              Filtrar
            </Button>
            <Button asChild variant="ghost" className="h-9">
              <Link href="/administrativo/academico/turmas">Limpar</Link>
            </Button>
          </FiltersForm>
        </TooltipProvider>
      </FiltersBar>

      {/* Tabela */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-muted-foreground bg-destructive/5 flex flex-col items-center gap-2">
            <Users2 className="h-8 w-8 text-destructive/50 mb-2" />
            <p className="font-medium text-destructive">{error}</p>
            <p className="text-sm">Tente recarregar a página ou limpar os filtros.</p>
          </div>
        ) : (
          <div className="relative">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-b border-border/60">
                  <TableHead className="w-[15%] pl-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      Semestre
                    </div>
                  </TableHead>
                  <TableHead className="w-[20%]">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                      Curso
                    </div>
                  </TableHead>
                  <TableHead className="w-[25%]">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                      Disciplina
                    </div>
                  </TableHead>
                  <TableHead className="w-[10%]">
                    <div className="flex items-center gap-2">
                      <Users2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Turma
                    </div>
                  </TableHead>
                  <TableHead className="w-[10%]">
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-3.5 w-3.5 text-muted-foreground" />
                      Sala
                    </div>
                  </TableHead>
                  <TableHead className="w-[10%]">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      Cap.
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
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Search className="h-8 w-8 opacity-20" />
                        <p>Nenhuma turma encontrada.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((s: any) => {
                    const term = termMap.get(s.term_id);
                    const subject = subjectMap.get(s.subject_id);
                    const course = subject ? courseMap.get(subject.course_id) : null;
                    const sectionLabel = `${term?.code || s.term_id} • ${subject?.code || s.subject_id} • ${s.code}`;
                    
                    return (
                      <TableRow key={s.id} className="group transition-colors hover:bg-muted/30">
                        <TableCell className="pl-6 py-3">
                          <Badge variant="outline" className="font-medium">
                            {term?.code || s.term_id}
                          </Badge>
                          {term?.is_current && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Atual
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {course?.name || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{subject?.name || s.subject_id}</span>
                            <span className="text-xs text-muted-foreground">{subject?.code}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-primary/80">
                            {s.code}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {s.room_default || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          {s.capacity ? (
                            <span className="font-medium">{s.capacity}</span>
                          ) : (
                            <span className="text-muted-foreground">∞</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <MeetingsSheet sectionId={s.id} sectionLabel={sectionLabel} />
                            <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
                              <Link href={`/administrativo/academico/aulas?section_id=${s.id}`}>
                                <BookOpen className="h-3.5 w-3.5 mr-1" />
                                Aulas
                              </Link>
                            </Button>
                            <EditSectionSheet section={s} terms={termOptions} subjects={subjectOptions} />
                            <DeleteSectionButton sectionId={s.id} label={sectionLabel} />
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
          <Pagination page={page} pageSize={pageSize} total={sections?.total || 0} />
        </div>
      </div>
    </div>
  );
}
