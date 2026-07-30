/**
 * useMembershipGate — cuenta inactiva por falta de pago.
 *
 * Bloquea el panel cuando la cuota NO está cubierta, ya sea el primer pago
 * (estado 'pending' con el periodo de gracia agotado) o la renovación
 * ('past_due'). No afecta a administradores, a exentos ni a pacientes y
 * familias, cuya membresía es gratuita.
 *
 * Mientras está bloqueado consulta el perfil periódicamente y al volver a la
 * pestaña; en cuanto la plataforma detecta el pago, desbloquea solo y avisa con
 * `justReactivated` para dar las gracias al usuario.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMembership } from '@/hooks/useMembership';
import { useAuthStore } from '@/stores/authStore';

const POLL_MS = 20000;

export function useMembershipGate() {
  const { isAuthenticated, isAdmin, isAdvisor, role, providerType } = useAuth();
  const { status, daysLeft, loading, reload } = useMembership();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [justReactivated, setJustReactivated] = useState(false);
  const wasBlocked = useRef(false);

  // Solo pagan cuota los prestadores (servicios, comercios, escuelas). Las
  // Empresas inclusivas (provider_type='company') son SIEMPRE gratuitas.
  const mustPay = isAuthenticated && !isAdmin && !isAdvisor && role === 'provider' && providerType !== 'company';
  const graceOver = status === 'pending' && (daysLeft ?? 0) <= 0;
  const blocked = mustPay && !loading && (status === 'past_due' || graceOver);

  // Sondeo mientras está bloqueado: el pago lo confirma el webhook de Stripe,
  // así que el cambio llega por la base y no por esta pestaña.
  useEffect(() => {
    if (!blocked) return;
    const check = () => { void reload(); };
    const id = setInterval(check, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
    };
  }, [blocked, reload]);

  // Transición bloqueado -> al corriente: reactivación.
  useEffect(() => {
    if (blocked) {
      wasBlocked.current = true;
      return;
    }
    if (wasBlocked.current && (status === 'active' || status === 'exempt')) {
      wasBlocked.current = false;
      setJustReactivated(true);
      void refreshProfile();
    }
  }, [blocked, status, refreshProfile]);

  const dismissReactivated = useCallback(() => setJustReactivated(false), []);

  return { blocked, justReactivated, dismissReactivated, status, daysLeft };
}
