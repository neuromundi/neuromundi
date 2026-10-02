/**
 * VerifyBadge — página pública /verificar/:folio. Es la "autoridad" del
 * distintivo: lee el estado real y vigente del miembro desde la BD, de modo que
 * una copia de la imagen del distintivo no puede falsear nada.
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, XCircle, Award, Sparkles, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface VerifyResult {
  found: boolean; member_no: number | null; name: string | null; kind: string | null;
  country: string | null; vigente: boolean; is_founder: boolean; neuroaffirming: boolean; is_company: boolean;
}

export function VerifyBadge() {
  const { t } = useTranslation();
  const { folio } = useParams<{ folio: string }>();
  const [res, setRes] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc('verify_badge', { p_folio: folio ?? '' });
      const row = Array.isArray(data) ? data[0] : data;
      if (alive) { setRes((row as VerifyResult) ?? null); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [folio]);

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
          <p className="text-sm text-muted">{res.country ?? ''} · {t('verify.folio')} NM-{String(res.member_no ?? 0).padStart(6, '0')}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {res.is_company && <Chip icon={<Building2 className="h-4 w-4" />} label={t('verify.company')} />}
            {res.is_founder && <Chip icon={<Award className="h-4 w-4" />} label={t('verify.founder')} />}
            {res.neuroaffirming && <Chip icon={<Sparkles className="h-4 w-4" />} label={t('verify.neuro')} />}
          </div>
        </div>
      )}

      <p className="text-center text-sm text-muted">
        <Link to="/verificados" className="font-semibold text-brand-700 hover:underline">{t('registry.title')}</Link>
      </p>
    </main>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700">
      {icon} {label}
    </span>
  );
}
