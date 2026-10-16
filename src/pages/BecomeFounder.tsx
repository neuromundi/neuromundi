/**
 * BecomeFounder — página pública "/become-a-founder" (destino del botón bajo el
 * carrusel del Home). Explica cómo ser Miembro Fundador para CADA perfil
 * (familias, profesionales, comercios y empresas), su importancia y trascendencia,
 * con cupo por país, beneficios y requisitos reales del programa.
 *
 * Todo el texto viene de i18n (namespace `becomeFounder.*`, 11 idiomas). Las
 * capacidades por país viven en FOUNDER_CAPACITY (fuente única del programa).
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Award, Sparkles, Flag, Trophy, Sprout, Clock, HeartHandshake, Stethoscope, Store, Briefcase, Check } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useFounderCapacity } from '@/hooks/useFounder';
import type { FounderKind } from '@/hooks/useFounder';
import { useCountry } from '@/stores/countryStore';

/**
 * LOS CUPOS QUE SE PUBLICAN TIENEN QUE SER LOS REALES.
 *
 * Esta página tomaba los números de unas constantes del código y los mostraba
 * con el texto «Solo hay {{n}} lugares de fundador por país». El cupo real vive
 * en la configuración de campaña y es MENOR en los 24 países configurados: para
 * México, 40 comercios frente a los 150 publicados, 150 familias frente a 500.
 * Y la tarjeta de fundador sí mostraba el número real, así que el visitante veía
 * las dos cifras contradictorias en el mismo recorrido.
 * (Auditoría del 15 oct 2026, hallazgo A-17.)
 */
const KIND_DE: Record<string, FounderKind> = {
  families: 'families',
  professionals: 'professionals',
  merchants: 'providers',
  companies: 'companies',
};

type Look = { icon: typeof HeartHandshake; iconBg: string; iconText: string; capBg: string; capText: string; check: string };

const PROFILES: { key: string; kind: FounderKind; look: Look }[] = [
  { key: 'families', kind: KIND_DE['families'] as FounderKind, look: { icon: HeartHandshake, iconBg: 'bg-emerald-50', iconText: 'text-emerald-700', capBg: 'bg-emerald-50', capText: 'text-emerald-800', check: 'text-emerald-600' } },
  { key: 'professionals', kind: KIND_DE['professionals'] as FounderKind, look: { icon: Stethoscope, iconBg: 'bg-sky-50', iconText: 'text-sky-700', capBg: 'bg-sky-50', capText: 'text-sky-800', check: 'text-sky-600' } },
  { key: 'merchants', kind: KIND_DE['merchants'] as FounderKind, look: { icon: Store, iconBg: 'bg-orange-50', iconText: 'text-orange-700', capBg: 'bg-orange-50', capText: 'text-orange-800', check: 'text-orange-600' } },
  { key: 'companies', kind: KIND_DE['companies'] as FounderKind, look: { icon: Briefcase, iconBg: 'bg-violet-50', iconText: 'text-violet-700', capBg: 'bg-violet-50', capText: 'text-violet-800', check: 'text-violet-600' } },
];

const VALUE_ICONS = [Flag, Trophy, Sprout];

export function BecomeFounder() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const values = t('becomeFounder.values', { returnObjects: true, defaultValue: [] }) as { t: string; d: string }[];

  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      {/* Encabezado */}
      <header className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Award className="h-8 w-8" aria-hidden="true" />
        </span>
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-600">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> {t('becomeFounder.kicker')}
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900 sm:text-3xl">{t('becomeFounder.title')}</h1>
          <p className="text-sm text-muted">{t('becomeFounder.subtitle')}</p>
        </div>
      </header>

      <p className="mt-4 max-w-3xl leading-relaxed text-slate-700">{t('becomeFounder.lead')}</p>

      {/* Importancia / trascendencia */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {values.map((v, i) => {
          const Icon = VALUE_ICONS[i] ?? Flag;
          return (
            <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <Icon className="h-6 w-6 text-brand-600" aria-hidden="true" />
              <p className="mt-2 font-semibold text-slate-900">{v.t}</p>
              <p className="mt-0.5 text-sm text-muted">{v.d}</p>
            </div>
          );
        })}
      </div>

      {/* Perfiles */}
      <h2 className="mt-8 text-xl font-bold text-slate-900">{t('becomeFounder.profilesTitle')}</h2>
      <p className="mt-1 text-sm text-muted">{t('becomeFounder.profilesSubtitle')}</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {PROFILES.map((perfil) => <TarjetaDePerfil key={perfil.key} kind={perfil.kind} look={perfil.look} />)}
      </div>

      {/* Permanencia */}
      <div className="mt-5 flex items-start gap-3 rounded-2xl bg-amber-50 p-4">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <p className="text-sm text-amber-900">{t('becomeFounder.permanence')}</p>
      </div>

      {/* CTA */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {isAuthenticated ? (
          <Button size="lg" onClick={() => navigate('/panel')} leadingIcon={<Award className="h-5 w-5" />}>
            {t('becomeFounder.ctaPanel')}
          </Button>
        ) : (
          <>
            <Button size="lg" onClick={() => navigate('/crear-cuenta')} leadingIcon={<Award className="h-5 w-5" />}>
              {t('becomeFounder.ctaCreate')}
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate('/entrar')}>
              {t('becomeFounder.ctaLogin')}
            </Button>
          </>
        )}
        <span className="text-xs text-muted sm:ml-auto">{t('becomeFounder.fineprint')}</span>
      </div>
    </div>
  );
}

/** Una tarjeta de perfil, con el cupo REAL de su país leído de la base. */
function TarjetaDePerfil({ kind, look }: { kind: FounderKind; look: Look }) {
  const { t } = useTranslation();
  const { country } = useCountry();
  const { capacity, used, loading } = useFounderCapacity(kind, country || null);
  const claveTexto = Object.keys(KIND_DE).find((k) => KIND_DE[k] === kind) ?? 'families';
  const Icon = look.icon;
  const benefits = t(`becomeFounder.profiles.${claveTexto}.benefits`, { returnObjects: true, defaultValue: [] }) as string[];
  const reqs = t(`becomeFounder.profiles.${claveTexto}.reqs`, { returnObjects: true, defaultValue: [] }) as string[];
  const quedan = Math.max(0, capacity - used);

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${look.iconBg} ${look.iconText}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{t(`becomeFounder.profiles.${claveTexto}.name`)}</p>
          <p className="truncate text-xs text-muted">{t(`becomeFounder.profiles.${claveTexto}.who`)}</p>
        </div>
      </div>

      {/* El número que se publica es el que de verdad aplica a su país. */}
      {!loading && capacity > 0 && (
        <p className={`mt-3 inline-block rounded-full ${look.capBg} ${look.capText} px-3 py-1 text-xs font-semibold`}>
          {t('becomeFounder.quedanDe', { quedan, total: capacity, pais: country })}
        </p>
      )}

      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted">{t('becomeFounder.benefitsLabel')}</p>
      <ul className="mt-1 space-y-1">
        {benefits.map((b, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-700">
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${look.check}`} aria-hidden="true" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted">{t('becomeFounder.reqsLabel')}</p>
      <ul className="mt-1 space-y-1">
        {reqs.map((r, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-600">
            <span aria-hidden="true" className="mt-0.5 text-slate-400">·</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
