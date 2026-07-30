/**
 * Dashboard — enruta al panel correcto según el rol del usuario.
 */
import { useAuth } from '@/hooks/useAuth';
import { SkeletonCard } from '@/components/ui';
import { ParentDashboard } from '@/components/parent';
import { ProviderDashboard } from '@/components/provider';
import { AdminDashboard } from '@/components/admin';

export function Dashboard() {
  const { role, isAdvisor } = useAuth();

  if (!role) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <SkeletonCard rows={2} />
      </div>
    );
  }

  if (role === 'admin') return <AdminDashboard />;
  // Asesor (explorador + moderador de Tribu): panel limitado a métricas y Tribu.
  if (isAdvisor) return <AdminDashboard advisor />;
  if (role === 'provider') return <ProviderDashboard />;
  return <ParentDashboard />;
}
