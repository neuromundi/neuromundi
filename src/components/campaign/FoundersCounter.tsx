/**
 * FoundersCounter — prueba social del lanzamiento. Lee founder_count() (RPC
 * pública, excluye cuentas internas) y SOLO se pinta cuando hay 20 o más
 * fundadores, para no mostrar un número pequeño que reste credibilidad.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const THRESHOLD = 20;

export function FoundersCounter() {
  const { t } = useTranslation();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.rpc('founder_count');
      if (alive && typeof data === 'number') setCount(data);
    })();
    return () => { alive = false; };
  }, []);

  if (count === null || count < THRESHOLD) return null;

  return (
    <div className="mt-10 flex justify-center">
      <div className="inline-flex items-center gap-3 rounded-full border border-amber-300 bg-amber-50 px-6 py-3 shadow-sm">
        <Award className="h-6 w-6 text-amber-500" aria-hidden="true" />
        <p className="text-sm font-semibold text-slate-800">
          <span className="text-xl font-extrabold text-brand-700">{count.toLocaleString()}</span> {t('home.foundersCount')}
        </p>
      </div>
    </div>
  );
}
