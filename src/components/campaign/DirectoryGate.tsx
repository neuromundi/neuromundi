/**
 * DirectoryGate — envuelve las rutas del directorio (/directorio, /buscar,
 * /proveedor/:id) durante la campaña de pre-registro. Si el directorio está
 * bloqueado para el país del visitante (admin y asesor exentos), muestra la
 * pantalla de bloqueo en vez del contenido; los hijos NO se montan mientras esté
 * bloqueado, así que no se disparan sus hooks ni sus consultas.
 */
import type { ReactNode } from 'react';
import { useDirectoryLock } from '@/hooks/useCampaign';
import { DirectoryLockedScreen } from './DirectoryLockedScreen';

export function DirectoryGate({ children }: { children: ReactNode }) {
  const { locked, unlockAt, loading } = useDirectoryLock();
  if (loading) return null;
  if (locked) return <div className="mx-auto max-w-5xl px-4 py-6"><DirectoryLockedScreen unlockAt={unlockAt} /></div>;
  return <>{children}</>;
}
