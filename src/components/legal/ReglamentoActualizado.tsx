/**
 * ReglamentoActualizado — aviso de re-aceptación del reglamento.
 *
 * Por qué existe (auditoría del 15 oct 2026, hallazgo M-18): la barrera de alta
 * sólo comprobaba que `rules_version_accepted` NO FUERA NULO, nunca que
 * coincidiera con la versión vigente. Al actualizar el reglamento, nadie lo
 * volvería a aceptar y el campo quedaría mintiendo.
 *
 * Lo que NO se hizo, a propósito: endurecer `needsOnboarding`. Esa bandera
 * cierra la plataforma entera y manda al formulario de alta completo; al
 * cambiar un texto legal dejaría a todos los miembros encerrados ahí. La
 * re-aceptación es un aviso aparte que no bloquea la navegación.
 *
 * La versión vigente la pone el SERVIDOR (`reglamento_vigente()`), no este
 * archivo: estaba escrita a mano en tres sitios y es la clase de constante que
 * se desincroniza. `aceptar_reglamento()` tampoco recibe la versión.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ScrollText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';

export function ReglamentoActualizado() {
  const { t } = useTranslation();
  const { isAuthenticated, refreshProfile } = useAuth();
  const profile = useAuthStore((s) => s.profile);
  const aceptada = profile?.rules_version_accepted ?? null;

  const [vigente, setVigente] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  useEffect(() => {
    // Sólo se pregunta al servidor si hay a quién preguntarle por: alguien con
    // sesión que YA aceptó alguna vez. Quien no ha aceptado nunca pasa por el
    // alta, que es otra pantalla.
    if (!isAuthenticated || !aceptada) { setVigente(null); return; }
    let vivo = true;
    (async () => {
      const { data, error } = await supabase.rpc('reglamento_vigente');
      if (!vivo) return;
      // Si no se puede consultar, no se inventa: no se muestra nada.
      if (error || typeof data !== 'string') { setVigente(null); return; }
      setVigente(data);
    })();
    return () => { vivo = false; };
  }, [isAuthenticated, aceptada]);

  const pendiente = !!aceptada && !!vigente && aceptada !== vigente;
  if (!pendiente) return null;

  const aceptar = async () => {
    setGuardando(true);
    setFallo(null);
    const { data, error } = await supabase.rpc('aceptar_reglamento');
    setGuardando(false);
    const ok = !error && (data as { ok?: boolean } | null)?.ok === true;
    if (!ok) {
      setFallo(t('legal.reaccept.failed'));
      return;
    }
    await refreshProfile();
  };

  return (
    <div
      role="region"
      aria-label={t('legal.reaccept.title')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-300 bg-amber-50 px-4 py-3 shadow-lg"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-sm text-amber-900">
          <ScrollText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {t('legal.reaccept.body')}{' '}
            <Link to="/terminos" className="font-medium underline">
              {t('legal.reaccept.read')}
            </Link>
          </span>
        </p>
        <div className="flex items-center gap-3">
          {fallo && <span className="text-sm text-red-700">{fallo}</span>}
          <button
            type="button"
            onClick={aceptar}
            disabled={guardando}
            className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-60"
          >
            {guardando ? t('legal.reaccept.saving') : t('legal.reaccept.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
