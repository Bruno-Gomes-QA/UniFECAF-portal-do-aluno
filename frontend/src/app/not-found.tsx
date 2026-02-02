import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Página não encontrada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A rota solicitada não existe ou foi movida.
          </p>
          <Button asChild>
            <Link href="/">Voltar ao início</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

