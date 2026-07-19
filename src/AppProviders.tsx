/**
 * AppProviders — providers de raíz.
 *
 * Inicializa el listener de sesión una sola vez y envuelve la app con el sistema
 * de toasts. Mientras la sesión se resuelve, muestra un esqueleto neutro para
 * evitar parpadeos de "no autenticado → autenticado".
 */
import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { ToastProvider, ConfirmProvider } from '@/components/ui';

export function AppProviders({ children }: { children: ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    // initialize() devuelve la función de limpieza (desuscribe el listener).
    const cleanup = initialize();
    return cleanup;
  }, [initialize]);

  return (
    <ToastProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ToastProvider>
  );
}
