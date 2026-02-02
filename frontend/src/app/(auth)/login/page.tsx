import { AuthLoginCard } from '@/components/shared/auth-login-card';

type SearchParams = {
  error?: string;
};

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return <AuthLoginCard variant="student" backendOffline={searchParams.error === 'backend_offline'} />;
}

