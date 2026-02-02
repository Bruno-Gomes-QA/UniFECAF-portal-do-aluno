import { redirect } from 'next/navigation';

// Redirect de /termos para /semestres (renomeado)
export default function AdminTermsPage() {
  redirect('/administrativo/academico/semestres');
}
