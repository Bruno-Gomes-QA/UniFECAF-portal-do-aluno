'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { apiBrowser } from '@/lib/api/browser';
import { ApiClientError } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';

export function RequestDocumentButton({ docType }: { docType: string }) {
  const router = useRouter();

  const request = async () => {
    try {
      await apiBrowser.post(`/api/v1/me/documents/${docType}/request`);
      toast.success('Documento solicitado.');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
      else toast.error('Erro ao solicitar documento.');
    }
  };

  return (
    <Button variant="secondary" size="sm" onClick={request}>
      Solicitar
    </Button>
  );
}

