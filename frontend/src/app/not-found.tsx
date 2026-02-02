'use client';

import Link from 'next/link';
import { AlertTriangle, Home, ArrowLeft, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-2xl items-center justify-center px-4">
      <Card className="w-full overflow-hidden border-0 shadow-xl">
        <div className="relative bg-gradient-to-br from-primary/10 via-secondary/5 to-background p-12">
          {/* Background decoration */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-secondary/10 blur-3xl" />
          </div>

          {/* Content */}
          <div className="relative space-y-6 text-center">
            {/* Icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
              <AlertTriangle className="h-10 w-10 text-primary-foreground" />
            </div>

            {/* Error code */}
            <div className="space-y-2">
              <h1 className="text-7xl font-bold tracking-tighter text-primary">404</h1>
              <h2 className="text-2xl font-semibold tracking-tight">Página não encontrada</h2>
            </div>

            {/* Description */}
            <p className="mx-auto max-w-md text-muted-foreground">
              Desculpe, a página que você está procurando não existe ou foi movida para outro endereço.
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link href="/">
                  <Home className="h-4 w-4" />
                  Ir para o início
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </div>

            {/* Help text */}
            <div className="pt-8">
              <p className="text-xs text-muted-foreground">
                Precisa de ajuda? Entre em contato com o suporte
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

