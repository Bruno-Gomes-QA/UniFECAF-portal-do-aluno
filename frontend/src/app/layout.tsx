import type { Metadata } from 'next';
import './globals.css';

import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'Portal do Aluno - UniFECAF',
  description: 'Portal do Aluno da UniFECAF - Acesse suas notas, frequência, financeiro e mais.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
