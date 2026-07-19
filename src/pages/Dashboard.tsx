/**
 * Dashboard — enruta al panel correcto según el rol del usuario.
 */
import { useAuth } from '@/hooks/useAuth';
import { SkeletonCard } from '@/components/ui';
import { ParentDashboard } from '@/components/parent';
import { ProviderDashboard } from '@/components/provider';
import { AdminDashboard } from '@/components/admin';

export function Dashboard() {
  const { role } = useAuth();

  if (!role) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <SkeletonCard rows={2} />
      </div>
    );
  }

  if (role === 'admin') return <AdminDashboard />;
  if (role === 'provider') return <ProviderDashboard />;
  return <ParentDashboard />;
}
