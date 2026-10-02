/**
 * VerifyAlly — página pública /verificar/aliado/:id. Autoridad del distintivo de
 * un ALIADO (organización): lee su estado real desde la BD (revocable con
 * is_active), de modo que copiar la imagen del distintivo no prueba nada.
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, XCircle, HeartHandshake } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AllyResult { found: boolean; name: string | null; website: string | null; countries: string[] | null; vigente: boolean }

export function VerifyAlly() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [res, setRes] = useState<AllyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase.rpc('verify_ally', { p_id: id ?? '' });
        const row = Array.isArray(data) ? data[0] : data;
        if (alive) setRes((row as AllyResult) ?? null);
      } catch {
        if (alive) setRes({ found: false, name: null, website: null, countries: null, vigente: false });
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);

  const ok = !!res?.found && res.vigente;

  return (
    <main className="mx-auto max-w-md space-y-6 p-4">
      <h1 className="text-center text-2xl font-extrabold text-slate-900">{t('verify.title')}</h1>
      {loading ? (
        <p className="text-center text-muted">{t('verify.checking')}</p>
      ) : !res?.found ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500" aria-hidden="true" />
          <p className="mt-3 font-bold text-red-800">{t('verify.notFound')}</p>
        </div>
      ) : (
        <div className={`rounded-3xl border p-6 text-center ${ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          {ok ? <BadgeCheck className="mx-auto h-14 w-14 text-emerald-600" aria-hidden="true" />
              : <XCircle className="mx-auto h-14 w-14 text-amber-500" aria-hidden="true" />}
          <p className={`mt-3 text-lg font-extrabold ${ok ? 'text-emerald-800' : 'text-amber-800'}`}>
            {ok ? t('verify.found') : t('verify.noVigente')}
          </p>
          <p className="mt-2 text-xl font-bold text-slate-900">{res.name}</p>
          {res.countries && res.countries.length > 0 && <p className="text-sm text-muted">{res.countries.join(', ')}</p>}
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700">
            <HeartHandshake className="h-4 w-4" /> {t('verify.ally')}
          </span>
          {res.website && (
            <p className="mt-4">
              <a href={res.website} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-700 hover:underline">{t('registry.visit')}</a>
            </p>
          )}
        </div>
      )}
      <p className="text-center text-sm text-muted">
        <Link to="/verificados" className="font-semibold text-brand-700 hover:underline">{t('registry.title')}</Link>
      </p>
    </main>
  );
}
