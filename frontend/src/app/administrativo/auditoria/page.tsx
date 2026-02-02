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
import { ScrollArea } from "@/components/ui/scroll-area";
import { getPagination } from '@/lib/pagination';
import { formatDateTimeBR } from '@/lib/formatters/date';
import { adminAuditServer } from '@/features/admin/audit/api.server';
import { formatAuditAction, formatEntityType } from '@/features/admin/audit/i18n';
import { 
  Shield, 
  Activity, 
  Filter, 
  Search, 
  Lightbulb, 
  Cog, 
  User, 
  Calendar, 
  Globe, 
  Eye,
  AlertTriangle,
  CheckCircle,
  UserX,
  Code,
} from 'lucide-react';
import Link from 'next/link';
import type { AuditLog, AuditStats } from '@/features/admin/audit/types';

type AuditLogDetailDialogProps = {
  log: AuditLog;
};

function AuditLogDetailDialog({ log }: AuditLogDetailDialogProps) {
  const isLoginFailure = log.action === 'USER_LOGIN_FAILED';
  const isDestructive = log.action.includes('DELETED');
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Detalhes do Evento
          </DialogTitle>
          <DialogDescription>
            ID: {log.id} • {formatDateTimeBR(log.created_at)}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Ação</Label>
              <p className="font-medium">{formatAuditAction(log.action)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Ator</Label>
              <p className="font-medium">{log.actor_email || 'Sistema'}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Entidade</Label>
              <p className="font-medium">{formatEntityType(log.entity_type)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">ID da Entidade</Label>
              <p className="font-medium font-mono text-xs">{log.entity_id || '-'}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">IP</Label>
              <p className="font-medium font-mono text-xs">{log.ip || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data/Hora</Label>
              <p className="font-medium">{formatDateTimeBR(log.created_at)}</p>
            </div>
          </div>
          
          {log.user_agent && (
            <div>
              <Label className="text-xs text-muted-foreground">User Agent</Label>
              <p className="text-xs font-mono text-muted-foreground truncate" title={log.user_agent}>
                {log.user_agent}
              </p>
            </div>
          )}
          
          {log.data && Object.keys(log.data).length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-2">
                <Code className="h-3 w-3" />
                Dados Adicionais (JSON)
              </Label>
              <ScrollArea className="h-[200px] mt-2 rounded-md border bg-muted/30">
                <pre className="p-3 text-xs font-mono text-muted-foreground">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { page, pageSize, limit, offset } = getPagination(searchParams);
  const search = Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search;
  const action = Array.isArray(searchParams.action) ? searchParams.action[0] : searchParams.action;
  const entityType = Array.isArray(searchParams.entity_type) ? searchParams.entity_type[0] : searchParams.entity_type;

  let data: { items: AuditLog[]; total: number } = { items: [], total: 0 };
  let stats: AuditStats | null = null;
  let actions: string[] = [];
  let entityTypes: string[] = [];
  let error: string | null = null;

  try {
    const [logsResult, statsResult, actionsResult, entityTypesResult] = await Promise.all([
      adminAuditServer.list({ 
        limit, 
        offset,
        action: action || undefined,
        entity_type: entityType || undefined,
        search: search || undefined,
      }),
      adminAuditServer.stats(30),
      adminAuditServer.getActions(),
      adminAuditServer.getEntityTypes(),
    ]);
    data = logsResult;
    stats = statsResult;
    actions = actionsResult;
    entityTypes = entityTypesResult;
  } catch (err: any) {
    console.error('Falha ao carregar logs de auditoria:', err);
    error = err.message || 'Erro ao carregar dados.';
  }

  const actionOptions = actions.map(a => ({ value: a, label: formatAuditAction(a) }));
  const entityTypeOptions = entityTypes.map(e => ({ value: e, label: formatEntityType(e) }));

  const getActionIcon = (actionStr: string) => {
    if (actionStr.includes('FAILED') || actionStr.includes('ERROR')) {
      return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
    }
    if (actionStr.includes('DELETED')) {
      return <UserX className="h-3.5 w-3.5 text-orange-500" />;
    }
    if (actionStr.includes('CREATED') || actionStr.includes('LOGIN')) {
      return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
    }
    return <Activity className="h-3.5 w-3.5 text-blue-500" />;
  };

  const getActionColor = (actionStr: string) => {
    if (actionStr.includes('FAILED') || actionStr.includes('ERROR')) return 'destructive';
    if (actionStr.includes('DELETED')) return 'outline';
    if (actionStr.includes('CREATED')) return 'default';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      {/* Header com gradiente - Padrão Users */}
      <div className="rounded-xl border bg-gradient-to-br from-card to-secondary/5 p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Shield className="h-32 w-32 text-secondary" />
        </div>
        
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Auditoria</h1>
          <p className="text-muted-foreground">Logs de atividades do sistema para compliance e segurança.</p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          {stats && (
            <Badge variant="secondary" className="h-10 px-4 gap-2 border-primary/20 shadow-sm font-semibold bg-background/80 backdrop-blur-md text-primary ring-1 ring-primary/10">
              <Activity className="h-4 w-4 text-secondary animate-pulse" />
              {stats.total_logs} eventos (30d)
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
                  Dica de Auditoria
                </DialogTitle>
                <DialogDescription>
                  Informações sobre os logs de auditoria.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 text-sm text-muted-foreground/90 border-t border-border/50">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <p>
                    <span className="font-bold text-emerald-600">Ações de criação</span> indicam novos registros no sistema.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                  </div>
                  <p>
                    <span className="font-bold text-red-600">Falhas de login</span> podem indicar tentativas de acesso não autorizado.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Eye className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <p>
                    Clique no ícone <Eye className="inline h-3.5 w-3.5" /> para ver detalhes completos do evento, incluindo dados JSON.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Activity className="h-4 w-4" />
              Total (30d)
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total_logs}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Cog className="h-4 w-4" />
              Ações Únicas
            </div>
            <p className="text-2xl font-bold mt-1">{stats.unique_actions}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <User className="h-4 w-4" />
              Atores Únicos
            </div>
            <p className="text-2xl font-bold mt-1">{stats.unique_actors}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Falhas de Login
            </div>
            <p className="text-2xl font-bold mt-1 text-red-500">{stats.login_failures}</p>
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
                placeholder="Email, IP, entity_id..." 
                defaultValue={search || ''} 
                className="h-9"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Ação</Label>
              </div>
              <FiltersSelect name="action" defaultValue={action} allLabel="Todas" options={actionOptions} />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Entidade</Label>
              </div>
              <FiltersSelect name="entity_type" defaultValue={entityType} allLabel="Todas" options={entityTypeOptions} />
            </div>

            <Button type="submit" className="sm:ml-auto h-9 gap-2 shadow-sm">
              <Filter className="h-3.5 w-3.5" />
              Filtrar
            </Button>
            <Button asChild variant="ghost" className="h-9">
              <Link href="/administrativo/auditoria">Limpar</Link>
            </Button>
          </FiltersForm>
        </TooltipProvider>
      </FiltersBar>

      {/* Tabela */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-muted-foreground bg-destructive/5 flex flex-col items-center gap-2">
            <Shield className="h-8 w-8 text-destructive/50 mb-2" />
            <p className="font-medium text-destructive">{error}</p>
            <p className="text-sm">Tente recarregar a página ou limpar os filtros.</p>
          </div>
        ) : (
          <div className="relative">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-b border-border/60">
                  <TableHead className="w-[20%] pl-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      Data/Hora
                    </div>
                  </TableHead>
                  <TableHead className="w-[25%]">
                    <div className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                      Ação
                    </div>
                  </TableHead>
                  <TableHead className="w-[20%]">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      Ator
                    </div>
                  </TableHead>
                  <TableHead className="w-[15%]">Entidade</TableHead>
                  <TableHead className="w-[10%]">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      IP
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
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Search className="h-8 w-8 opacity-20" />
                        <p>Nenhum log encontrado.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((log) => (
                    <TableRow key={log.id} className="group transition-colors hover:bg-muted/30">
                      <TableCell className="pl-6 py-3">
                        <span className="text-sm font-medium">{formatDateTimeBR(log.created_at)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <Badge variant={getActionColor(log.action)} className="capitalize">
                            {formatAuditAction(log.action)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground truncate max-w-[180px]" title={log.actor_email || 'Sistema'}>
                            {log.actor_email || 'Sistema'}
                          </span>
                          {log.actor_user_id && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {log.actor_user_id.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{formatEntityType(log.entity_type)}</span>
                          {log.entity_id && (
                            <span className="text-xs text-muted-foreground font-mono truncate max-w-[100px]" title={log.entity_id}>
                              {log.entity_id.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-muted-foreground">{log.ip || '-'}</span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <AuditLogDetailDialog log={log} />
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
