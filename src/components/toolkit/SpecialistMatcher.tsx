/**
 * SpecialistMatcher — CTA al final de cada módulo.
 *
 *  - Persona autenticada → consulta Supabase (`specialists` por `module_type`)
 *    y sugiere hasta 3 perfiles del directorio.
 *  - Visitante          → invitación cálida a crear cuenta, explicando que las
 *    sugerencias del directorio son para personas registradas.
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, UserPlus, Compass, MapPin } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useSpecialistMatches } from '@/hooks/useSpecialistMatches';
import type { ToolkitModule } from '@/data/toolkit';
import type { Accent } from './meta';

function initials(name: string | null): string {
  if (!name) return '·';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

export function SpecialistMatcher({ module, accent }: { module: ToolkitModule; accent: Accent }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { specialists, loading, error } = useSpecialistMatches(module.id, isAuthenticated);

  // ── Visitante: invitación a crear cuenta ──────────────────────────────
  if (!isAuthenticated) {
    return (
      <section className={`rounded-2xl border ${accent.border} ${accent.soft} p-6`} aria-labelledby={`matcher-${module.id}`}>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-brand-700">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h4 id={`matcher-${module.id}`} className="text-lg font-bold text-slate-900">{t('kit.matcher.guestTitle')}</h4>
            <p className="mt-1 max-w-prose leading-relaxed text-slate-700">{t('kit.matcher.guestText')}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => navigate('/crear-cuenta')} leadingIcon={<UserPlus className="h-4 w-4" />}>
                {t('kit.matcher.guestCta')}
              </Button>
              <Button variant="ghost" onClick={() => navigate('/directorio')} leadingIcon={<Compass className="h-4 w-4" />}>
                {t('kit.matcher.exploreDirectory')}
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── Autenticada: sugerencias del directorio ───────────────────────────
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm" aria-labelledby={`matcher-${module.id}`}>
      <h4 id={`matcher-${module.id}`} className="text-lg font-bold text-slate-900">{t('kit.matcher.authTitle')}</h4>
      <p className="mt-1 text-sm text-muted">{module.area}</p>

      {loading ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : specialists.length > 0 ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {specialists.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => navigate('/directorio')}
                className="flex h-full w-full items-center gap-3 rounded-2xl border border-slate-100 p-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${accent.soft} ${accent.text} font-bold`}>
                  {initials(s.full_name)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-900">{s.full_name ?? t('kit.matcher.specialist')}</span>
                  {s.specialty && <span className="block truncate text-sm text-muted">{s.specialty}</span>}
                  {s.city && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                      <MapPin className="h-3 w-3" aria-hidden="true" /> {s.city}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-5 text-center">
          <p className="leading-relaxed text-slate-700">
            {error ? t('kit.matcher.error') : t('kit.matcher.empty')}
          </p>
          <Button className="mt-3" variant="ghost" onClick={() => navigate('/directorio')} leadingIcon={<Compass className="h-4 w-4" />}>
            {t('kit.matcher.exploreDirectory')}
          </Button>
        </div>
      )}
    </section>
  );
}
