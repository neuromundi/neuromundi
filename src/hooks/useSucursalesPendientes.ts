/**
 * useSucursalesPendientes — inserta las sucursales que quedaron del registro,
 * en el primer acceso. Se monta una sola vez, en el armazón de la aplicación.
 * (Auditoría 15 oct 2026, hallazgo M-17.)
 */
import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { insertarSucursalesPendientes, haySucursalesPendientes } from '@/lib/sucursalesPendientes';

export function useSucursalesPendientes(): void {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const hecho = useRef(false);

  useEffect(() => {
    if (!userId || hecho.current || !haySucursalesPendientes()) return;
    hecho.current = true;
    void insertarSucursalesPendientes(userId);
  }, [userId]);
}
