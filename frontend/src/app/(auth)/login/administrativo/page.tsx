import { AuthLoginCard } from '@/components/shared/auth-login-card';

type SearchParams = {
  error?: string;
};

export default function AdminLoginPage({ searchParams }: { searchParams: SearchParams }) {
  return <AuthLoginCard variant="admin" backendOffline={searchParams.error === 'backend_offline'} />;
}
