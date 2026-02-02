import { FiltersBar } from '@/components/shared/filters-bar';
import { FiltersForm } from '@/components/shared/filters-form';
import { FiltersSelect } from '@/components/shared/filters-select';
import { Pagination } from '@/components/shared/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getPagination } from '@/lib/pagination';
import { adminStudentsServer } from '@/features/admin/academics/students/api.server';
import { adminCoursesServer } from '@/features/admin/academics/courses/api.server';
import { adminTermsServer } from '@/features/admin/academics/terms/api.server';
import {
  CreateStudentSheet,
  StudentStatusBadge,
  StudentRowActions,
} from '@/features/admin/academics/students/student-form-sheets';
import type { Student } from '@/features/admin/academics/students/types';
import { Activity, BookOpen, GraduationCap, Lightbulb, Plus, Search, Shield, Calendar } from 'lucide-react';
import Link from 'next/link';

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { page, pageSize, limit, offset } = getPagination(searchParams);
  const query = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  const courseId = Array.isArray(searchParams.course_id) ? searchParams.course_id[0] : searchParams.course_id;
  const termId = Array.isArray(searchParams.term_id) ? searchParams.term_id[0] : searchParams.term_id;
  const status = Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status;

  // Default empty data
  let students: any = { items: [], total: 0 };
  let courses: any = { items: [], total: 0 };
  let terms: any = { items: [], total: 0 };
  let error: string | null = null;

  try {
    const results = await Promise.all([
      adminStudentsServer.list({ limit, offset, status: status || undefined }),
      adminCoursesServer.list({ limit: 50, offset: 0 }),
      adminTermsServer.list({ limit: 50, offset: 0 }),
    ]);
    students = results[0];
    courses = results[1];
    terms = results[2];
  } catch (err: any) {
    console.error('Falha ao carregar alunos:', err);
    error = err.message || 'Erro ao carregar dados.';
  }

  const courseMap = new Map(courses.items.map((c: any) => [c.id, c.name]));
  const termMap = new Map(terms.items.map((t: any) => [t.id, t.code]));

  const courseOptions = courses.items.map((c: any) => ({ id: c.id, label: c.name }));
  const termOptions = terms.items.map((t: any) => ({ id: t.id, label: t.code }));
  const courseFilterOptions = courses.items.map((c: any) => ({ value: c.id, label: c.name }));
  const termFilterOptions = terms.items.map((t: any) => ({ value: t.id, label: t.code }));
  const statusOptions = [
    { value: 'ACTIVE', label: 'Ativo' },
    { value: 'LOCKED', label: 'Trancado' },
    { value: 'GRADUATED', label: 'Formado' },
    { value: 'DELETED', label: 'Excluído' },
    { value: 'ALL', label: 'Todos' },
  ];

  const filteredStudents = (students.items as Student[]).filter((student) => {
    const matchesQuery = query
      ? `${student.full_name} ${student.ra}`.toLowerCase().includes(String(query).toLowerCase())
      : true;
    const matchesCourse = courseId ? student.course_id === courseId : true;
    const matchesTerm = termId ? student.admission_term === termId : true;
    return matchesQuery && matchesCourse && matchesTerm;
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-gradient-to-br from-card to-secondary/5 p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <GraduationCap className="h-32 w-32 text-secondary" />
        </div>

        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Alunos</h1>
          <p className="text-muted-foreground">Perfis acadêmicos vinculados a usuários do portal.</p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Badge
            variant="secondary"
            className="h-10 px-4 gap-2 border-primary/20 shadow-sm font-semibold bg-background/80 backdrop-blur-md text-primary ring-1 ring-primary/10"
          >
            <Activity className="h-4 w-4 text-secondary animate-pulse" />
            {students.total} alunos
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
                  Informações essenciais sobre o cadastro de alunos.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 text-sm text-muted-foreground/90 border-t border-border/50">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Shield className="h-3.5 w-3.5 text-secondary" />
                  </div>
                  <p>
                    O aluno deve estar previamente cadastrado como usuário no sistema para vincular o perfil acadêmico.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <BookOpen className="h-3.5 w-3.5 text-accent-foreground" />
                  </div>
                  <p>
                    Mantenha o curso e o termo de admissão atualizados para garantir relatórios corretos.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <CreateStudentSheet
            courses={courseOptions}
            terms={termOptions}
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

      <FiltersBar>
        <FiltersForm>
          <div className="grid flex-1 gap-2">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="q" className="font-medium">Nome ou RA</Label>
            </div>
            <Input
              id="q"
              name="q"
              placeholder="Buscar por nome ou RA..."
              defaultValue={query || ''}
              className="h-9"
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">Curso</Label>
            </div>
            <FiltersSelect
              name="course_id"
              defaultValue={courseId}
              allLabel="Todos os cursos"
              options={courseFilterOptions}
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">Termo</Label>
            </div>
            <FiltersSelect
              name="term_id"
              defaultValue={termId}
              allLabel="Todos os termos"
              options={termFilterOptions}
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">Status</Label>
            </div>
            <FiltersSelect
              name="status"
              defaultValue={status}
              allLabel="Ativos"
              options={statusOptions}
            />
          </div>

          <Button type="submit" className="sm:ml-auto h-9 gap-2 shadow-sm">
            <Search className="h-3.5 w-3.5" />
            Filtrar
          </Button>
          <Button asChild variant="ghost" className="h-9">
            <Link href="/administrativo/alunos">Limpar</Link>
          </Button>
        </FiltersForm>
      </FiltersBar>

      <div className="rounded-xl border bg-card shadow-sm">
        {error ? (
          <div className="p-8 text-center text-muted-foreground bg-destructive/5">
            <p className="font-medium text-destructive">{error}</p>
            <p className="text-sm">Tente recarregar a página.</p>
          </div>
        ) : (
        <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>RA</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead>Admissão</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum aluno encontrado com os filtros atuais.
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((s: Student) => (
                <TableRow key={s.user_id} className="group transition-colors hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{s.full_name}</span>
                      {s.graduation_date && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Formado em {new Date(s.graduation_date).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{s.ra}</TableCell>
                  <TableCell>{String(courseMap.get(s.course_id) || s.course_id)}</TableCell>
                  <TableCell>{s.admission_term ? String(termMap.get(s.admission_term) || s.admission_term) : '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Number(s.total_progress)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{Number(s.total_progress).toFixed(0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StudentStatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <StudentRowActions student={s} courses={courseOptions} terms={termOptions} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="border-t p-4">
          <Pagination page={page} pageSize={pageSize} total={query || courseId || termId ? filteredStudents.length : students.total} />
        </div>
        </>
        )}
      </div>
    </div>
  );
}
