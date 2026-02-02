'use client';

import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

import { adminUsersApi } from '@/features/admin/users/api';
import { handleApiError } from '@/lib/api/error-handler';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DeleteUserButtonProps {
  userId: string;
  email: string;
  isSuperAdmin?: boolean;
  isSelf?: boolean;
}

export function DeleteUserButton({ userId, email, isSuperAdmin = false, isSelf = false }: DeleteUserButtonProps) {
  const router = useRouter();
  const isDisabled = isSuperAdmin || isSelf;

  let tooltipMessage = 'Remover usuário';
  if (isSuperAdmin) tooltipMessage = 'Super administrador não pode ser excluído';
  if (isSelf) tooltipMessage = 'Você não pode excluir seu próprio usuário';

  if (isDisabled) {
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
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Remover</span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipMessage}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <ConfirmDialog
      title="Remover usuário?"
      description={`Tem certeza que deseja excluir o usuário "${email}"? Esta ação não pode ser desfeita.`}
      confirmLabel="Remover"
      onConfirm={async () => {
        try {
          await adminUsersApi.remove(userId);
          router.refresh();
        } catch (err) {
          handleApiError(err, 'Erro ao remover usuário.');
        }
      }}
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 text-destructive/70 hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
          <span className="sr-only">Remover</span>
        </Button>
      }
    />
  );
}

