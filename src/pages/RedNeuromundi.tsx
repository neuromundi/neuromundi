/**
 * RedNeuromundi — portal/landing de la "Red Neuromundi" (/red), dedicado a
 * prestadores y aliados: explica cómo escanear y validar la Neuromundi ID, los
 * beneficios de unirse a la Red, y ofrece los sellos descargables a los
 * prestadores con sesión. Genera confianza y prueba social (efecto dominó).
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScanLine, BadgeCheck, Users, ShieldCheck, TrendingUp, HeartHandshake, LogIn } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { SealsCard } from '@/components/provider/SealsCard';

function Step({ n, icon, title, body }: { n: number; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700">{icon}</span>
        <span className="text-xs font-bold uppercase tracking-wide text-muted">{n}</span>
      </div>
      <h3 className="mt-3 font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}

function Benefit({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{icon}</span>
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="text-sm text-muted">{body}</p>
      </div>
    </div>
  );
}

export function RedNeuromundi() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isProvider, isAuthenticated } = useAuth();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
          <BadgeCheck className="h-4 w-4" aria-hidden="true" /> {t('nid.red.badge')}
        </span>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">{t('nid.red.title')}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted">{t('nid.red.intro')}</p>
      </header>

      {/* Cómo funciona */}
      <section className="mt-10">
        <h2 className="text-center text-xl font-bold text-slate-900">{t('nid.red.howTitle')}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Step n={1} icon={<Users className="h-5 w-5" />} title={t('nid.red.s1t')} body={t('nid.red.s1b')} />
          <Step n={2} icon={<ScanLine className="h-5 w-5" />} title={t('nid.red.s2t')} body={t('nid.red.s2b')} />
          <Step n={3} icon={<ShieldCheck className="h-5 w-5" />} title={t('nid.red.s3t')} body={t('nid.red.s3b')} />
        </div>
      </section>

      {/* Beneficios */}
      <section className="mt-10 rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-6 sm:p-8">
        <h2 className="text-xl font-bold text-slate-900">{t('nid.red.benefitsTitle')}</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Benefit icon={<TrendingUp className="h-5 w-5" />} title={t('nid.red.b1t')} body={t('nid.red.b1b')} />
          <Benefit icon={<ShieldCheck className="h-5 w-5" />} title={t('nid.red.b2t')} body={t('nid.red.b2b')} />
          <Benefit icon={<BadgeCheck className="h-5 w-5" />} title={t('nid.red.b3t')} body={t('nid.red.b3b')} />
          <Benefit icon={<HeartHandshake className="h-5 w-5" />} title={t('nid.red.b4t')} body={t('nid.red.b4b')} />
        </div>
      </section>

      {/* Sellos */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900">{t('nid.seal.title')}</h2>
        {isProvider ? (
          <div className="mt-4"><SealsCard /></div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm text-muted">{t('nid.red.sealsForProviders')}</p>
            {!isAuthenticated && (
              <Button className="mt-3" onClick={() => navigate('/crear-cuenta')} leadingIcon={<LogIn className="h-4 w-4" />}>{t('nid.red.joinCta')}</Button>
            )}
          </div>
        )}
      </section>

      {/* CTA final */}
      <section className="mt-10 rounded-2xl border border-brand-100 bg-brand-50/50 p-6 text-center">
        <h2 className="text-xl font-bold text-slate-900">{t('nid.red.ctaTitle')}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-700">{t('nid.red.ctaBody')}</p>
        <Button className="mt-4" size="lg" onClick={() => navigate(isAuthenticated ? '/panel' : '/crear-cuenta')} leadingIcon={<BadgeCheck className="h-5 w-5" />}>
          {isAuthenticated ? t('nid.red.goPanel') : t('nid.red.joinCta')}
        </Button>
      </section>
    </div>
  );
}
