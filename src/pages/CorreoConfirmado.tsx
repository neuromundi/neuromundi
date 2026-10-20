/**
 * CorreoConfirmado — página de llegada de los enlaces de confirmación del
 * cambio de correo de acceso (/correo-confirmado).
 *
 * Supabase tiene activada la opción "Secure Email Change": el cambio sólo se
 * aplica cuando se confirma DESDE LAS DOS direcciones, la actual y la nueva.
 * Antes, el enlace dejaba a la persona en el inicio, sin sesión y sin ningún
 * mensaje, de modo que no había forma de saber si el cambio se había hecho o
 * no. Esta página dice qué pasó y qué falta.
 *
 * Si hay sesión en ese navegador se puede distinguir el estado real: cuando
 * `new_email` sigue presente, falta la otra confirmación; si ya no está, el
 * cambio quedó aplicado. Sin sesión no se puede consultar, así que se explica
 * la regla de las dos confirmaciones sin afirmar un estado que no se midió.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MailCheck, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Estado = 'cargando' | 'noSePudo' | 'aplicado' | 'pendiente' | 'sinSesion';

export function CorreoConfirmado() {
  const { t } = useTranslation();
  const [estado, setEstado] = useState<Estado>('cargando');

  useEffect(() => {
    let vivo = true;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!vivo) return;
        const u = data.user;
        if (!u) return setEstado('sinSesion');
        setEstado(u.new_email ? 'pendiente' : 'aplicado');
      })
      // Antes un fallo de red se reportaba como 'sinSesion': a quien acababa de
      // pulsar el enlace de su correo se le decia que no tenia sesion, que es
      // otra cosa y lo manda a entrar cuando lo unico que paso es que la
      // comprobacion no llego. (Repaso adversario, 19 oct 2026.)
      .catch(() => { if (vivo) setEstado('noSePudo'); });
    return () => { vivo = false; };
  }, []);

  const aplicado = estado === 'aplicado';
  const Icono = aplicado ? MailCheck : Clock;

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        <Icono className={`mx-auto h-10 w-10 ${aplicado ? 'text-emerald-600' : 'text-brand-600'}`} aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-extrabold text-slate-900">
          {aplicado ? t('mailConfirm.titleDone') : t('mailConfirm.title')}
        </h1>

        {estado === 'cargando' ? (
          <p className="mt-3 text-slate-500">{t('common.loading')}</p>
        ) : estado === 'noSePudo' ? (
          <p className="mt-3 text-slate-700">{t('mailConfirm.noSePudo')}</p>
        ) : aplicado ? (
          <p className="mt-3 text-slate-700">{t('mailConfirm.done')}</p>
        ) : (
          <>
            <p className="mt-3 text-slate-700">{t('mailConfirm.received')}</p>
            <p className="mt-2 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-left text-sm text-slate-700">
              {t('mailConfirm.pending')}
            </p>
          </>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/ajustes"
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {t('mailConfirm.toSettings')}
          </Link>
          <Link
            to="/"
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t('mailConfirm.toHome')}
          </Link>
        </div>
      </section>
    </main>
  );
}
