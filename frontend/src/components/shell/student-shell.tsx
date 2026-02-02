'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  GraduationCap,
  Search,
  Home,
  Calendar,
  BookOpen,
  Wallet,
  FileText,
  Bell,
  Settings,
  ChevronRight,
  Menu,
  Sparkles,
  Clock,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

import type { AuthMeResponse } from '@/lib/auth/types';
import { UserMenu } from '@/components/shared/user-menu';
import { ServerStatusBadge } from '@/components/shared/server-status-badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { LogoutButton } from '@/components/shared/logout-button';

// --- Configuration ---

type MenuItem = {
  title: string;
  href: string;
  exact?: boolean;
  icon: LucideIcon;
  badge?: string;
  description?: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    title: 'Início',
    href: '/inicio',
    exact: true,
    icon: Home,
    description: 'Visão geral e resumos',
  },
  {
    title: 'Horários',
    href: '/horarios',
    icon: Calendar,
    description: 'Grade de aulas da semana',
  },
  {
    title: 'Notas e Frequência',
    href: '/notas',
    icon: BookOpen,
    description: 'Desempenho acadêmico',
  },
  {
    title: 'Financeiro',
    href: '/financeiro',
    icon: Wallet,
    description: 'Boletos e pagamentos',
  },
  {
    title: 'Documentos',
    href: '/documentos',
    icon: FileText,
    description: 'Declarações e histórico',
  },
  {
    title: 'Notificações',
    href: '/notificacoes',
    icon: Bell,
    description: 'Avisos e comunicados',
  },
  {
    title: 'Configurações',
    href: '/configuracoes',
    icon: Settings,
    description: 'Perfil e preferências',
  },
];

// Itens para navegação mobile (bottom bar)
const BOTTOM_NAV_ITEMS = MENU_ITEMS.slice(0, 5);

type StudentShellProps = {
  user: AuthMeResponse;
  children: React.ReactNode;
};

// --- Components ---

function SidebarLink({
  href,
  icon: Icon,
  children,
  description,
  exact,
  onClick,
}: {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
  description?: string;
  exact?: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300',
        isActive
          ? 'bg-secondary/20 text-secondary font-semibold shadow-sm'
          : 'text-white/60 hover:bg-white/5 hover:text-white'
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg border transition-all',
          isActive
            ? 'border-secondary/40 bg-secondary/15 text-secondary shadow-[0_0_12px_rgba(37,185,121,0.45)]'
            : 'border-white/10 bg-white/5 text-white/50 group-hover:text-secondary group-hover:border-secondary/30 group-hover:bg-secondary/10'
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <span className="block truncate">{children}</span>
        {description && (
          <span className="block text-[10px] text-white/40 truncate group-hover:text-white/50">
            {description}
          </span>
        )}
      </div>
    </Link>
  );
}

function BottomNavLink({
  href,
  icon: Icon,
  children,
  exact,
}: {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center justify-center gap-1 py-2 px-1 text-[10px] font-medium transition-all rounded-lg',
        isActive
          ? 'text-secondary'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
          isActive
            ? 'bg-secondary/15 text-secondary shadow-[0_0_12px_rgba(37,185,121,0.3)]'
            : 'text-muted-foreground'
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <span className="truncate max-w-[60px]">{children}</span>
    </Link>
  );
}

function QuickTips() {
  const tips = [
    {
      icon: Clock,
      title: 'Frequência',
      description: 'Mantenha acima de 75% para aprovação',
    },
    {
      icon: TrendingUp,
      title: 'Média',
      description: 'Nota mínima de 6,0 para aprovação',
    },
    {
      icon: Bell,
      title: 'Notificações',
      description: 'Fique atento aos alertas para novidades',
    },
  ];

  return (
    <div className="p-4 mx-4 mb-4 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-secondary" />
        <span className="text-xs font-semibold text-white/80">Dicas Rápidas</span>
      </div>
      <div className="space-y-2">
        {tips.map((tip) => (
          <div key={tip.title} className="flex items-start gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-secondary/10 mt-0.5">
              <tip.icon className="h-3 w-3 text-secondary" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-white/70">{tip.title}</p>
              <p className="text-[10px] text-white/40">{tip.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SidebarContent({ user, onLinkClick }: { user: AuthMeResponse; onLinkClick?: () => void }) {
  return (
    <div className="flex flex-col h-full text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-8">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary/30 to-secondary/10 border border-secondary/20 shadow-lg">
          <GraduationCap className="h-7 w-7 text-secondary" />
        </span>
        <div className="flex flex-col">
          <span className="font-bold text-xl tracking-tight leading-none mb-1">UniFECAF</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold whitespace-nowrap">
            Portal do Aluno
          </span>
        </div>
      </div>

      {/* User Card */}
      <div className="mx-4 mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/20 text-secondary font-bold text-sm">
            {user.email.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.email.split('@')[0]}</p>
            <Badge className="h-5 text-[9px] bg-secondary/20 text-secondary border-secondary/30 hover:bg-secondary/30">
              Aluno
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4">
        <nav className="space-y-1">
          {MENU_ITEMS.map((item) => (
            <SidebarLink
              key={item.href}
              href={item.href}
              exact={item.exact}
              icon={item.icon}
              description={item.description}
              onClick={onLinkClick}
            >
              {item.title}
            </SidebarLink>
          ))}
        </nav>
      </ScrollArea>

      {/* Quick Tips */}
      <QuickTips />
    </div>
  );
}

function Breadcrumbs() {
  const pathname = usePathname();

  const crumb = useMemo(() => {
    const item = MENU_ITEMS.find((i) =>
      i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(`${i.href}/`)
    );
    return item;
  }, [pathname]);

  if (!crumb) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in slide-in-from-left-2 duration-300">
      <span className="hidden sm:inline-block font-medium">Portal</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
      <span className="font-semibold text-foreground/80">{crumb.title}</span>
    </div>
  );
}

function SearchCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  const filteredItems = useMemo(() => {
    if (!query) return [];
    return MENU_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="relative h-9 w-full justify-start rounded-[0.5rem] bg-muted/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-64 lg:w-80 hover:bg-muted/80 transition-all hidden md:flex"
        >
          <span className="hidden lg:inline-flex">Buscar no portal...</span>
          <span className="inline-flex lg:hidden">Buscar...</span>
          <div className="pointer-events-none absolute right-2 top-2.5 hidden h-4 w-4 select-none items-center opacity-50 sm:flex">
            <Search className="h-4 w-4" />
          </div>
        </Button>
      </DialogTrigger>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground hover:text-foreground">
          <Search className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0 sm:max-w-[500px]">
        <DialogHeader className="px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-sm"
              placeholder="O que você procura?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        </DialogHeader>
        <div className="max-h-[300px] overflow-y-auto px-2 py-2">
          {filteredItems.length === 0 && query ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado.
            </p>
          ) : filteredItems.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Digite para buscar</p>
              <p className="text-xs text-muted-foreground/60">
                Ex: &quot;notas&quot;, &quot;boleto&quot;, &quot;horário&quot;
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-sm hover:bg-secondary/10 hover:text-secondary text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Shell ---

export function StudentShell({ user, children }: StudentShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-[280px] flex-col bg-brand-navy shadow-2xl z-20 rounded-r-[2.5rem] overflow-hidden transition-all duration-300">
        <SidebarContent user={user} />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center justify-between border-b bg-background/95 backdrop-blur px-4 lg:px-6 shadow-sm transition-all supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-4 lg:gap-8 flex-1">
            {/* Mobile Trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden -ml-2 text-muted-foreground hover:text-primary"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[280px] border-r-0 bg-brand-navy">
                <SidebarContent user={user} onLinkClick={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="hidden lg:flex items-center gap-6 flex-1">
              <Breadcrumbs />
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-3">
            <SearchCommand />
            
            <Link href="/notificacoes" className="relative p-2 text-muted-foreground hover:text-foreground transition-colors group">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-background group-hover:scale-110 transition-transform">
                3
              </span>
            </Link>

            <Separator orientation="vertical" className="h-6 mx-2 hidden md:block" />
            <UserMenu user={user} />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-muted/5 pb-20 lg:pb-0">
          <div className="w-full px-4 py-6 lg:px-8 lg:py-8 animate-in fade-in duration-500">
            {children}
          </div>
        </main>

        {/* Bottom Navigation Mobile */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t shadow-lg supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center justify-around px-2 py-1">
            {BOTTOM_NAV_ITEMS.map((item) => (
              <BottomNavLink key={item.href} href={item.href} icon={item.icon} exact={item.exact}>
                {item.title.split(' ')[0]}
              </BottomNavLink>
            ))}
          </div>
        </nav>
      </div>

      {/* Server Status Badge - Ajustado para mobile */}
      <ServerStatusBadge />
    </div>
  );
}