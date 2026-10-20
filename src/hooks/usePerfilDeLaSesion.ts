/**
 * usePerfilDeLaSesion — el perfil de quien tiene la sesion abierta, DICIENDO si
 * no se pudo leer.
 *
 * Por que existe (repaso adversario, 20 de octubre de 2026): el almacen de
 * sesion ya guardaba `profileError` desde el hallazgo A-14, pero NADIE lo leia.
 * Cuatro pantallas hacian `if (!profile) return <SkeletonCard />` (o `null`), y
 * un perfil que no se podia leer las dejaba cargando para siempre, sin mensaje
 * y sin forma de reintentar: /ajustes entera, el panel del widget de citas y el
 * de inclusion escolar. La misma familia que el resto del repaso: no fallaba
 * nada, solo se quedaba en blanco.
 */
import { useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';

export function usePerfilDeLaSesion() {
  const perfil = useAuthStore((s) => s.profile);
  const fallo = useAuthStore((s) => s.profileError);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const reintentar = useCallback(() => { void refreshProfile(); }, [refreshProfile]);
  // Solo es fallo si ademas NO hay perfil: si lo hay, lo que fallo fue una
  // relectura posterior y la pantalla puede seguir pintando lo que ya tiene.
  return { perfil, fallo: !perfil && !!fallo, reintentar };
}
