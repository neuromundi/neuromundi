/**
 * TribeForumsPanel — panel del usuario para los foros de la Tribu:
 *  · lista de foros vigentes (aprobados), con enlace a /tribu;
 *  · botón para activar/desactivar las notificaciones push de foros;
 *  · selección de los PAÍSES cuyos foros le interesan (vacío = todos).
 * Se monta en el panel de control del usuario (ParentDashboard/ProviderDashboard).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Users, Bell, BellOff, Globe } from 'lucide-react';
import { useTribeForums, useTribeForumPrefs } from '@/hooks/useTribe';
import { useCountryLabel } from '@/lib/countryLabel';
import { COUNTRIES } from '@/data/countries';
import { Button, useToast } from '@/components/ui';

export function TribeForumsPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const countryLabel = useCountryLabel();
  const { forums, loading } = useTribeForums({});
  const { prefs, save } = useTribeForumPrefs();
  const [showCountries, setShowCountries] = useState(false);

  const togglePush = async () => {
    const ok = await save(!prefs.push_enabled, prefs.countries);
    if (ok) toast.success(t('tribe.prefsSaved')); else toast.error(t('tribe.forumErr'));
  };
  const toggleCountry = async (name: string) => {
    const next = prefs.countries.includes(name) ? prefs.countries.filter((c) => c !== name) : [...prefs.countries, name];
    await save(prefs.push_enabled, next);
  };

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900"><Users className="h-5 w-5 text-brand-600" /> {t('tribe.forumsPanelTitle')}</h2>
        <button type="button" onClick={() => void togglePush()} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${prefs.push_enabled ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600'}`}>
          {prefs.push_enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          {prefs.push_enabled ? t('tribe.forumPushOn') : t('tribe.forumPushOff')}
        </button>
      </div>

      {/* Países de interés */}
      <div className="mt-3">
        <button type="button" onClick={() => setShowCountries((v) => !v)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
          <Globe className="h-4 w-4" /> {t('tribe.interestCountries')} {prefs.countries.length > 0 ? `(${prefs.countries.length})` : `· ${t('tribe.allCountries')}`}
        </button>
        {showCountries && (
          <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200 p-2">
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {COUNTRIES.map((c) => (
                <label key={c.code} className="flex items-center gap-1.5 text-xs text-slate-700">
                  <input type="checkbox" checked={prefs.countries.includes(c.name)} onChange={() => void toggleCountry(c.name)} className="h-4 w-4 rounded border-slate-300 text-brand-500" />
                  <span className="truncate">{countryLabel(c.code, c.name)}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Foros vigentes */}
      <div className="mt-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-800">{t('tribe.currentForums')}</h3>
        {loading ? (
          <p className="text-sm text-muted">{t('tribe.loading')}</p>
        ) : forums.length === 0 ? (
          <p className="text-sm text-muted">{t('tribe.noForums')}</p>
        ) : (
          <ul className="space-y-1.5">
            {forums.slice(0, 6).map((f) => (
              <li key={f.id}>
                <button type="button" onClick={() => navigate('/tribu')} className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-100 p-2 text-left text-sm hover:bg-slate-50">
                  <span className="min-w-0 truncate"><span className="font-medium text-slate-900">{f.title}</span>{f.country && <span className="ml-1 text-xs text-muted">· {f.country}</span>}</span>
                  <span className="shrink-0 text-xs text-muted">{t('tribe.membersCount', { n: f.members })}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <Button size="sm" variant="secondary" className="mt-3" onClick={() => navigate('/tribu')}>{t('tribe.goToTribe')}</Button>
      </div>
    </section>
  );
}
