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
import { adminNotificationsServer } from '@/features/admin/comm/notifications/api.server';
import { CreateNotificationSheet, DeleteNotificationButton, DeliverNotificationSheet, EditNotificationSheet, ArchiveNotificationButton } from '@/features/admin/comm/notifications/notification-form-sheets';
import { formatNotificationPriority, formatNotificationType } from '@/features/admin/comm/i18n';
import { Bell, Activity, Filter, Search, Lightbulb, Plus, Cog, Send, Eye, Archive, MailOpen } from 'lucide-react';
import Link from 'next/link';
import type { Notification, NotificationStats } from '@/features/admin/comm/notifications/types';

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { page, pageSize, limit, offset } = getPagination(searchParams);
  const search = Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search;
  const type = Array.isArray(searchParams.type) ? searchParams.type[0] : searchParams.type;
  const priority = Array.isArray(searchParams.priority) ? searchParams.priority[0] : searchParams.priority;
  const isArchived = Array.isArray(searchParams.is_archived) ? searchParams.is_archived[0] : searchParams.is_archived;

  let data: { items: Notification[]; total: number } = { items: [], total: 0 };
  let stats: NotificationStats | null = null;
  let error: string | null = null;

  try {
    const [listResult, statsResult] = await Promise.all([
      adminNotificationsServer.list({ 
        limit, 
        offset,
        type: type || undefined,
        priority: priority || undefined,
        is_archived: isArchived === 'true' ? true : isArchived === 'false' ? false : undefined,
        search: search || undefined,
      }),
      adminNotificationsServer.stats(),
    ]);
    data = listResult;
    stats = statsResult;
  } catch (err: any) {
    console.error('Falha ao carregar notificações:', err);
    error = err.message || 'Erro ao carregar dados.';
  }

  const typeOptions = [
    { value: 'ACADEMIC', label: 'Acadêmico' },
    { value: 'FINANCIAL', label: 'Financeiro' },
    { value: 'ADMIN', label: 'Administrativo' },
  ];

  const priorityOptions = [
    { value: 'LOW', label: 'Baixa' },
    { value: 'NORMAL', label: 'Normal' },
    { value: 'HIGH', label: 'Alta' },
  ];

  const archivedOptions = [
    { value: 'false', label: 'Ativas' },
    { value: 'true', label: 'Arquivadas' },
  ];

  return (
    <div className="space-y-6">
      {/* Header com gradiente - Padrão Users */}
      <div className="rounded-xl border bg-gradient-to-br from-card to-secondary/5 p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Bell className="h-32 w-32 text-secondary" />
        </div>
        
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Notificações</h1>
          <p className="text-muted-foreground">Gerencie e envie comunicados aos usuários do sistema.</p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          {stats && (
            <Badge variant="secondary" className="h-10 px-4 gap-2 border-primary/20 shadow-sm font-semibold bg-background/80 backdrop-blur-md text-primary ring-1 ring-primary/10">
              <Activity className="h-4 w-4 text-secondary animate-pulse" />
              {stats.active_notifications} ativas
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
                  Informações sobre o gerenciamento de notificações.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 text-sm text-muted-foreground/90 border-t border-border/50">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Send className="h-3.5 w-3.5 text-secondary" />
                  </div>
                  <p>
                    Use <span className="font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">Entregar</span> para enviar notificações para alunos específicos ou todos de uma vez.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <Archive className="h-3.5 w-3.5 text-accent-foreground" />
                  </div>
                  <p>
                    <span className="font-bold text-foreground bg-accent/20 px-1.5 py-0.5 rounded border border-accent/20">Arquivar</span> notificações antigas para mantê-las no histórico sem poluir a lista principal.
                  </p>
                </div>
                {stats && (
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <MailOpen className="h-3.5 w-3.5 text-green-600" />
                    </div>
                    <p>
                      Taxa de leitura atual: <span className="font-bold text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">{stats.read_rate}%</span> ({stats.total_reads} lidas de {stats.total_deliveries} entregas)
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <CreateNotificationSheet trigger={
            <Button 
              size="icon" 
              className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-secondary border-none shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 active:scale-95 group"
            >
              <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
            </Button>
          } />
        </div>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Bell className="h-4 w-4" />
              Total
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total_notifications}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Send className="h-4 w-4" />
              Entregas
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total_deliveries}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Eye className="h-4 w-4" />
              Leituras
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total_reads}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Archive className="h-4 w-4" />
              Arquivadas
            </div>
            <p className="text-2xl font-bold mt-1">{stats.archived_notifications}</p>
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
                placeholder="Buscar no título ou corpo..." 
                defaultValue={search || ''} 
                className="h-9"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Tipo</Label>
              </div>
              <FiltersSelect name="type" defaultValue={type} allLabel="Todos os tipos" options={typeOptions} />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Prioridade</Label>
              </div>
              <FiltersSelect name="priority" defaultValue={priority} allLabel="Todas" options={priorityOptions} />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Status</Label>
              </div>
              <FiltersSelect name="is_archived" defaultValue={isArchived} allLabel="Todas" options={archivedOptions} />
            </div>

            <Button type="submit" className="sm:ml-auto h-9 gap-2 shadow-sm">
              <Filter className="h-3.5 w-3.5" />
              Filtrar
            </Button>
            <Button asChild variant="ghost" className="h-9">
              <Link href="/administrativo/comunicacao/notificacoes">Limpar</Link>
            </Button>
          </FiltersForm>
        </TooltipProvider>
      </FiltersBar>

      {/* Tabela */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-muted-foreground bg-destructive/5 flex flex-col items-center gap-2">
            <Bell className="h-8 w-8 text-destructive/50 mb-2" />
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
                      <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                      Título
                    </div>
                  </TableHead>
                  <TableHead className="w-[12%]">Tipo</TableHead>
                  <TableHead className="w-[12%]">Prioridade</TableHead>
                  <TableHead className="w-[10%]">
                    <div className="flex items-center gap-2">
                      <Send className="h-3.5 w-3.5 text-muted-foreground" />
                      Entregas
                    </div>
                  </TableHead>
                  <TableHead className="w-[10%]">
                    <div className="flex items-center gap-2">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      Leituras
                    </div>
                  </TableHead>
                  <TableHead className="w-[15%]">Criada em</TableHead>
                  <TableHead className="text-right pr-6">
                    <Cog className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Search className="h-8 w-8 opacity-20" />
                        <p>Nenhuma notificação encontrada.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((n) => (
                    <TableRow key={n.id} className={`group transition-colors hover:bg-muted/30 ${n.is_archived ? 'opacity-60' : ''}`}>
                      <TableCell className="pl-6 py-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground truncate max-w-[250px]" title={n.title || n.body}>
                              {n.title || n.body.slice(0, 50)}
                            </span>
                            {n.is_archived && (
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-medium opacity-70">
                                <Archive className="h-3 w-3 mr-1" />
                                Arquivada
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground truncate opacity-0 group-hover:opacity-100 transition-opacity max-w-[300px]">
                            {n.body.length > 80 ? `${n.body.slice(0, 80)}...` : n.body}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {formatNotificationType(n.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={n.priority === 'HIGH' ? 'destructive' : n.priority === 'LOW' ? 'secondary' : 'default'}
                          className="capitalize"
                        >
                          {formatNotificationPriority(n.priority)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{n.delivered_count}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{n.read_count}</span>
                        {n.delivered_count > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({Math.round(n.read_count / n.delivered_count * 100)}%)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{formatDateTimeBR(n.created_at)}</span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <DeliverNotificationSheet notificationId={n.id} />
                          <EditNotificationSheet notification={n} />
                          <ArchiveNotificationButton notificationId={n.id} isArchived={n.is_archived} />
                          <DeleteNotificationButton notificationId={n.id} />
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
