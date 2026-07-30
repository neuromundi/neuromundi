/**
 * TopicSubscriptions — el usuario se inscribe a avisos por categoría (empleo,
 * voluntariado, servicio social, esparcimiento) y acota por país/ciudad. Al
 * publicarse algo nuevo de un tema elegido, recibe una notificación in-app (y
 * push si lo tiene activo).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BellPlus, Check } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { useTopicSubscriptions, TOPIC_VALUES, type TopicValue } from '@/hooks/useTopicSubscriptions';
import { useCountryLabel } from '@/lib/countryLabel';
import { COUNTRIES } from '@/data/countries';

const inputCls = 'w-full rounded-xl border border-slate-200 p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function TopicSubscriptions() {
  const { t } = useTranslation();
  const countryLabel = useCountryLabel();
  const toast = useToast();
  const { sub, loading, saving, save } = useTopicSubscriptions();
  const [topics, setTopics] = useState<TopicValue[] | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);

  // Estado local inicializado desde el hook la primera vez que carga.
  const selTopics = topics ?? sub.topics;
  const selCountry = country ?? sub.scope_country ?? '';
  const selCity = city ?? sub.scope_city ?? '';

  const toggle = (v: TopicValue) => {
    const base = topics ?? sub.topics;
    setTopics(base.includes(v) ? base.filter((x) => x !== v) : [...base, v]);
  };

  const onSave = async () => {
    const ok = await save({ topics: selTopics, scope_country: selCountry || null, scope_city: selCity || null });
    toast[ok ? 'success' : 'error'](ok ? t('topics.saved') : t('topics.saveErr'));
  };

  if (loading) return null;

  return (
    <section className="rounded-2xl border border-slate-100 p-4">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900">
        <BellPlus className="h-5 w-5 text-brand-600" aria-hidden="true" /> {t('topics.title')}
      </h2>
      <p className="mt-1 text-sm text-muted">{t('topics.desc')}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {TOPIC_VALUES.map((v) => {
          const active = selTopics.includes(v);
          return (
            <button
              key={v}
              type="button"
              onClick={() => toggle(v)}
              aria-pressed={active}
              className={
                active
                  ? 'inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white'
                  : 'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50'
              }
            >
              {active && <Check className="h-4 w-4" />} {t(`topics.opt.${v}`)}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-800">{t('topics.country')}</label>
          <select className={inputCls} value={selCountry} onChange={(e) => setCountry(e.target.value)}>
            <option value="">{t('topics.anyCountry')}</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{countryLabel(c.code, c.name)}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-800">{t('topics.city')}</label>
          <input className={inputCls} value={selCity} onChange={(e) => setCity(e.target.value)} placeholder={t('topics.anyCity')} />
        </div>
      </div>

      <Button className="mt-4" size="sm" loading={saving} onClick={() => void onSave()}>{t('topics.save')}</Button>
    </section>
  );
}
