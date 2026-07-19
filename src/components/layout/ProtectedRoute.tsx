/**
 * ProtectedRoute — guarda de rutas que requieren sesión.
 *
 * Mientras la sesión se resuelve muestra un estado neutro; sin sesión redirige a
 * /entrar conservando el destino; con sesión renderiza la ruta hija.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SkeletonCard } from '@/components/ui';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-2xl p-4" aria-busy="true">
        <SkeletonCard rows={2} />
      </div>
    );
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
