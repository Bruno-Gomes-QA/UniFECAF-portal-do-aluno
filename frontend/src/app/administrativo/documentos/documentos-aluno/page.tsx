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
import { formatDateTimeBR } from '@/lib/formatters/date';
import { adminStudentDocumentsServer } from '@/features/admin/documents/student-documents/api.server';
import { adminStudentsServer } from '@/features/admin/academics/students/api.server';
import { CreateStudentDocumentSheet, DeleteStudentDocumentButton, EditStudentDocumentSheet } from '@/features/admin/documents/student-documents/student-document-form-sheets';
import { formatDocumentStatus, formatDocumentType } from '@/features/admin/documents/i18n';
import { FileText, Activity, Filter, Search, Lightbulb, Plus, Cog, User, Clock, CheckCircle, AlertCircle, Download } from 'lucide-react';
import Link from 'next/link';
import type { StudentDocument, DocumentStats } from '@/features/admin/documents/student-documents/types';

export default async function AdminStudentDocumentsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { page, pageSize, limit, offset } = getPagination(searchParams);
  const search = Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search;
  const docType = Array.isArray(searchParams.doc_type) ? searchParams.doc_type[0] : searchParams.doc_type;
  const status = Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status;

  let data: { items: StudentDocument[]; total: number } = { items: [], total: 0 };
  let stats: DocumentStats | null = null;
  let students: { items: any[]; total: number } = { items: [], total: 0 };
  let error: string | null = null;

  try {
    const [docsResult, statsResult, studentsResult] = await Promise.all([
      adminStudentDocumentsServer.list({ 
        limit, 
        offset,
        doc_type: docType || undefined,
        status: status || undefined,
        search: search || undefined,
      }),
      adminStudentDocumentsServer.stats(),
      adminStudentsServer.list({ limit: 500, offset: 0 }),
    ]);
    data = docsResult;
    stats = statsResult;
    students = studentsResult;
  } catch (err: any) {
    console.error('Falha ao carregar documentos:', err);
    error = err.message || 'Erro ao carregar dados.';
  }

  const studentOptions = students.items.map((s: any) => ({ id: s.user_id, label: `${s.full_name} (${s.ra})` }));

  const typeOptions = [
    { value: 'DECLARATION', label: 'Declaração' },
    { value: 'STUDENT_CARD', label: 'Carteirinha' },
    { value: 'TRANSCRIPT', label: 'Histórico' },
  ];

  const statusOptions = [
    { value: 'AVAILABLE', label: 'Disponível' },
    { value: 'GENERATING', label: 'Gerando' },
    { value: 'ERROR', label: 'Erro' },
  ];

  const getStatusIcon = (st: string) => {
    switch (st) {
      case 'AVAILABLE': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'GENERATING': return <Clock className="h-4 w-4 text-amber-500 animate-spin" />;
      case 'ERROR': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = (st: string) => {
    switch (st) {
      case 'AVAILABLE': return 'bg-emerald-500';
      case 'GENERATING': return 'bg-amber-500';
      case 'ERROR': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com gradiente - Padrão Users */}
      <div className="rounded-xl border bg-gradient-to-br from-card to-secondary/5 p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <FileText className="h-32 w-32 text-secondary" />
        </div>
        
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Documentos do Aluno</h1>
          <p className="text-muted-foreground">Gerencie solicitações e emissão de documentos.</p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          {stats && (
            <Badge variant="secondary" className="h-10 px-4 gap-2 border-primary/20 shadow-sm font-semibold bg-background/80 backdrop-blur-md text-primary ring-1 ring-primary/10">
              <Activity className="h-4 w-4 text-secondary animate-pulse" />
              {stats.total_documents} documentos
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
                  Informações sobre o gerenciamento de documentos.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 text-sm text-muted-foreground/90 border-t border-border/50">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <p>
                    <span className="font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Disponível</span> indica que o documento está pronto para download.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <p>
                    <span className="font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Gerando</span> significa que o sistema está processando o documento.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                  </div>
                  <p>
                    <span className="font-bold text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">Erro</span> indica falha na geração - tente novamente.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <CreateStudentDocumentSheet 
            students={studentOptions}
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

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <FileText className="h-4 w-4" />
              Total
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total_documents}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Disponíveis
            </div>
            <p className="text-2xl font-bold mt-1">{stats.by_status['AVAILABLE'] || 0}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="h-4 w-4 text-amber-500" />
              Gerando
            </div>
            <p className="text-2xl font-bold mt-1">{stats.generating_count}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Erros
            </div>
            <p className="text-2xl font-bold mt-1">{stats.error_count}</p>
          </div>
        </div>
      )}

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
                placeholder="Título, descrição ou nome do aluno..." 
                defaultValue={search || ''} 
                className="h-9"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Tipo</Label>
              </div>
              <FiltersSelect name="doc_type" defaultValue={docType} allLabel="Todos os tipos" options={typeOptions} />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Status</Label>
              </div>
              <FiltersSelect name="status" defaultValue={status} allLabel="Todos" options={statusOptions} />
            </div>

            <Button type="submit" className="sm:ml-auto h-9 gap-2 shadow-sm">
              <Filter className="h-3.5 w-3.5" />
              Filtrar
            </Button>
            <Button asChild variant="ghost" className="h-9">
              <Link href="/administrativo/documentos/documentos-aluno">Limpar</Link>
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
                  <TableHead className="w-[25%] pl-6">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      Aluno
                    </div>
                  </TableHead>
                  <TableHead className="w-[15%]">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      Tipo
                    </div>
                  </TableHead>
                  <TableHead className="w-[20%]">Título</TableHead>
                  <TableHead className="w-[15%]">Status</TableHead>
                  <TableHead className="w-[15%]">Solicitado em</TableHead>
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
                        <p>Nenhum documento encontrado.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((d) => (
                    <TableRow key={d.id} className="group transition-colors hover:bg-muted/30">
                      <TableCell className="pl-6 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{d.student_name || 'Aluno'}</span>
                          <span className="text-xs text-muted-foreground">{d.student_ra || d.student_id.slice(0, 8)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {formatDocumentType(d.doc_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[180px]" title={d.title || ''}>
                            {d.title || '-'}
                          </span>
                          {d.description && (
                            <span className="text-xs text-muted-foreground truncate max-w-[180px] opacity-0 group-hover:opacity-100 transition-opacity">
                              {d.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${getStatusColor(d.status)}`} />
                          <span className="text-sm">{formatDocumentStatus(d.status)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {d.requested_at ? formatDateTimeBR(d.requested_at) : formatDateTimeBR(d.created_at)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          {d.file_url && d.status === 'AVAILABLE' && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <EditStudentDocumentSheet doc={d} />
                          <DeleteStudentDocumentButton docId={d.id} />
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
