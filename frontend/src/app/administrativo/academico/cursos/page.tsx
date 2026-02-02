import { FiltersBar } from '@/components/shared/filters-bar';
import { FiltersForm } from '@/components/shared/filters-form';
import { Pagination } from '@/components/shared/pagination';
import { FiltersSelect } from '@/components/shared/filters-select';
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
import { adminCoursesServer } from '@/features/admin/academics/courses/api.server';
import { 
  CreateCourseSheet, 
  EditCourseSheet, 
  DeleteCourseButton, 
  ToggleCourseStatusButton,
  CourseSubjectsDialog 
} from '@/features/admin/academics/courses/course-form-sheets';
import { formatDegreeType, formatDuration } from '@/features/admin/academics/courses/i18n';
import type { Course } from '@/features/admin/academics/courses/types';
import { GraduationCap, Filter, Search, Lightbulb, Plus, Clock, BookOpen, Users, Cog, Activity, Hash } from 'lucide-react';
import Link from 'next/link';

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { page, pageSize, limit, offset } = getPagination(searchParams);
  const search = Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search;
  const is_active = Array.isArray(searchParams.is_active) ? searchParams.is_active[0] : searchParams.is_active;
  
  let data: { items: Course[]; total: number } = { items: [], total: 0 };
  let error: string | null = null;

  try {
    data = await adminCoursesServer.list({ 
      limit, 
      offset,
      search: search || undefined,
      is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
    });
  } catch (err: any) {
    console.error('Falha ao carregar cursos:', err);
    error = err.message || 'Erro ao carregar dados.';
  }

  const statusOptions = [
    { value: 'true', label: 'Ativos' },
    { value: 'false', label: 'Inativos' },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-gradient-to-br from-card to-secondary/5 p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <GraduationCap className="h-32 w-32 text-secondary" />
        </div>
        
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Cursos</h1>
          <p className="text-muted-foreground">Gerencie os cursos e grades curriculares.</p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Badge variant="secondary" className="h-10 px-4 gap-2 border-primary/20 shadow-sm font-semibold bg-background/80 backdrop-blur-md text-primary ring-1 ring-primary/10">
            <Activity className="h-4 w-4 text-secondary animate-pulse" />
            {data.total} cursos
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
                  Informações sobre gestão de cursos.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 text-sm text-muted-foreground/90 border-t border-border/50">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Hash className="h-3.5 w-3.5 text-secondary" />
                  </div>
                  <p>
                    O <span className="font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">código do curso</span> é imutável após criação e serve como identificador único.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <BookOpen className="h-3.5 w-3.5 text-accent-foreground" />
                  </div>
                  <p>
                    Clique no ícone de <span className="font-bold text-foreground bg-accent/20 px-1.5 py-0.5 rounded border border-accent/20">livro</span> para visualizar as disciplinas do curso.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Activity className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <p>
                    Cursos <span className="font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">inativos</span> não aceitam novas matrículas, mas mantêm histórico.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <CreateCourseSheet trigger={
            <Button 
              size="icon" 
              className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-secondary border-none shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 active:scale-95 group"
            >
              <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
            </Button>
          } />
        </div>
      </div>

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
                placeholder="Código ou nome do curso..." 
                defaultValue={search || ''} 
                className="h-9"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Situação</Label>
              </div>
              <FiltersSelect name="is_active" defaultValue={is_active} allLabel="Todos" options={statusOptions} />
            </div>

            <Button type="submit" className="sm:ml-auto h-9 gap-2 shadow-sm">
              <Filter className="h-3.5 w-3.5" />
              Filtrar
            </Button>
            <Button asChild variant="ghost" className="h-9">
              <Link href="/administrativo/academico/cursos">Limpar</Link>
            </Button>
          </FiltersForm>
        </TooltipProvider>
      </FiltersBar>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-muted-foreground bg-destructive/5 flex flex-col items-center gap-2">
            <GraduationCap className="h-8 w-8 text-destructive/50 mb-2" />
            <p className="font-medium text-destructive">{error}</p>
            <p className="text-sm">Tente recarregar a página ou limpar os filtros.</p>
          </div>
        ) : (
        <div className="relative">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-b border-border/60">
                <TableHead className="w-[10%] pl-6">
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    Código
                  </div>
                </TableHead>
                <TableHead className="w-[30%]">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                    Nome
                  </div>
                </TableHead>
                <TableHead className="w-[15%]">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    Tipo
                  </div>
                </TableHead>
                <TableHead className="w-[10%] text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    Duração
                  </div>
                </TableHead>
                <TableHead className="w-[10%] text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    Alunos
                  </div>
                </TableHead>
                <TableHead className="w-[10%] text-center">
                  <div className="flex items-center justify-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    Disciplinas
                  </div>
                </TableHead>
                <TableHead className="w-[10%] text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                    Status
                  </div>
                </TableHead>
                <TableHead className="text-right pr-6">
                  <Cog className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Search className="h-8 w-8 opacity-20" />
                      <p>Nenhum curso encontrado com os filtros atuais.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((c) => (
                  <TableRow key={c.id} className={`group transition-colors hover:bg-muted/30 ${!c.is_active ? 'bg-muted/20 opacity-75' : ''}`}>
                    <TableCell className="pl-6 font-mono text-sm font-medium">
                      {c.code}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground truncate" title={c.name}>{c.name}</span>
                        <span className="text-xs text-muted-foreground truncate opacity-0 group-hover:opacity-100 transition-opacity">ID: {c.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize shadow-none">
                        {formatDegreeType(c.degree_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-medium">{formatDuration(c.duration_terms)}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="shadow-none">
                        {c.students_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="shadow-none">
                        {c.subjects_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${c.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="text-sm">{c.is_active ? 'Ativo' : 'Inativo'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <CourseSubjectsDialog course={c} />
                        <EditCourseSheet course={c} />
                        <ToggleCourseStatusButton course={c} />
                        <DeleteCourseButton course={c} />
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
          <Pagination page={page} pageSize={pageSize} total={data?.total || 0} />
        </div>
      </div>
    </div>
  );
}
