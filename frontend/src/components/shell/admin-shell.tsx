'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  GraduationCap, 
  Search, 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Wallet, 
  MessageSquare, 
  FileText, 
  ShieldAlert,
  Calendar,
  BookOpenCheck,
  Layers,
  Clock,
  ClipboardList,
  ClipboardCheck,
  PenSquare,
  Award,
  Receipt,
  CreditCard,
  Bell,
  Send,
  FolderOpen,
  ChevronRight,
  Menu,
  type LucideIcon
} from 'lucide-react';

import type { AuthMeResponse } from '@/lib/auth/types';
import { UserMenu } from '@/components/shared/user-menu';
import { ServerStatusBadge } from '@/components/shared/server-status-badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { LogoutButton } from '@/components/shared/logout-button';

// --- Configuration ---

type MenuItem = {
  title: string;
  href: string;
  exact?: boolean;
  icon: LucideIcon;
};

type MenuGroup = {
  id: string;
  title: string;
  icon: LucideIcon;
  items: MenuItem[];
};

const MENU_GROUPS: MenuGroup[] = [
  {
    id: 'geral',
    title: 'Geral',
    icon: LayoutDashboard,
    items: [
      { title: 'Dashboard', href: '/administrativo', exact: true, icon: LayoutDashboard },
      { title: 'Usuários', href: '/administrativo/usuarios', icon: Users },
      { title: 'Alunos', href: '/administrativo/alunos', icon: GraduationCap },
    ],
  },
  {
    id: 'academico',
    title: 'Acadêmico',
    icon: BookOpen,
    items: [
      { title: 'Semestres', href: '/administrativo/academico/semestres', icon: Calendar },
      { title: 'Cursos', href: '/administrativo/academico/cursos', icon: BookOpenCheck },
      { title: 'Disciplinas', href: '/administrativo/academico/disciplinas', icon: Layers },
      { title: 'Turmas', href: '/administrativo/academico/turmas', icon: BookOpen },
      { title: 'Aulas', href: '/administrativo/academico/aulas', icon: Clock },
      { title: 'Matrículas', href: '/administrativo/academico/matriculas', icon: ClipboardList },
      { title: 'Presenças', href: '/administrativo/academico/presencas', icon: ClipboardCheck },
      { title: 'Avaliações', href: '/administrativo/academico/avaliacoes', icon: PenSquare },
      { title: 'Notas de Avaliações', href: '/administrativo/academico/notas-avaliacoes', icon: Award },
      { title: 'Notas Finais', href: '/administrativo/academico/notas-finais', icon: BookOpenCheck },
    ],
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    icon: Wallet,
    items: [
      { title: 'Faturas', href: '/administrativo/financeiro/faturas', icon: Receipt },
      { title: 'Pagamentos', href: '/administrativo/financeiro/pagamentos', icon: CreditCard },
    ],
  },
  {
    id: 'comunicacao',
    title: 'Comunicação',
    icon: MessageSquare,
    items: [
      { title: 'Notificações', href: '/administrativo/comunicacao/notificacoes', icon: Bell },
      { title: 'Entregas', href: '/administrativo/comunicacao/entregas', icon: Send },
    ],
  },
  {
    id: 'documentos',
    title: 'Documentos',
    icon: FileText,
    items: [
      { title: 'Documentos do Aluno', href: '/administrativo/documentos/documentos-aluno', icon: FolderOpen },
    ],
  },
  {
    id: 'auditoria',
    title: 'Auditoria',
    icon: ShieldAlert,
    items: [
      { title: 'Auditoria', href: '/administrativo/auditoria', icon: ShieldAlert },
    ],
  },
];

type AdminShellProps = {
  user: AuthMeResponse;
  children: React.ReactNode;
};

// --- Components ---

function SidebarLink({
  href,
  icon: Icon,
  children,
  exact,
  onClick,
}: {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
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
        'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-300',
        isActive
          ? 'bg-secondary/20 text-secondary font-semibold shadow-sm'
          : 'text-white/60 hover:bg-white/5 hover:text-white'
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg border transition-all',
          isActive
            ? 'border-secondary/40 bg-secondary/15 text-secondary shadow-[0_0_12px_rgba(37,185,121,0.45)]'
            : 'border-white/10 bg-white/5 text-white/50 group-hover:text-secondary group-hover:border-secondary/30 group-hover:bg-secondary/10'
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="truncate">{children}</span>
    </Link>
  );
}

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  return (
    <div className="flex flex-col h-full text-white">
      <div className="flex items-center gap-3 px-6 py-8">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary/30 to-secondary/10 border border-secondary/20 shadow-lg">
          <GraduationCap className="h-7 w-7 text-secondary" />
        </span>
        <div className="flex flex-col">
          <span className="font-bold text-xl tracking-tight leading-none mb-1">UniFECAF</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold whitespace-nowrap">Portal Administrativo</span>
        </div>
      </div>
      
      <ScrollArea className="flex-1 px-4 pb-6">
        <Accordion type="multiple" className="w-full space-y-2">
          {MENU_GROUPS.map((group) => (
            <AccordionItem key={group.id} value={group.id} className="border-none">
              <AccordionTrigger className="group flex items-center gap-3 rounded-lg px-3 py-2 text-white/80 transition-all hover:bg-white/5 hover:text-white hover:no-underline data-[state=open]:bg-white/5 data-[state=open]:text-white">
                <div className="flex items-center gap-3">
                  <group.icon className="h-4 w-4 text-secondary/70 group-hover:text-secondary group-data-[state=open]:text-secondary" />
                  <span className="font-medium text-sm">{group.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-2 pt-1 pl-4">
                <div className="ml-2 mt-1 space-y-1 border-l border-white/10 pl-2">
                  {group.items.map((item) => (
                    <SidebarLink
                      key={item.href}
                      href={item.href}
                      exact={item.exact}
                      icon={item.icon}
                      onClick={onLinkClick}
                    >
                      {item.title}
                    </SidebarLink>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>
    </div>
  );
}

function Breadcrumbs() {
  const pathname = usePathname();
  
  const crumbs = useMemo(() => {
    // Find active group and item
    for (const group of MENU_GROUPS) {
      const item = group.items.find(i => 
        i.exact 
          ? pathname === i.href 
          : pathname === i.href || pathname.startsWith(`${i.href}/`)
      );
      if (item) {
        return { group, item };
      }
    }
    return null;
  }, [pathname]);

  if (!crumbs) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in slide-in-from-left-2 duration-300">
      <span className="hidden sm:inline-block font-medium">Administrativo</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
      <span className="hidden sm:inline-block">{crumbs.group.title}</span>
      <ChevronRight className="hidden sm:inline-block h-4 w-4 text-muted-foreground/50" />
      <span className="font-semibold text-foreground/80">{crumbs.item.title}</span>
    </div>
  );
}

function SearchCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  const filteredItems = useMemo(() => {
    if (!query) return [];
    return MENU_GROUPS.flatMap(group => 
      group.items.filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) || 
        group.title.toLowerCase().includes(query.toLowerCase())
      ).map(item => ({ ...item, group: group.title }))
    );
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative h-9 w-full justify-start rounded-[0.5rem] bg-muted/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-64 lg:w-80 hover:bg-muted/80 transition-all">
          <span className="hidden lg:inline-flex">Buscar menu...</span>
          <span className="inline-flex lg:hidden">Buscar...</span>
          <div className="pointer-events-none absolute right-2 top-2.5 hidden h-4 w-4 select-none items-center opacity-50 sm:flex">
            <Search className="h-4 w-4" />
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0 sm:max-w-[500px]">
        <DialogHeader className="px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input 
              className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-sm"
              placeholder="Digite para buscar..."
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
            <p className="py-6 text-center text-sm text-muted-foreground">
              Comece a digitar para buscar nos menus.
            </p>
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
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary/10 text-secondary">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span>{item.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.group}</span>
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

export function AdminShell({ user, children }: AdminShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-[280px] flex-col bg-brand-navy shadow-2xl z-20 rounded-r-[2.5rem] overflow-hidden transition-all duration-300">
        <SidebarContent />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center justify-between border-b bg-background/95 backdrop-blur px-6 shadow-sm transition-all supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-4 lg:gap-8 flex-1">
            {/* Mobile Trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden -ml-2 text-muted-foreground hover:text-primary">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[280px] border-r-0 bg-brand-navy">
                <SidebarContent />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-6 flex-1">
              <Breadcrumbs />
              <div className="hidden md:block">
                <SearchCommand />
              </div>
            </div>
          </div>
        
          <div className="flex items-center gap-4">
            <div className="md:hidden">
              <Button variant="ghost" size="icon">
                <Search className="h-5 w-5" />
              </Button>
            </div>
            <Separator orientation="vertical" className="h-6 hidden md:block" />
            <UserMenu user={user} />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-muted/5">
          <div className="w-full px-6 py-8 lg:px-12 animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>

      {/* Server Status Badge */}
      <ServerStatusBadge />
    </div>
  );
}
