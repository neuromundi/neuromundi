/**
 * UnpublishedNotice — aviso de que el perfil NO aparece en el directorio.
 *
 * `profiles.is_published` nace en false y publicarse era una casilla enterrada
 * en Ajustes que nada encendía: alguien podía pagar su membresía y quedarse
 * invisible sin enterarse, esperando un interruptor que nadie le mencionó.
 *
 * Desde la migración 0158 el reclamo de una ficha publica el perfil, y desde la
 * 0159 el primer pago también. Este aviso cubre el resto de los casos —y sirve
 * de red si algo falla—: mientras el perfil esté sin publicar, se dice, se
 * explica qué significa y se ofrece publicarlo desde aquí, en un clic.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EyeOff } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export function UnpublishedNotice({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [oculto, setOculto] = useState<boolean | null>(null);
  const [guardando, setGuardando] = useState(false);

  const leer = useCallback(async () => {
    const { data } = await (supabase as unknown as {
      from: (x: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { is_published?: boolean; suspended_at?: string | null } | null }> } } };
    }).from('profiles').select('is_published, suspended_at').eq('id', userId).maybeSingle();
    // Si está suspendido no se le ofrece publicar: no es su decisión.
    setOculto(data ? data.is_published === false && !data.suspended_at : false);
  }, [userId]);

  useEffect(() => { void leer(); }, [leer]);

  if (!oculto) return null;

  async function publicar() {
    setGuardando(true);
    const { error } = await supabase.from('profiles').update({ is_published: true }).eq('id', userId);
    setGuardando(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('provider.unpublished.done'));
    void leer();
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
      <EyeOff className="h-6 w-6 shrink-0 text-amber-700" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-bold text-amber-900">{t('provider.unpublished.title')}</p>
        <p className="text-sm text-amber-800">{t('provider.unpublished.desc')}</p>
      </div>
      <Button onClick={() => void publicar()} disabled={guardando} className="shrink-0">
        {t('provider.unpublished.cta')}
      </Button>
    </div>
  );
}
