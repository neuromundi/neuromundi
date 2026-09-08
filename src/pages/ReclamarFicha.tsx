/**
 * ReclamarFicha — página que recibe el enlace de invitación: /reclamar/:token
 *
 * Tres decisiones de diseño:
 *   1. Enseña la ficha ANTES de pedir nada. Quien llega aquí no pidió estar en
 *      el directorio; lo primero que merece es ver qué hay publicado.
 *   2. Los dos botones pesan lo mismo. "Quitar mi ficha" no se esconde.
 *   3. Usa la paleta de la plataforma (brand / slate / muted), sin CSS aparte.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Trash2, Building2, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Estado = 'cargando' | 'lista' | 'invalida' | 'error' | 'reclamada' | 'dada_de_baja';

interface Ficha {
  ficha_id: string;
  nombre: string;
  provider_type: string;
  estado: string | null;
  ciudad: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string;
  sitio_web: string | null;
  especializacion: string | null;
  fuente: string;
  fuente_url: string | null;
}

const ETIQUETAS: Record<string, string> = {
  clinic: 'Clínica o consultorio',
  school: 'Escuela o centro educativo',
  service_provider: 'Terapeuta o prestador de servicios',
  ngo: 'Asociación civil',
  merchant: 'Comercio',
  wellness: 'Bienestar',
  legal: 'Servicios legales',
  caregiver: 'Cuidador',
  company: 'Empresa',
  tourism: 'Turismo',
};
const etiqueta = (t: string) => ETIQUETAS[t] ?? t;

const FUNCION = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reclamar-ficha`;

/** Envoltura común: centra el contenido y aplica el fondo de la app. */
function Marco({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl px-4 py-10">{children}</div>;
}

function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Marco>
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">{titulo}</h1>
        <div className="mt-3 space-y-3 text-muted">{children}</div>
      </div>
    </Marco>
  );
}

export function ReclamarFicha() {
  const { token = '' } = useParams<{ token: string }>();
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [estado, setEstado] = useState<Estado>('cargando');
  const [enviando, setEnviando] = useState(false);
  const [enlace, setEnlace] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<string>('');
  const [pidiendoBaja, setPidiendoBaja] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data, error } = await supabase.rpc('ficha_por_token', { p_token: token });
      if (!vivo) return;
      if (error) { console.error('[reclamar-ficha] rpc', error); setEstado('error'); return; }
      if (!data?.length) { setEstado('invalida'); return; }
      setFicha(data[0] as Ficha);
      setEstado('lista');
    })();
    return () => { vivo = false; };
  }, [token]);

  async function reclamar() {
    setEnviando(true);
    try {
      const r = await fetch(FUNCION, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // Sin esto Supabase responde 401 antes de que la función se ejecute.
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ token }),
      });
      const j = await r.json();
      if (!r.ok) {
        // Deja rastro del motivo real: un error genérico en pantalla sin detalle
        // en la consola cuesta rondas enteras de diagnóstico.
        console.error('[reclamar-ficha]', r.status, j);
        setEstado(r.status === 410 ? 'invalida' : 'error');
        return;
      }
      setEnlace(j.enlace || null);
      setEstado('reclamada');
    } catch (e) {
      console.error('[reclamar-ficha] la petición no salió del navegador:', e);
      setEstado('error');
    } finally {
      setEnviando(false);
    }
  }

  async function darDeBaja() {
    setEnviando(true);
    const { data, error } = await supabase.rpc('solicitar_baja_ficha', {
      p_token: token,
      p_motivo: motivo || null,
    });
    setEnviando(false);
    if (error || !data) { console.error('[reclamar-ficha] baja', error); setEstado('error'); return; }
    setEstado('dada_de_baja');
  }

  if (estado === 'cargando')
    return <Marco><p className="text-muted">Buscando la ficha…</p></Marco>;

  if (estado === 'invalida')
    return (
      <Aviso titulo="Esta invitación ya no está vigente">
        <p>Puede que alguien de tu equipo ya la haya usado, o que haya vencido.</p>
        <p>
          Escríbenos a{' '}
          <a className="font-medium text-brand-700 hover:underline" href="mailto:admin@neuromundi.com">
            admin@neuromundi.com
          </a>{' '}
          y lo resolvemos.
        </p>
      </Aviso>
    );

  if (estado === 'error')
    return (
      <Aviso titulo="Algo falló de nuestro lado">
        <p>Vuelve a intentarlo en un momento.</p>
        <p>
          Si sigue igual, escríbenos a{' '}
          <a className="font-medium text-brand-700 hover:underline" href="mailto:admin@neuromundi.com">
            admin@neuromundi.com
          </a>.
        </p>
      </Aviso>
    );

  if (estado === 'dada_de_baja')
    return (
      <Marco>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-sage-500" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Listo, tu ficha ya no aparece</h1>
              <p className="mt-3 text-muted">
                La quitamos del directorio en este momento. No hace falta que hagas nada más y no
                volveremos a escribirte sobre esto.
              </p>
              <p className="mt-3 text-sm text-slate-500">
                Si algún día cambias de opinión, puedes registrarte en{' '}
                <a className="font-medium text-brand-700 hover:underline" href="/crear-cuenta">
                  neuromundi.com
                </a>.
              </p>
            </div>
          </div>
        </div>
      </Marco>
    );

  if (!ficha) return null;

  if (estado === 'reclamada')
    return (
      <Marco>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-sage-500" />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900">Tu perfil ya es tuyo</h1>
              <p className="mt-3 text-muted">
                Creamos tu cuenta con <strong className="text-slate-900">{ficha.correo}</strong> y le
                pasamos los datos de la ficha. Falta que lo completes y lo publiques.
              </p>
              {enlace ? (
                <a
                  href={enlace}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 font-semibold text-white shadow-sm hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  Entrar y completar mi perfil
                  <ArrowRight className="h-4 w-4" />
                </a>
              ) : (
                <p className="mt-4 text-muted">Te mandamos un correo con el enlace de acceso.</p>
              )}
              <p className="mt-6 text-sm text-slate-500">
                Tu perfil no se muestra al público hasta que tú lo publiques.
              </p>
            </div>
          </div>
        </div>
      </Marco>
    );

  // ── estado 'lista' ────────────────────────────────────────────────────────
  const datos: Array<[string, string | null]> = [
    ['Tipo', etiqueta(ficha.provider_type)],
    ['Dirección', ficha.direccion],
    ['Ciudad', ficha.ciudad ? `${ficha.ciudad}${ficha.estado ? `, ${ficha.estado}` : ''}` : null],
    ['Teléfono', ficha.telefono],
    ['Sitio', ficha.sitio_web],
    ['Giro', ficha.especializacion],
  ];

  return (
    <Marco>
      <section className="rounded-3xl bg-gradient-to-br from-teal-600 to-emerald-600 p-8 text-white sm:p-10">
        <p className="text-sm/6 font-medium text-white/80">Invitación para {ficha.nombre}</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Tu lugar ya aparece en Neuromundi</h1>
        <p className="mt-4 max-w-2xl text-white/90">
          Hicimos una investigación en bases de datos públicas y redes sociales, y creemos que tu
          perfil es idóneo para ser promovido en nuestra comunidad internacional.
        </p>
      </section>

      <div className="mt-8 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 shrink-0 text-brand-600" />
          <h2 className="text-lg font-bold text-slate-900">{ficha.nombre}</h2>
        </div>
        <p className="mt-1 text-sm text-muted">Esto es lo que está publicado hoy.</p>

        <dl className="mt-5 grid gap-3 sm:grid-cols-[9rem_1fr]">
          {datos.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-sm font-medium text-muted">{k}</dt>
              <dd className="break-words text-slate-800">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-8">
        <h3 className="text-base font-semibold text-slate-900">¿Qué quieres hacer con ella?</h3>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reclamar}
            disabled={enviando}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 font-semibold text-white shadow-sm hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60"
          >
            {enviando ? 'Un momento…' : 'Es mío, quiero completarlo'}
          </button>
          <button
            type="button"
            onClick={() => setPidiendoBaja((v) => !v)}
            disabled={enviando}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Quitar mi ficha
          </button>
        </div>

        {pidiendoBaja && (
          <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warm-500" />
              <div className="w-full">
                <p className="text-slate-800">
                  La quitamos ahora mismo, sin preguntar más. Si quieres decirnos por qué, nos sirve
                  para no repetir el error.
                </p>
                <input
                  type="text"
                  value={motivo}
                  maxLength={200}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Opcional — por ejemplo: los datos no son correctos"
                  className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={darDeBaja}
                  disabled={enviando}
                  className="mt-3 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  Confirmar y quitar mi ficha
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="mt-8 text-sm text-slate-500">
          Al completar tu perfil aceptas el{' '}
          <a className="text-brand-700 hover:underline" href="/reglamento">reglamento</a> y el{' '}
          <a className="text-brand-700 hover:underline" href="/privacidad">aviso de privacidad</a>.
          Puedes conocer y ejercer tus derechos sobre estos datos en{' '}
          <a className="text-brand-700 hover:underline" href="/proteccion-datos">protección de datos</a>.
        </p>
      </div>
    </Marco>
  );
}
