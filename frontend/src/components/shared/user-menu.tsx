'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Shield, User, Settings, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

import { apiBrowser } from '@/lib/api/browser';
import { ApiClientError } from '@/lib/api/errors';
import { API_V1 } from '@/lib/api/routes';
import type { AuthMeResponse } from '@/lib/auth/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserMenu({ user }: { user: AuthMeResponse }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await apiBrowser.post<void>(API_V1.auth.logout);
      const isAdminish = user.role === 'ADMIN';
      router.replace(isAdminish ? '/login/administrativo' : '/login');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
        return;
      }
      toast.error('Não foi possível sair. Tente novamente.');
    }
  };

  const initials = user.email
    .split('@')[0]
    .split(/[._-]/g)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative flex items-center gap-3 h-12 px-2 sm:px-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95 shadow-none border-none group"
        >
          <Avatar className="h-9 w-9 border-2 border-primary/10 transition-all shadow-sm ring-primary/5 group-hover:ring-8">
            <AvatarFallback className="bg-primary text-primary-foreground font-black text-xs uppercase">
              {initials || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start text-left hidden md:flex">
             <span className="text-sm font-bold text-foreground leading-tight truncate max-w-[120px]">
               {user.email.split('@')[0]}
             </span>
             <span className="text-[10px] tracking-wider text-muted-foreground font-semibold">
               {user.role === 'ADMIN' ? 'Administrador' : 'Usuário'}
             </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-all duration-300 group-data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        sideOffset={8}
        className="w-72 p-2 shadow-2xl border bg-popover z-[99999]"
      >
        <DropdownMenuLabel className="font-normal p-4">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-bold leading-none text-foreground">{user.email.split('@')[0]}</p>
            <p className="text-xs leading-none text-muted-foreground mt-1 truncate">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="opacity-50" />
        
        <div className="p-1">
          <DropdownMenuSeparator className="my-1 opacity-50" />

          <DropdownMenuItem 
            onSelect={handleLogout} 
            className="flex items-center gap-3 cursor-pointer text-destructive focus:text-white focus:bg-destructive py-3 px-3 rounded-xl group transition-all"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive group-focus:bg-white/20 transition-all">
              <LogOut className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm">Sair da conta</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
