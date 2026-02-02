'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Controller } from 'react-hook-form';
import { z } from 'zod';
import { Info, Pencil } from 'lucide-react';

import { adminUsersApi } from '@/features/admin/users/api';
import type { AdminUser } from '@/features/admin/users/types';
import { FormDialog } from '@/components/shared/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatUserRole, formatUserStatus } from '@/features/admin/users/i18n';

const createSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(8, 'Mínimo 8 caracteres.'),
  role: z.enum(['STUDENT', 'ADMIN']),
  status: z.enum(['ACTIVE', 'INVITED', 'SUSPENDED']),
});

const updateSchema = z.object({
  password: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().min(8, 'Mínimo 8 caracteres.').optional()
  ),
  role: z.enum(['STUDENT', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'INVITED', 'SUSPENDED']).optional(),
});

export function CreateUserSheet({ trigger }: { trigger?: React.ReactNode }) {
  const router = useRouter();
  const defaultValues = React.useMemo(
    () => ({
      email: '',
      password: '',
      role: 'STUDENT' as const,
      status: 'ACTIVE' as const,
    }),
    []
  );

  return (
    <FormDialog
      title="Novo usuário"
      description="Crie um usuário para acessar o sistema."
      triggerLabel="Novo usuário"
      trigger={trigger}
      schema={createSchema}
      defaultValues={defaultValues}
      onSubmit={async (values) => {
        await adminUsersApi.create(values);
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" placeholder="usuario@fecaf.com.br" {...form.register('email')} />
            <p className="text-xs text-muted-foreground">Será usado para login e notificações.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" {...form.register('password')} />
            <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Perfil</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                        aria-label="Ajuda sobre perfis"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Administrador acessa o painel administrativo. Aluno acessa o portal.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {(['STUDENT', 'ADMIN'] as const).map((role) => (
                        <SelectItem key={role} value={role}>
                          {formatUserRole(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Situação</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                        aria-label="Ajuda sobre situação"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Use “Convidado” para contas recém-criadas e “Suspenso” para bloquear acesso.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {(['ACTIVE', 'INVITED', 'SUSPENDED'] as const).map((status) => (
                        <SelectItem key={status} value={status}>
                          {formatUserStatus(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        </>
      )}
    </FormDialog>
  );
}

export function EditUserSheet({ user }: { user: AdminUser }) {
  const router = useRouter();
  const isSuperAdmin = user.is_superadmin;

  const defaultValues = React.useMemo(
    () => ({
      role: user.role as 'STUDENT' | 'ADMIN',
      status: user.status as 'ACTIVE' | 'INVITED' | 'SUSPENDED',
      password: undefined,
    }),
    [user]
  );

  // Se for superadmin, não permite editar
  if (isSuperAdmin) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground cursor-not-allowed opacity-50"
                disabled
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="sr-only">Editar</span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Super administrador não pode ser modificado</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <FormDialog
      title="Editar usuário"
      description={user.email}
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground">
          <Pencil className="h-3.5 w-3.5" />
          <span className="sr-only">Editar</span>
        </Button>
      }
      schema={updateSchema}
      defaultValues={defaultValues}
      onSubmit={async (values) => {
        const { password, ...rest } = values;
        const payload = password ? { ...rest, password } : rest;
        await adminUsersApi.update(user.id, payload);
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Email não pode ser alterado.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha (opcional)</Label>
            <Input id="password" type="password" {...form.register('password')} />
            <p className="text-xs text-muted-foreground">Preencha apenas se quiser redefinir a senha. Mínimo 8 caracteres.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {(['STUDENT', 'ADMIN'] as const).map((role) => (
                        <SelectItem key={role} value={role}>
                          {formatUserRole(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Situação</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {(['ACTIVE', 'INVITED', 'SUSPENDED'] as const).map((status) => (
                        <SelectItem key={status} value={status}>
                          {formatUserStatus(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        </>
      )}
    </FormDialog>
  );
}
