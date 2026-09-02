/**
 * DirectoryLockedScreen — pantalla que sustituye al directorio durante la campaña
 * de pre-registro: fondo oscuro con la silueta desenfocada del directorio detrás,
 * texto persuasivo, cuenta regresiva (naranja suave) hasta la apertura del país del
 * visitante y un llamado a asegurar el lugar. Admin y asesor no la ven.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, KeyRound, LogIn } from 'lucide-react';
import { Button } from '@/components/ui';

function useCountdown(target: Date | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!target) return null;
  const ms = Math.max(0, target.getTime() - now);
  const s = Math.floor(ms / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), mins: Math.floor((s % 3600) / 60), secs: s % 60 };
}

function Unit({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex min-w-[3.5rem] flex-col items-center">
      <span className="font-mono text-3xl font-extrabold tabular-nums text-amber-400 sm:text-4xl">{String(n).padStart(2, '0')}</span>
      <span className="mt-1 text-[0.65rem] uppercase tracking-widest text-slate-400">{label}</span>
    </div>
  );
}

export function DirectoryLockedScreen({ unlockAt }: { unlockAt: Date | null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const cd = useCountdown(unlockAt);

  return (
    <div className="relative min-h-[70vh] overflow-hidden rounded-3xl">
      {/* Silueta desenfocada del directorio de fondo (decorativa, no navegable) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none opacity-20 blur-md">
        <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-500/40" />
          ))}
        </div>
      </div>
      <div className="absolute inset-0 bg-slate-950/80" aria-hidden="true" />

      <div className="relative flex min-h-[70vh] flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-400/40">
          <Lock className="h-6 w-6 text-amber-400" aria-hidden="true" />
        </div>
        <h1 className="max-w-2xl text-2xl font-extrabold leading-tight text-white sm:text-3xl">{t('campaign.locked.title')}</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">{t('campaign.locked.body')}</p>

        {cd && (
          <div className="mt-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400/90">{t('campaign.locked.opensIn')}</p>
            <div className="flex items-start justify-center gap-3 sm:gap-5">
              <Unit n={cd.days} label={t('campaign.cd.days')} />
              <Unit n={cd.hours} label={t('campaign.cd.hours')} />
              <Unit n={cd.mins} label={t('campaign.cd.mins')} />
              <Unit n={cd.secs} label={t('campaign.cd.secs')} />
            </div>
          </div>
        )}

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" onClick={() => navigate('/crear-cuenta')} leadingIcon={<KeyRound className="h-5 w-5" />}>
            {t('campaign.locked.cta')}
          </Button>
          <button
            type="button"
            onClick={() => navigate('/entrar')}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-slate-200 hover:text-white"
          >
            <LogIn className="h-4 w-4" /> {t('campaign.locked.login')}
          </button>
        </div>
      </div>
    </div>
  );
}
