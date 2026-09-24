/**
 * FounderCountdownCard — tarjeta discreta en el panel del prestador con una
 * cuenta regresiva para optar por Miembro Fundador antes del cierre de su país.
 *
 * Se muestra solo a prestadores NO exentos y NO fundadores todavía, cuando hay
 * una fecha límite definida para su país (campaign_config.founder_deadline_by_country)
 * y esa fecha aún no pasa. Dos caminos:
 *   · Aún no pagó   → botón que abre el checkout anual (tarifa de fundador si aplica).
 *   · Ya pagó ordinario → botón que abre una solicitud a soporte para el cambio.
 * Ocultable por sesión. El padre ya la monta solo cuando !isFounder.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Award, Clock, X } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { useCampaign } from '@/hooks/useCampaign';
import { useMembership } from '@/hooks/useMembership';
import { useAuthStore } from '@/stores/authStore';

const HIDE_KEY = 'neuro.founderCdHidden';

function parts(ms: number) {
  const d = Math.max(0, ms);
  return {
    days: Math.floor(d / 86400000),
    hours: Math.floor((d % 86400000) / 3600000),
    mins: Math.floor((d % 3600000) / 60000),
    secs: Math.floor((d % 60000) / 1000),
  };
}

export function FounderCountdownCard() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const { config } = useCampaign();
  const { status, startCheckout } = useMembership();
  const country = useAuthStore((s) => s.profile?.country ?? null);

  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem(HIDE_KEY) === '1'; } catch { return false; }
  });
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  // Fecha límite para el país del miembro.
  const deadline = useMemo(() => {
    const iso = country ? config?.founder_deadline_by_country?.[country] : undefined;
    if (!iso) return null;
    const d = new Date(iso).getTime();
    return Number.isFinite(d) ? d : null;
  }, [config, country]);

  useEffect(() => {
    if (hidden || !deadline) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hidden, deadline]);

  if (hidden || status === 'exempt' || !deadline || deadline <= now) return null;

  const paid = status === 'active' || status === 'past_due';
  const { days, hours, mins, secs } = parts(deadline - now);
  const pad = (n: number) => String(n).padStart(2, '0');

  const dismiss = () => {
    try { sessionStorage.setItem(HIDE_KEY, '1'); } catch { /* noop */ }
    setHidden(true);
  };

  const onCta = async () => {
    if (paid) {
      // Ya pagó ordinario: no hay cambio automático de tarifa; se canaliza a soporte.
      navigate('/support?asunto=fundador');
      return;
    }
    setBusy(true);
    const res = await startCheckout('annual');
    if (!res.ok) { toast.error(t('membership.payError')); setBusy(false); }
    // Si ok, startCheckout redirige a Stripe.
  };

  const Cell = ({ v, label }: { v: number | string; label: string }) => (
    <div className="min-w-[52px] rounded-lg bg-slate-50 px-2.5 py-1.5 text-center">
      <div className="text-xl font-bold text-slate-900">{v}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );

  return (
    <div className="mb-4 rounded-2xl border border-brand-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Award className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-900">{t('founderCd.title')}</p>
          <p className="mt-0.5 text-sm text-muted">{t('founderCd.subtitle')}</p>

          <div className="mt-3 flex gap-2" role="timer" aria-label={t('founderCd.title')}>
            <Cell v={days} label={t('founderCd.days')} />
            <Cell v={pad(hours)} label={t('founderCd.hours')} />
            <Cell v={pad(mins)} label={t('founderCd.mins')} />
            <Cell v={pad(secs)} label={t('founderCd.secs')} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button size="sm" loading={busy} onClick={() => void onCta()}>
              {paid ? t('founderCd.ctaSupport') : t('founderCd.ctaPay')}
            </Button>
            <span className="text-xs text-muted">
              <Clock className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
              {t('founderCd.deadline', { date: new Date(deadline).toLocaleDateString() })}
            </span>
          </div>
        </div>
        <button type="button" onClick={dismiss} aria-label={t('common.close', { defaultValue: 'Cerrar' })} className="flex-none text-muted hover:text-slate-700">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
