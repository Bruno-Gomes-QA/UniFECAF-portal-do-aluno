import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { adminTermsServer } from '@/features/admin/academics/terms/api.server';
import { adminSectionsServer } from '@/features/admin/academics/sections/api.server';
import { adminSubjectsServer } from '@/features/admin/academics/subjects/api.server';
import { adminCoursesServer } from '@/features/admin/academics/courses/api.server';
import { formatDateBR } from '@/lib/formatters/date';
import { ArrowLeft, Calendar, BookOpen, GraduationCap, FolderTree, Users2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: { id: string };
}

export default async function TermStructurePage({ params }: PageProps) {
  const termId = params.id;
  
  let term: any = null;
  let sections: any[] = [];
  let subjects: any[] = [];
  let courses: any[] = [];
  let error: string | null = null;

  try {
    const [termData, sectionsData, subjectsData, coursesData] = await Promise.all([
      adminTermsServer.getById(termId),
      adminSectionsServer.list({ limit: 500, offset: 0, term_id: termId }),
      adminSubjectsServer.list({ limit: 500, offset: 0 }),
      adminCoursesServer.list({ limit: 500, offset: 0 }),
    ]);
    term = termData;
    sections = sectionsData.items;
    subjects = subjectsData.items;
    courses = coursesData.items;
  } catch (err: any) {
    if (err?.status === 404) {
      notFound();
    }
    console.error('Falha ao carregar estrutura:', err);
    error = err.message || 'Erro ao carregar dados.';
  }

  if (!term) {
    notFound();
  }

  // Build maps
  const subjectMap = new Map(subjects.map((s: any) => [s.id, s]));
  const courseMap = new Map(courses.map((c: any) => [c.id, c]));

  // Group sections by course
  type CourseGroup = {
    course: any;
    subjects: {
      subject: any;
      sections: any[];
    }[];
  };

  const courseGroups = new Map<string, CourseGroup>();

  for (const section of sections) {
    const subject = subjectMap.get(section.subject_id);
    if (!subject) continue;
    
    const course = courseMap.get(subject.course_id);
    if (!course) continue;

    if (!courseGroups.has(course.id)) {
      courseGroups.set(course.id, {
        course,
        subjects: [],
      });
    }

    const group = courseGroups.get(course.id)!;
    let subjectEntry = group.subjects.find((s) => s.subject.id === subject.id);
    if (!subjectEntry) {
      subjectEntry = { subject, sections: [] };
      group.subjects.push(subjectEntry);
    }
    subjectEntry.sections.push(section);
  }

  // Sort
  const sortedGroups = Array.from(courseGroups.values()).sort((a, b) => 
    a.course.name.localeCompare(b.course.name)
  );
  for (const group of sortedGroups) {
    group.subjects.sort((a, b) => a.subject.name.localeCompare(b.subject.name));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="h-10 w-10">
          <Link href="/administrativo/academico/semestres">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <FolderTree className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Estrutura do Semestre</h1>
              <p className="text-muted-foreground">
                Visualização hierárquica de turmas, disciplinas e cursos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Term Info Card */}
      <Card className="bg-gradient-to-br from-card to-primary/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{term.code}</CardTitle>
                <CardDescription>
                  {formatDateBR(term.start_date)} até {formatDateBR(term.end_date)}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {term.is_current && (
                <Badge variant="default" className="bg-primary text-secondary">
                  Semestre Atual
                </Badge>
              )}
              <Badge variant="outline">
                {sections.length} turmas
              </Badge>
              <Badge variant="outline">
                {sortedGroups.length} cursos
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-8 text-center">
            <p className="font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : sortedGroups.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderTree className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma turma neste semestre</h3>
            <p className="text-muted-foreground mb-4">
              Crie turmas para visualizar a estrutura do semestre.
            </p>
            <Button asChild>
              <Link href="/administrativo/academico/turmas">
                Ir para Turmas
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map((group) => (
            <Card key={group.course.id} className="overflow-hidden">
              {/* Course Header */}
              <CardHeader className="bg-muted/30 border-b">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{group.course.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <span>{group.course.code}</span>
                      <span>•</span>
                      <span>{group.subjects.length} disciplinas neste semestre</span>
                    </CardDescription>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/administrativo/academico/cursos?search=${group.course.code}`}>
                      Ver Curso
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              
              {/* Subjects */}
              <CardContent className="p-0">
                {group.subjects.map((subjectEntry, idx) => (
                  <div 
                    key={subjectEntry.subject.id} 
                    className={`p-4 ${idx !== group.subjects.length - 1 ? 'border-b' : ''}`}
                  >
                    {/* Subject Row */}
                    <div className="flex items-center gap-3 ml-8">
                      <div className="h-8 w-8 rounded-lg bg-secondary/30 flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-secondary-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{subjectEntry.subject.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {subjectEntry.subject.code}
                          </Badge>
                          {subjectEntry.subject.term_number && (
                            <Badge variant="secondary" className="text-xs">
                              {subjectEntry.subject.term_number}º período
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {subjectEntry.subject.credits} créditos • {subjectEntry.sections.length} turma(s)
                        </div>
                      </div>
                    </div>

                    {/* Sections */}
                    <div className="mt-3 ml-16 space-y-2">
                      {subjectEntry.sections.map((section) => (
                        <div 
                          key={section.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center">
                              <Users2 className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div>
                              <span className="font-medium">Turma {section.code}</span>
                              {section.room_default && (
                                <span className="text-muted-foreground ml-2">
                                  • Sala: {section.room_default}
                                </span>
                              )}
                              {section.capacity && (
                                <span className="text-muted-foreground ml-2">
                                  • Cap: {section.capacity}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                              <Link href={`/administrativo/academico/turmas?search=${section.code}`}>
                                Detalhes
                              </Link>
                            </Button>
                            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                              <Link href={`/administrativo/academico/aulas?section_id=${section.id}`}>
                                Aulas
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
