'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { apiBrowser } from '@/lib/api/browser';
import { ApiClientError } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';

export function PayMockButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();

  const pay = async () => {
    try {
      await apiBrowser.post(`/api/v1/me/financial/invoices/${invoiceId}/pay-mock`);
      toast.success('Pagamento mock realizado.');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
        return;
      }
      toast.error('Erro ao pagar boleto.');
    }
  };

  return (
    <Button variant="secondary" size="sm" onClick={pay}>
      Pagar (mock)
    </Button>
  );
}

