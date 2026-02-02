'use client';

import { useState, useEffect } from 'react';
import { Activity, AlertCircle, CheckCircle, XCircle, Server, Clock, Database, Wifi } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type ServerStatus = {
  backend: 'online' | 'offline' | 'checking';
  frontend: 'online';
  lastCheck: string;
  backendUrl: string;
  frontendVersion: string;
  uptime: string;
};

export function ServerStatusBadge() {
  const [status, setStatus] = useState<ServerStatus>({
    backend: 'checking',
    frontend: 'online',
    lastCheck: new Date().toISOString(),
    backendUrl: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000',
    frontendVersion: '1.0.0',
    uptime: '0s',
  });
  const [open, setOpen] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`${status.backendUrl}/health`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        
        clearTimeout(timeoutId);
        
        setStatus(prev => ({
          ...prev,
          backend: response.ok ? 'online' : 'offline',
          lastCheck: new Date().toISOString(),
        }));
      } catch (error) {
        setStatus(prev => ({
          ...prev,
          backend: 'offline',
          lastCheck: new Date().toISOString(),
        }));
      }
    };

    const updateUptime = () => {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      let uptime = '';
      if (hours > 0) uptime = `${hours}h ${minutes % 60}m`;
      else if (minutes > 0) uptime = `${minutes}m ${seconds % 60}s`;
      else uptime = `${seconds}s`;
      
      setStatus(prev => ({ ...prev, uptime }));
    };

    // Check immediately
    checkBackendStatus();
    updateUptime();

    // Check backend every 30 seconds
    const backendInterval = setInterval(checkBackendStatus, 30000);
    
    // Update uptime every second
    const uptimeInterval = setInterval(updateUptime, 1000);

    return () => {
      clearInterval(backendInterval);
      clearInterval(uptimeInterval);
    };
  }, [status.backendUrl, startTime]);

  const badgeVariant = status.backend === 'online' ? 'success' : status.backend === 'offline' ? 'destructive' : 'secondary';
  const BadgeIcon = status.backend === 'online' ? CheckCircle : status.backend === 'offline' ? XCircle : Activity;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed z-50 h-auto py-1.5 px-3 rounded-full shadow-lg border",
          // Visibilidade: Oculto no mobile (a menos que offline), visível no desktop
          status.backend !== 'offline' ? "hidden lg:inline-flex" : "inline-flex",
          // Desktop: canto inferior esquerdo
          "lg:bottom-4 lg:left-4",
          // Mobile: acima da bottom bar
          "bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-4",
          status.backend === 'online' && "bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-green-700",
          status.backend === 'offline' && "bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-700 animate-pulse",
          status.backend === 'checking' && "bg-gray-500/10 hover:bg-gray-500/20 border-gray-500/30 text-gray-700"
        )}
      >
        <BadgeIcon className="h-3 w-3 mr-1.5" />
        <span className="text-xs font-medium">
          {status.backend === 'online' && 'Sistema Online'}
          {status.backend === 'offline' && 'Sistema Offline'}
          {status.backend === 'checking' && 'Verificando...'}
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Status do Sistema
            </DialogTitle>
            <DialogDescription>
              Informações sobre a disponibilidade dos serviços
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Backend Status */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                <Database className={cn(
                  "h-5 w-5",
                  status.backend === 'online' && "text-green-600",
                  status.backend === 'offline' && "text-red-600",
                  status.backend === 'checking' && "text-gray-600"
                )} />
                <div>
                  <p className="text-sm font-medium">Backend API</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                    Versão 1.0.0
                  </p>
                </div>
              </div>
              <Badge variant={badgeVariant} className="gap-1">
                <BadgeIcon className="h-3 w-3" />
                {status.backend === 'online' && 'Online'}
                {status.backend === 'offline' && 'Offline'}
                {status.backend === 'checking' && 'Verificando'}
              </Badge>
            </div>

            {/* Frontend Status */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                <Wifi className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Frontend Web</p>
                  <p className="text-xs text-muted-foreground">
                    Versão {status.frontendVersion}
                  </p>
                </div>
              </div>
              <Badge variant="success" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Online
              </Badge>
            </div>

            {/* System Info */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Última verificação
                </span>
                <span className="font-mono">
                  {new Date(status.lastCheck).toLocaleTimeString('pt-BR')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  Tempo de atividade
                </span>
                <span className="font-mono">{status.uptime}</span>
              </div>
            </div>

            {/* Error Message */}
            {status.backend === 'offline' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-medium text-destructive mb-1">Servidor Backend Offline</p>
                  <p className="text-muted-foreground mb-2">
                    Não foi possível conectar ao servidor. Verifique se o backend está em execução.
                  </p>
                  <p className="text-muted-foreground">
                    Entre em contato com o suporte: <span className="font-mono font-semibold text-foreground">(11) 94722-9703</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
