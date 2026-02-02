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
import { adminTermsServer } from '@/features/admin/academics/terms/api.server';
import { CreateTermSheet, EditTermSheet, DeleteTermButton, GenerateSessionsSheet, SetCurrentTermButton } from '@/features/admin/academics/terms/term-form-sheets';
import type { Term } from '@/features/admin/academics/terms/types';
import { Calendar, Activity, Filter, Search, Lightbulb, Plus, Cog, Star, FolderTree, GraduationCap } from 'lucide-react';
import Link from 'next/link';

export default async function AdminSemestresPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { page, pageSize, limit, offset } = getPagination(searchParams);
  const search = Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search;
  const isCurrent = Array.isArray(searchParams.is_current) ? searchParams.is_current[0] : searchParams.is_current;

  let data: { items: Term[]; total: number } = { items: [], total: 0 };
  let error: string | null = null;

  try {
    data = await adminTermsServer.list({ limit, offset });
  } catch (err: any) {
    console.error('Falha ao carregar semestres:', err);
    error = err.message || 'Erro ao carregar dados.';
  }

  // Filter by search and is_current
  let filteredItems = data.items;
  if (search) {
    const s = search.toLowerCase();
    filteredItems = filteredItems.filter(t => t.code.toLowerCase().includes(s));
  }
  if (isCurrent === 'true') {
    filteredItems = filteredItems.filter(t => t.is_current);
  } else if (isCurrent === 'false') {
    filteredItems = filteredItems.filter(t => !t.is_current);
  }

  const currentOptions = [
    { value: 'true', label: 'Apenas atual' },
    { value: 'false', label: 'Não atuais' },
  ];

  return (
    <div className="space-y-6">
      {/* Header com gradiente - Padrão Users */}
      <div className="rounded-xl border bg-gradient-to-br from-card to-secondary/5 p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Calendar className="h-32 w-32 text-secondary" />
        </div>
        
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Semestres</h1>
          <p className="text-muted-foreground">Gerencie os períodos letivos do sistema acadêmico.</p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Badge variant="secondary" className="h-10 px-4 gap-2 border-primary/20 shadow-sm font-semibold bg-background/80 backdrop-blur-md text-primary ring-1 ring-primary/10">
            <Activity className="h-4 w-4 text-secondary animate-pulse" />
            {data.total} semestres
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
                  Informações sobre o gerenciamento de semestres.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 text-sm text-muted-foreground/90 border-t border-border/50">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Star className="h-3.5 w-3.5 text-secondary" />
                  </div>
                  <p>
                    O <span className="font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">semestre atual</span> é usado como padrão em diversas telas do sistema.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <FolderTree className="h-3.5 w-3.5 text-accent-foreground" />
                  </div>
                  <p>
                    Use <span className="font-bold text-foreground bg-accent/20 px-1.5 py-0.5 rounded border border-accent/20">Ver Estrutura</span> para visualizar turmas, disciplinas e cursos do semestre.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <GraduationCap className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <p>
                    <span className="font-bold text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">Gerar Aulas</span> cria automaticamente sessões a partir dos horários das turmas.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <CreateTermSheet trigger={
            <Button 
              size="icon" 
              className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-secondary border-none shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 active:scale-95 group"
            >
              <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
            </Button>
          } />
        </div>
      </div>

      {/* Filtros */}
      <FiltersBar>
        <TooltipProvider>
          <FiltersForm>
            <div className="grid flex-1 gap-2">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="search" className="font-medium">Código</Label>
              </div>
              <Input 
                id="search" 
                name="search" 
                placeholder="Buscar por código (ex: 2025-1)..." 
                defaultValue={search || ''} 
                className="h-9"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Status</Label>
              </div>
              <FiltersSelect name="is_current" defaultValue={isCurrent} allLabel="Todos" options={currentOptions} />
            </div>

            <Button type="submit" className="sm:ml-auto h-9 gap-2 shadow-sm">
              <Filter className="h-3.5 w-3.5" />
              Filtrar
            </Button>
            <Button asChild variant="ghost" className="h-9">
              <Link href="/administrativo/academico/semestres">Limpar</Link>
            </Button>
          </FiltersForm>
        </TooltipProvider>
      </FiltersBar>

      {/* Tabela */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-muted-foreground bg-destructive/5 flex flex-col items-center gap-2">
            <Calendar className="h-8 w-8 text-destructive/50 mb-2" />
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
                      Código
                    </div>
                  </TableHead>
                  <TableHead className="w-[15%]">Início</TableHead>
                  <TableHead className="w-[15%]">Fim</TableHead>
                  <TableHead className="w-[15%]">
                    <div className="flex items-center gap-2">
                      <Star className="h-3.5 w-3.5 text-muted-foreground" />
                      Status
                    </div>
                  </TableHead>
                  <TableHead className="w-[15%]">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                      Turmas
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
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Search className="h-8 w-8 opacity-20" />
                        <p>Nenhum semestre encontrado.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((t) => (
                    <TableRow key={t.id} className={`group transition-colors hover:bg-muted/30 ${t.is_current ? 'bg-primary/5' : ''}`}>
                      <TableCell className="pl-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{t.code}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDateBR(t.start_date)}</TableCell>
                      <TableCell>{formatDateBR(t.end_date)}</TableCell>
                      <TableCell>
                        {t.is_current ? (
                          <Badge variant="default" className="bg-primary text-secondary shadow-sm">
                            <Star className="h-3 w-3 mr-1" />
                            Atual
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium">
                          {t.sections_count || 0} turmas
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
                            <Link href={`/administrativo/academico/semestres/${t.id}/estrutura`}>
                              <FolderTree className="h-3.5 w-3.5 mr-1" />
                              Estrutura
                            </Link>
                          </Button>
                          <GenerateSessionsSheet term={t} />
                          {!t.is_current && <SetCurrentTermButton termId={t.id} code={t.code} />}
                          <EditTermSheet term={t} />
                          <DeleteTermButton termId={t.id} code={t.code} />
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
