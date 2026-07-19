/**
 * MembershipReminderPopup — recordatorio de renovación de membresía.
 *
 * Aparece al iniciar sesión cuando faltan 30 días o menos para la renovación de
 * un perfil al que la plataforma cobra (proveedores/prestadores). Muestra un
 * conteo regresivo en vivo y, para Fundadores, el 50% de descuento de por vida.
 * Los pacientes y padres/tutores NO tienen renovación (membresía gratuita y
 * vitalicia), por lo que no ven este aviso. Frecuencia: una vez cada 24 h.
 */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, CalendarClock, BadgePercent } from 'lucide-react';
import { Button, FounderBadge } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMembership } from '@/hooks/useMembership';
import { useFounderStatus } from '@/hooks/useFounder';

const DAY = 86400000;
const REMIND_WINDOW_DAYS = 30;

function useCountdown(target: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (target == null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (target == null) return null;
  const ms = Math.max(0, target - now);
  const days = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { days, h, m, s, overdue: target - now < 0 };
}

export function MembershipReminderPopup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId, role } = useAuth();
  const { status, paidUntil, dueAt, loading } = useMembership();
  const { isFounder } = useFounderStatus(userId);
  const [dismissed, setDismissed] = useState(false);

  const isPaying = role === 'provider' && status !== 'exempt';
  const unpaid = status === 'pending' || status === 'past_due';
  const renewalIso = paidUntil ?? dueAt ?? null;
  const targetMs = useMemo(() => (renewalIso ? new Date(renewalIso).getTime() : null), [renewalIso]);
  const countdown = useCountdown(targetMs);

  const daysToRenewal = targetMs != null ? Math.ceil((targetMs - Date.now()) / DAY) : null;
  const inWindow = daysToRenewal != null && daysToRenewal <= REMIND_WINDOW_DAYS;

  const alreadyShown = useMemo(() => {
    if (!userId) return true;
    try {
      const raw = localStorage.getItem(`nm_renewal_notice_${userId}`);
      return !!raw && Date.now() - Number(raw) < DAY;
    } catch {
      return false;
    }
  }, [userId]);

  const show = !loading && isPaying && inWindow && !dismissed && !alreadyShown;

  useEffect(() => {
    if (show && userId) {
      try { localStorage.setItem(`nm_renewal_notice_${userId}`, String(Date.now())); } catch { /* noop */ }
    }
  }, [show, userId]);

  if (!show || !countdown) return null;

  const close = () => setDismissed(true);
  const pay = () => { setDismissed(true); navigate('/panel'); };
  const num = (n: number) => String(n).padStart(2, '0');

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true" aria-labelledby="renew-title">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <button type="button" onClick={close} aria-label={t('common.close')} className="absolute right-3 top-3 rounded-full p-1 text-white/90 hover:bg-white/20">
          <X className="h-5 w-5" />
        </button>

        <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-700 px-6 py-6 text-white">
          <CalendarClock className="h-9 w-9 opacity-90" aria-hidden="true" />
          <h2 id="renew-title" className="mt-2 text-xl font-extrabold">{unpaid ? t('renewal.payTitle') : t('renewal.title')}</h2>
          <p className="mt-1 text-sm text-white/90">
            {countdown.overdue
              ? (unpaid ? t('renewal.payOverdue') : t('renewal.overdue'))
              : (unpaid ? t('renewal.paySubtitle', { days: daysToRenewal }) : t('renewal.subtitle', { days: daysToRenewal }))}
          </p>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{unpaid ? t('renewal.payCountdown') : t('renewal.countdown')}</p>
            <div className="flex items-center justify-center gap-2 font-mono text-2xl font-bold text-slate-900">
              <span>{countdown.days}<span className="text-sm font-normal text-muted">{t('renewal.d')}</span></span>
              <span>{num(countdown.h)}<span className="text-sm font-normal text-muted">{t('renewal.h')}</span></span>
              <span>{num(countdown.m)}<span className="text-sm font-normal text-muted">{t('renewal.m')}</span></span>
              <span>{num(countdown.s)}<span className="text-sm font-normal text-muted">{t('renewal.s')}</span></span>
            </div>
          </div>

          {isFounder ? (
            <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-3">
              <FounderBadge isFounder size="sm" />
              <div className="text-sm">
                <p className="flex items-center gap-1.5 font-bold text-brand-800">
                  <BadgePercent className="h-4 w-4" aria-hidden="true" /> {t('renewal.founderDiscount')}
                </p>
                <p className="mt-1 text-brand-700">{t('membership.founderDiscount')}</p>
              </div>
            </div>
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
              {t('renewal.noDiscount')}
            </p>
          )}

          <Button fullWidth onClick={pay}>{unpaid ? t('renewal.payNowFirst') : t('renewal.payNow')}</Button>
          <button type="button" onClick={close} className="mx-auto block text-sm font-semibold text-muted hover:text-slate-700">
            {t('renewal.later')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
