/**
 * NeuromundiIdOptIn — el prestador declara que ACEPTA la Neuromundi ID. Al
 * activarlo, su perfil público muestra la leyenda "Acepto Neuromundi ID" (prueba
 * social / efecto dominó para que más prestadores se integren a la red).
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeCheck } from 'lucide-react';
import { useToast } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';

export function NeuromundiIdOptIn() {
  const { t } = useTranslation();
  const toast = useToast();
  const { profile, updateProfile } = useProfile();
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) setOn(profile.accepts_neuromundi_id ?? false);
  }, [profile]);

  const toggle = async () => {
    if (on === null) return;
    const next = !on;
    setBusy(true);
    const res = await updateProfile({ accepts_neuromundi_id: next });
    setBusy(false);
    if (res.ok) { setOn(next); toast.success(next ? t('nid.optInOn') : t('nid.optInOff')); }
    else toast.error(res.error);
  };

  if (on === null) return null;

  return (
    <section className="rounded-2xl border border-slate-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-slate-900">
            <BadgeCheck className="h-5 w-5 text-brand-600" aria-hidden="true" /> {t('nid.optInTitle')}
          </h3>
          <p className="mt-1 text-sm text-muted">{t('nid.optInDesc')}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={busy}
          onClick={() => void toggle()}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${on ? 'bg-brand-600' : 'bg-slate-300'} disabled:opacity-50`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
    </section>
  );
}
