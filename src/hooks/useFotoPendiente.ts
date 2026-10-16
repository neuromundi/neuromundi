/**
 * useFotoPendiente — sube la foto que quedó del registro, en el primer acceso.
 * Se monta una sola vez, en el armazón de la aplicación.
 */
import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { subirFotoPendiente, hayFotoPendiente } from '@/lib/fotoPendiente';

export function useFotoPendiente(): void {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const perfil = useAuthStore((s) => s.profile);
  const refrescar = useAuthStore((s) => s.refreshProfile);
  const hecho = useRef(false);

  useEffect(() => {
    if (!userId || hecho.current || !hayFotoPendiente()) return;
    // Si ya tiene foto, la pendiente sobra: se descarta sin subirla.
    hecho.current = true;
    void (async () => {
      if (perfil?.avatar_url) {
        try { localStorage.removeItem('nm_foto_pendiente'); } catch { /* sin almacenamiento */ }
        return;
      }
      if (await subirFotoPendiente(userId)) await refrescar();
    })();
  }, [userId, perfil?.avatar_url, refrescar]);
}
