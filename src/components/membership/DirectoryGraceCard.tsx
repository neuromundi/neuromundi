/**
 * DirectoryGraceCard — aviso en el panel del prestador: si no COMPLETA y PAGA su
 * perfil dentro de los 30 días desde que lo reclamó o lo creó, dejará de aparecer
 * en el directorio y en las búsquedas (solo se mostrará su nombre/razón social).
 *
 * Se muestra solo a prestadores con membresía 'pending' (sin pagar) cuyo plazo de
 * 30 días aún no vence. Fundadores (gracia de 3 meses) y empresas (exentas) NO la
 * ven: el padre la monta de forma excluyente. La lógica de VISIBILIDAD real la
 * aplica la vista directorio_publico (migración 0132); esta tarjeta es el aviso.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, AlertTriangle, X } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { useMembership } from '@/hooks/useMembership';
import { useAuthStore } from '@/stores/authStore';

const HIDE_KEY = 'neuro.dirGraceHidden';
const GRACE_DAYS = 30;

export function DirectoryGraceCard() {
  const { t } = useTranslation();
  const toast = useToast();
  const { status, startCheckout } = useMembership();
  const createdAt = useAuthStore((s) => s.profile?.created_at ?? null);

  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem(HIDE_KEY) === '1'; } catch { return false; }
  });
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  const deadline = useMemo(() => {
    if (!createdAt) return null;
    const base = new Date(createdAt).getTime();
    if (!Number.isFinite(base)) return null;
    return base + GRACE_DAYS * 86400000;
  }, [createdAt]);

  useEffect(() => {
    if (hidden || !deadline) return;
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, [hidden, deadline]);

  // Solo aplica a quien NO ha pagado. Si ya está activo/exento/past_due, nada.
  if (hidden || status !== 'pending' || !deadline || deadline <= now) return null;

  const daysLeft = Math.max(0, Math.ceil((deadline - now) / 86400000));

  const dismiss = () => {
    try { sessionStorage.setItem(HIDE_KEY, '1'); } catch { /* noop */ }
    setHidden(true);
  };

  const onCta = async () => {
    setBusy(true);
    const res = await startCheckout('annual');
    if (!res.ok) { toast.error(t('membership.payError')); setBusy(false); }
    // Si ok, startCheckout redirige a Stripe.
  };

  return (
    <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-amber-900">{t('dirGrace.title', { days: daysLeft })}</p>
          <p className="mt-0.5 text-sm text-amber-800">{t('dirGrace.body')}</p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button size="sm" loading={busy} onClick={() => void onCta()}>
              {t('dirGrace.cta')}
            </Button>
            <span className="text-xs text-amber-700">
              <Clock className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
              {t('dirGrace.deadline', { date: new Date(deadline).toLocaleDateString() })}
            </span>
          </div>
        </div>
        <button type="button" onClick={dismiss} aria-label={t('common.close', { defaultValue: 'Cerrar' })} className="flex-none text-amber-700 hover:text-amber-900">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
