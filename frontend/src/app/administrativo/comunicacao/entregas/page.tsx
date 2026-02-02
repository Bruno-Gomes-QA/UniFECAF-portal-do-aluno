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
import { adminUserNotificationsApi } from '@/features/admin/comm/user-notifications/api';
import { Send, Activity, Filter, Search, Lightbulb, Cog, User, Bell, Eye, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import type { UserNotification } from '@/features/admin/comm/user-notifications/types';

export default async function AdminUserNotificationsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { page, pageSize, limit, offset } = getPagination(searchParams);
  const search = Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search;
  const userId = Array.isArray(searchParams.user_id) ? searchParams.user_id[0] : searchParams.user_id;
  const unreadOnlyRaw = Array.isArray(searchParams.unread_only) ? searchParams.unread_only[0] : searchParams.unread_only;
  const unreadOnly = unreadOnlyRaw === 'true';

  let data: { items: UserNotification[]; total: number } = { items: [], total: 0 };
  let error: string | null = null;

  try {
    data = await adminUserNotificationsApi.list({
      limit,
      offset,
      user_id: userId || undefined,
      unread_only: unreadOnly ? true : undefined,
      search: search || undefined,
    });
  } catch (err: any) {
    console.error('Falha ao carregar entregas:', err);
    error = err.message || 'Erro ao carregar dados.';
  }

  const statusOptions = [
    { value: 'true', label: 'Apenas não lidas' },
  ];

  return (
    <div className="space-y-6">
      {/* Header com gradiente - Padrão Users */}
      <div className="rounded-xl border bg-gradient-to-br from-card to-secondary/5 p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Send className="h-32 w-32 text-secondary" />
        </div>
        
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Entregas</h1>
          <p className="text-muted-foreground">Acompanhe o status de entrega e leitura das notificações.</p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Badge variant="secondary" className="h-10 px-4 gap-2 border-primary/20 shadow-sm font-semibold bg-background/80 backdrop-blur-md text-primary ring-1 ring-primary/10">
            <Activity className="h-4 w-4 text-secondary animate-pulse" />
            {data.total} entregas
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
                  Informações sobre o acompanhamento de entregas.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 text-sm text-muted-foreground/90 border-t border-border/50">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Eye className="h-3.5 w-3.5 text-secondary" />
                  </div>
                  <p>
                    <span className="font-bold text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">Lida</span> indica que o usuário abriu a notificação no portal.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <Clock className="h-3.5 w-3.5 text-accent-foreground" />
                  </div>
                  <p>
                    <span className="font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Não lida</span> significa que a notificação foi entregue mas não visualizada.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <p>
                    Use a busca por <span className="font-bold text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">nome ou email</span> para encontrar entregas específicas.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
                placeholder="Nome ou email do usuário..." 
                defaultValue={search || ''} 
                className="h-9"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="user_id" className="font-medium">ID Usuário</Label>
              </div>
              <Input 
                id="user_id" 
                name="user_id" 
                placeholder="UUID do usuário..." 
                defaultValue={userId || ''} 
                className="h-9"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Leitura</Label>
              </div>
              <FiltersSelect name="unread_only" defaultValue={unreadOnly ? 'true' : ''} allLabel="Todas" options={statusOptions} />
            </div>

            <Button type="submit" className="sm:ml-auto h-9 gap-2 shadow-sm">
              <Filter className="h-3.5 w-3.5" />
              Filtrar
            </Button>
            <Button asChild variant="ghost" className="h-9">
              <Link href="/administrativo/comunicacao/entregas">Limpar</Link>
            </Button>
          </FiltersForm>
        </TooltipProvider>
      </FiltersBar>

      {/* Tabela */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-muted-foreground bg-destructive/5 flex flex-col items-center gap-2">
            <Send className="h-8 w-8 text-destructive/50 mb-2" />
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
                      Usuário
                    </div>
                  </TableHead>
                  <TableHead className="w-[25%]">
                    <div className="flex items-center gap-2">
                      <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                      Notificação
                    </div>
                  </TableHead>
                  <TableHead className="w-[20%]">Entregue em</TableHead>
                  <TableHead className="w-[15%]">
                    <div className="flex items-center gap-2">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
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
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Search className="h-8 w-8 opacity-20" />
                        <p>Nenhuma entrega encontrada.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((n) => (
                    <TableRow key={n.id} className="group transition-colors hover:bg-muted/30">
                      <TableCell className="pl-6 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{n.user_name || 'Usuário'}</span>
                          <span className="text-xs text-muted-foreground">{n.user_email || n.user_id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[200px]" title={n.notification_title || ''}>
                            {n.notification_title || '(sem título)'}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                            {n.notification_id.slice(0, 8)}...
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{formatDateTimeBR(n.delivered_at)}</span>
                      </TableCell>
                      <TableCell>
                        {n.read_at ? (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            <div className="flex flex-col">
                              <span className="text-sm text-emerald-600 font-medium">Lida</span>
                              <span className="text-xs text-muted-foreground">{formatDateTimeBR(n.read_at)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-amber-500" />
                            <span className="text-sm text-amber-600 font-medium">Não lida</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {n.action_url && (
                          <Badge variant="outline" className="text-xs">
                            {n.action_label || 'Ação'}
                          </Badge>
                        )}
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
