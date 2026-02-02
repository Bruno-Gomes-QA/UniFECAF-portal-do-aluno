'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

import { apiBrowser } from '@/lib/api/browser';
import { ApiClientError } from '@/lib/api/errors';
import { API_V1 } from '@/lib/api/routes';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type LogoutButtonProps = {
  redirectTo?: string;
  className?: string;
};

export function LogoutButton({ redirectTo = '/login', className }: LogoutButtonProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await apiBrowser.post<void>(API_V1.auth.logout);
      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
        return;
      }
      toast.error('Não foi possível sair. Tente novamente.');
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleLogout}
      className={cn('w-full justify-start gap-2', className)}
    >
      <LogOut className="h-4 w-4" />
      Sair
    </Button>
  );
}

