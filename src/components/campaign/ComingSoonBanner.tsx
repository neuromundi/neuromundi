/**
 * ComingSoonBanner — para visitantes cuyo país está en fase "próximamente 2027"
 * (fuera de hispano/lusófono/EE.UU.). Muestra el aviso, oculta cualquier tarifa
 * (eso lo hace el modal de membresía) y captura su correo como lista de espera.
 * No se pinta para países activos.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useCountry } from '@/stores/countryStore';
import { isComingSoon } from '@/data/launchMarkets';

export function ComingSoonBanner() {
  const { t } = useTranslation();
  const toast = useToast();
  const { country } = useCountry();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!isComingSoon(country)) return null;

  const join = async () => {
    if (!email.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc('join_launch_waitlist', { p_email: email.trim(), p_country: country ?? undefined });
    setBusy(false);
    if (error) { toast.error(t('launch.invalid')); return; }
    setDone(true); setEmail('');
  };

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <Clock className="h-6 w-6 shrink-0 text-amber-500" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900">
            {t('launch.soonTitle')} · <span className="text-amber-700">{t('launch.year')}</span>
          </p>
          <p className="mt-1 text-sm text-muted">{t('launch.soonBody')}</p>
          {done ? (
            <p className="mt-3 text-sm font-semibold text-emerald-700">{t('launch.joined')}</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void join(); }}
                placeholder={t('launch.emailPlaceholder')}
                aria-label={t('launch.emailPlaceholder')}
                className="w-full max-w-xs rounded-xl border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              />
              <Button size="sm" onClick={join} loading={busy}>{t('launch.join')}</Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
