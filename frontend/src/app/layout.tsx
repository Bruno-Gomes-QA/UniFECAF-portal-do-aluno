import type { Metadata } from 'next';
import './globals.css';

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
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
