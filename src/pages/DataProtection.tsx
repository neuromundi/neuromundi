/**
 * DataProtection — "Cómo protegemos tus datos". Explica el trato de datos y el
 * cumplimiento normativo internacional (RGPD, LFPDPPP, CCPA). Página pública.
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Lock, KeyRound, Scale, Check } from 'lucide-react';

export function DataProtection() {
  const { t } = useTranslation();
  const rights = t('dataprot.law.rights', { returnObjects: true }) as string[];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Héroe */}
      <section className="rounded-3xl bg-gradient-to-br from-teal-600 to-emerald-600 p-8 text-white sm:p-10">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{t('dataprot.hero.title')}</h1>
        <ul className="mt-5 space-y-2">
          {[t('dataprot.hero.b1'), t('dataprot.hero.b2'), t('dataprot.hero.b3')].map((b) => (
            <li key={b} className="flex items-start gap-2">
              <Check className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Eres el dueño */}
      <section className="mt-12 grid items-center gap-8 md:grid-cols-2">
        <div className="flex h-44 items-center justify-center rounded-3xl bg-teal-50">
          <ShieldCheck className="h-20 w-20 text-teal-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('dataprot.own.title')}</h2>
          <p className="mt-3 text-muted">{t('dataprot.own.body')}</p>
        </div>
      </section>

      {/* Separación / dos tarjetas */}
      <section className="mt-12">
        <h2 className="text-center text-2xl font-bold text-slate-900">{t('dataprot.sep.title')}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl bg-teal-700 p-6 text-white">
            <h3 className="text-lg font-bold">{t('dataprot.sep.card1Title')}</h3>
            <p className="mt-3 text-sm text-teal-50">{t('dataprot.sep.card1Body')}</p>
          </article>
          <article className="rounded-2xl bg-teal-700 p-6 text-white">
            <h3 className="text-lg font-bold">{t('dataprot.sep.card2Title')}</h3>
            <p className="mt-3 text-sm text-teal-50">{t('dataprot.sep.card2Body')}</p>
          </article>
        </div>
      </section>

      {/* Seguridad técnica */}
      <section className="mt-12">
        <div className="flex items-center gap-3">
          <Lock className="h-7 w-7 text-teal-600" />
          <h2 className="text-2xl font-bold text-slate-900">{t('dataprot.sec.title')}</h2>
        </div>
        <p className="mt-3 text-muted">{t('dataprot.sec.body')}</p>
      </section>

      {/* Cumplimiento normativo */}
      <section className="mt-12 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <Scale className="h-7 w-7 text-teal-600" />
          <h2 className="text-2xl font-bold text-slate-900">{t('dataprot.law.title')}</h2>
        </div>
        <p className="mt-3 text-muted">{t('dataprot.law.body')}</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {rights.map((r) => (
            <li key={r} className="flex items-start gap-2 text-sm text-slate-700">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
              {r}
            </li>
          ))}
        </ul>
      </section>

      {/* Pilares */}
      <section className="mt-12 grid gap-6 sm:grid-cols-3">
        <Pillar title={t('dataprot.p1.title')} body={t('dataprot.p1.body')} />
        <Pillar title={t('dataprot.p2.title')} body={t('dataprot.p2.body')} />
        <Pillar title={t('dataprot.p3.title')} body={t('dataprot.p3.body')} />
      </section>

      {/* Contacto */}
      <section className="mt-12 rounded-3xl bg-teal-600 p-8 text-center text-white">
        <h2 className="text-xl font-bold">{t('dataprot.contact.title')}</h2>
        <p className="mx-auto mt-2 max-w-xl text-teal-50">{t('dataprot.contact.body')}</p>
        <a href="mailto:admin@neuromundi.com" className="mt-4 inline-block rounded-xl bg-white px-5 py-2.5 font-semibold text-teal-700">
          admin@neuromundi.com
        </a>
        <p className="mt-4 text-sm text-teal-100">
          <Link to="/privacidad" className="underline">{t('auth.privacy')}</Link>
          <span className="mx-2">·</span>
          <Link to="/terminos" className="underline">{t('auth.terms')}</Link>
        </p>
      </section>
    </div>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-50 text-teal-700">
        <Check className="h-6 w-6" />
      </span>
      <h3 className="mt-3 font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}
