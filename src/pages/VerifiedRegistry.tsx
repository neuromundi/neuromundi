/**
 * VerifiedRegistry — página pública /verificados: registro oficial de aliados
 * verificados de Neuromundi + un buscador para verificar un distintivo por folio.
 * Es el complemento del QR: cualquiera puede comprobar quién tiene el distintivo.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Search, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useCountry } from '@/stores/countryStore';

interface Ally { id: string; name: string; website: string | null; countries: string[] | null }

export function VerifiedRegistry() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { country } = useCountry();
  const [allies, setAllies] = useState<Ally[]>([]);
  const [folio, setFolio] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from('allies').select('id,name,website,countries').eq('is_active', true).order('sort_order');
      if (alive) setAllies((data as Ally[]) ?? []);
    })();
    return () => { alive = false; };
  }, []);

  const shown = useMemo(
    () => allies.filter((a) => !country || !a.countries || a.countries.length === 0 || a.countries.includes(country)),
    [allies, country],
  );

  const lookup = () => { if (folio.trim()) navigate(`/verificar/${encodeURIComponent(folio.trim())}`); };

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-4">
      <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-evs-5 p-8 text-white shadow-lg">
        <ShieldCheck className="h-10 w-10 opacity-90" aria-hidden="true" />
        <h1 className="mt-3 text-3xl font-extrabold">{t('registry.title')}</h1>
        <p className="mt-2 max-w-xl text-white/90">{t('registry.subtitle')}</p>
      </section>

      {/* Llamado a la comunidad: proteger los distintivos contra piratería/uso indebido. */}
      <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" aria-hidden="true" />
        <div>
          <h2 className="font-bold text-slate-900">{t('registry.communityTitle')}</h2>
          <p className="mt-1 text-sm text-slate-700">{t('registry.communityBody')}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">{t('registry.lookupTitle')}</h2>
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              value={folio}
              onChange={(e) => setFolio(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') lookup(); }}
              placeholder={t('registry.placeholder')}
              aria-label={t('registry.lookupTitle')}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
          </div>
          <Button onClick={lookup}>{t('verify.lookupBtn')}</Button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">{t('registry.alliesTitle')}</h2>
        {shown.length === 0 ? (
          <p className="text-sm text-muted">{t('registry.empty')}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {shown.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <span className="font-semibold text-slate-900">{a.name}</span>
                {a.website && (
                  <a href={a.website} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-700 hover:underline">
                    {t('registry.visit')}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
