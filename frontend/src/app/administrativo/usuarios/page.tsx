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
import { formatDateTimeBR } from '@/lib/formatters/date';
import { apiServer } from '@/lib/api/server';
import { adminUsersServer } from '@/features/admin/users/api.server';
import { CreateUserSheet, EditUserSheet } from '@/features/admin/users/user-form-sheet';
import { DeleteUserButton } from '@/features/admin/users/delete-user-button';
import { formatUserRole, formatUserStatus } from '@/features/admin/users/i18n';
import { Mail, Shield, ShieldCheck, Activity, Calendar, Cog, Filter, Search, Lightbulb, Plus } from 'lucide-react';
import Link from 'next/link';
import type { AdminUser } from '@/features/admin/users/types';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { page, pageSize, limit, offset } = getPagination(searchParams);
  const email = Array.isArray(searchParams.email) ? searchParams.email[0] : searchParams.email;
  const role = Array.isArray(searchParams.role) ? searchParams.role[0] : searchParams.role;
  const status = Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status;

  let data: { items: AdminUser[]; total: number } = { items: [], total: 0 };
  let error: string | null = null;
  let currentUserId: string | null = null;

  try {
    // Buscar usuário atual para verificar self-delete
    const meResponse = await apiServer.get<{ id: string }>('/api/v1/auth/me');
    currentUserId = meResponse.id;

    // Sanitiza parâmetros para evitar erro 422
    data = await adminUsersServer.list({
      limit,
      offset,
      email: email || undefined,
      role: role || undefined,
      status: status || undefined,
    });
  } catch (err: any) {
    console.error('Falha ao listar usuários:', err);
    error = err.message || 'Erro ao carregar dados.';
  }

  const roleOptions = [
    { value: 'STUDENT', label: 'Aluno' },
    { value: 'ADMIN', label: 'Administrador' },
  ];

  const statusOptions = [
    { value: 'ACTIVE', label: 'Ativo' },
    { value: 'INVITED', label: 'Convidado' },
    { value: 'SUSPENDED', label: 'Suspenso' },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-gradient-to-br from-card to-secondary/5 p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Shield className="h-32 w-32 text-secondary" />
        </div>
        
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">Gerencie acessos e permissões do sistema.</p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
            <Badge variant="secondary" className="h-10 px-4 gap-2 border-primary/20 shadow-sm font-semibold bg-background/80 backdrop-blur-md text-primary ring-1 ring-primary/10">
             <Activity className="h-4 w-4 text-secondary animate-pulse" />
             {data.total} usuários
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
                    Informações essenciais sobre os perfis de acesso ao sistema.
                 </DialogDescription>
               </DialogHeader>
               <div className="space-y-4 py-4 text-sm text-muted-foreground/90 border-t border-border/50">
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Shield className="h-3.5 w-3.5 text-secondary" />
                    </div>
                    <p>
                      Use o perfil <span className="font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">Administrador</span> para gestão completa do portal.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                      <Search className="h-3.5 w-3.5 text-accent-foreground" />
                    </div>
                    <p>
                      O perfil de <span className="font-bold text-foreground bg-accent/20 px-1.5 py-0.5 rounded border border-accent/20">Aluno</span> é exclusivo para consulta acadêmica e financeira via portal.
                    </p>
                  </div>
               </div>
             </DialogContent>
           </Dialog>
           <CreateUserSheet trigger={
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
                <Label htmlFor="email" className="font-medium">Email</Label>
              </div>
              <Input 
                id="email" 
                name="email" 
                placeholder="Buscar por email..." 
                defaultValue={email || ''} 
                className="h-9"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Perfil</Label>
              </div>
              <FiltersSelect name="role" defaultValue={role} allLabel="Todos os perfis" options={roleOptions} />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Situação</Label>
              </div>
              <FiltersSelect name="status" defaultValue={status} allLabel="Todas as situações" options={statusOptions} />
            </div>

            <Button type="submit" className="sm:ml-auto h-9 gap-2 shadow-sm">
              <Filter className="h-3.5 w-3.5" />
              Filtrar
            </Button>
            <Button asChild variant="ghost" className="h-9">
              <Link href="/administrativo/usuarios">Limpar</Link>
            </Button>
          </FiltersForm>
        </TooltipProvider>
      </FiltersBar>

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
                <TableHead className="w-[40%] pl-6">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    Email
                  </div>
                </TableHead>
                <TableHead className="w-[20%]">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    Perfil
                  </div>
                </TableHead>
                <TableHead className="w-[20%]">
                  <div className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                    Situação
                  </div>
                </TableHead>
                <TableHead className="w-[20%]">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    Último acesso
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
                      <p>Nenhum usuário encontrado com os filtros atuais.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((u) => (
                  <TableRow key={u.id} className={`group transition-colors hover:bg-muted/30 ${u.is_superadmin ? 'bg-primary/5' : ''}`}>
                    <TableCell className="max-w-[420px] pl-6 py-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground truncate" title={u.email}>{u.email}</span>
                          {u.is_superadmin && (
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-medium border-primary/30 text-primary bg-primary/5">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              Super Admin
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground truncate opacity-0 group-hover:opacity-100 transition-opacity">ID: {u.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.role === 'ADMIN' ? 'default' : 'outline'}
                        className="capitalize shadow-none"
                      >
                        {formatUserRole(u.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${u.status === 'ACTIVE' ? 'bg-emerald-500' : u.status === 'INVITED' ? 'bg-amber-500' : 'bg-red-500'}`} />
                        <span className="text-sm">{formatUserStatus(u.status)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.last_login_at ? (
                        <span className="text-sm font-medium text-muted-foreground">{formatDateTimeBR(u.last_login_at)}</span>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 opacity-50 font-normal">Nunca acessou</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <EditUserSheet user={u} />
                        <DeleteUserButton 
                          userId={u.id} 
                          email={u.email}
                          isSuperAdmin={u.is_superadmin}
                          isSelf={currentUserId === u.id}
                        />
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
