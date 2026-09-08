/**
 * Página de reclamo de ficha · Neuromundi
 *
 * La recibe quien abre el enlace de la invitación: /reclamar/:token
 *
 * Tres cosas que hace a propósito:
 *   1. Enseña la ficha COMO SE VE PUBLICADA, antes de pedir nada. Quien llega
 *      aquí no pidió estar en el directorio; lo primero que merece es ver qué
 *      hay publicado sobre su negocio.
 *   2. Dice de dónde salieron los datos, con nombre y liga a la fuente.
 *   3. Los dos botones pesan igual. "Quitar mi ficha" no está escondido en
 *      letra chica: es la mitad de la decisión, y funciona sin crear cuenta.
 *
 * Ruta sugerida, junto a las que ya existen:
 *   <Route path="/reclamar/:token" element={<ReclamarFicha />} />
 */

import { useEffect, useState } from 'react';

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
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import './reclamar-ficha.css';

const FUNCION = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reclamar-ficha`;

export function ReclamarFicha() {
  const { token = '' } = useParams<{ token: string }>();
  const [ficha, setFicha]   = useState<Ficha | null>(null);
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
      if (error)            { setEstado('error');    return; }
      if (!data?.length)    { setEstado('invalida'); return; }
      setFicha(data[0] as Ficha); setEstado('lista');
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
      if (!r.ok) { setEstado(r.status === 410 ? 'invalida' : 'error'); return; }
      setEnlace(j.enlace || null);
      setEstado('reclamada');
    } catch { setEstado('error'); }
    finally { setEnviando(false); }
  }

  async function darDeBaja() {
    setEnviando(true);
    const { data, error } = await supabase.rpc('solicitar_baja_ficha',
      { p_token: token, p_motivo: motivo || null });
    setEnviando(false);
    if (error || !data) { setEstado('error'); return; }
    setEstado('dada_de_baja');
  }

  if (estado === 'cargando') return <div className="rf"><p className="rf-espera">Buscando la ficha…</p></div>;

  if (estado === 'invalida') return (
    <div className="rf">
      <div className="rf-caja">
        <h1>Esta invitación ya no está vigente</h1>
        <p>Puede que alguien de tu equipo ya la haya usado, o que haya vencido.
           Escríbenos a <a href="mailto:admin@admin.neuromundi.com">admin@admin.neuromundi.com</a> y
           lo resolvemos.</p>
      </div>
    </div>
  );

  if (estado === 'error') return (
    <div className="rf">
      <div className="rf-caja">
        <h1>Algo falló de nuestro lado</h1>
        <p>Vuelve a intentarlo en un momento. Si sigue igual, escríbenos a
           <a href="mailto:admin@admin.neuromundi.com"> admin@admin.neuromundi.com</a>.</p>
      </div>
    </div>
  );

  if (estado === 'dada_de_baja') return (
    <div className="rf">
      <div className="rf-caja">
        <h1>Listo, tu ficha ya no aparece</h1>
        <p>La quitamos del directorio en este momento. No hace falta que hagas nada más
           y no volveremos a escribirte sobre esto.</p>
        <p className="rf-fino">Si algún día cambias de opinión, puedes registrarte
           normalmente en <a href="/crear-cuenta">neuromundi.com</a>.</p>
      </div>
    </div>
  );

  // A partir de aquí la ficha ya se cargó; el guardia lo hace explícito.
  if (!ficha) return null;

  if (estado === 'reclamada') return (
    <div className="rf">
      <div className="rf-caja">
        <h1>Tu perfil ya es tuyo</h1>
        <p>Creamos tu cuenta con <strong>{ficha.correo}</strong> y le pasamos los datos
           de la ficha. Falta que lo completes y lo publiques.</p>
        {enlace
          ? <a className="rf-boton rf-principal" href={enlace}>Entrar y completar mi perfil</a>
          : <p>Te mandamos un correo con el enlace de acceso.</p>}
        <p className="rf-fino">Tu perfil no se muestra al público hasta que tú lo publiques.</p>
      </div>
    </div>
  );

  // ── estado 'lista' ────────────────────────────────────────────────────────
  return (
    <div className="rf">
      <div className="rf-caja">
        <p className="rf-antetitulo">Invitación para {ficha.nombre}</p>
        <h1>Tu lugar ya aparece en Neuromundi</h1>
        <p>Hemos realizado una profunda investigación y creemos que tu perfil es
           idóneo para ser promovido en nuestra comunidad internacional. Esto es lo
           que está publicado hoy.</p>

        <div className="rf-ficha">
          <h2>{ficha.nombre}</h2>
          <dl>
            <div><dt>Tipo</dt><dd>{etiqueta(ficha.provider_type)}</dd></div>
            {ficha.direccion    && <div><dt>Dirección</dt><dd>{ficha.direccion}</dd></div>}
            {ficha.ciudad       && <div><dt>Ciudad</dt><dd>{ficha.ciudad}, {ficha.estado}</dd></div>}
            {ficha.telefono     && <div><dt>Teléfono</dt><dd>{ficha.telefono}</dd></div>}
            {ficha.sitio_web    && <div><dt>Sitio</dt><dd>{ficha.sitio_web}</dd></div>}
            {ficha.especializacion && <div><dt>Giro</dt><dd>{ficha.especializacion}</dd></div>}
          </dl>
          <p className="rf-fuente">
            Fuente: {ficha.fuente === 'denue'
              ? <>Directorio Estadístico Nacional de Unidades Económicas (DENUE) del INEGI,
                  registro público. <a href={ficha.fuente_url ?? undefined} target="_blank" rel="noreferrer">Consultarlo</a></>
              : <>investigación propia a partir de fuentes públicas</>}
          </p>
        </div>

        <p className="rf-pregunta">¿Qué quieres hacer con ella?</p>

        <div className="rf-botones">
          <button className="rf-boton rf-principal" onClick={reclamar} disabled={enviando}>
            {enviando ? 'Un momento…' : 'Es mío, quiero completarlo'}
          </button>
          <button className="rf-boton rf-secundario"
                  onClick={() => setPidiendoBaja((v) => !v)} disabled={enviando}>
            Quitar mi ficha
          </button>
        </div>

        {pidiendoBaja && (
          <div className="rf-baja">
            <p>La quitamos ahora mismo, sin preguntar más. Si quieres decirnos por qué,
               nos sirve para no repetir el error:</p>
            <input type="text" value={motivo} maxLength={200}
                   onChange={(e) => setMotivo(e.target.value)}
                   placeholder="Opcional — por ejemplo: los datos no son correctos" />
            <button className="rf-boton rf-peligro" onClick={darDeBaja} disabled={enviando}>
              Confirmar y quitar mi ficha
            </button>
          </div>
        )}

        <p className="rf-fino">
          Al completar tu perfil aceptas el <a href="/reglamento">reglamento</a> y
          el <a href="/privacidad">aviso de privacidad</a>. Puedes conocer y ejercer tus
          derechos sobre estos datos en <a href="/proteccion-datos">protección de datos</a>.
        </p>
      </div>
    </div>
  );
}

const ETIQUETAS: Record<string, string> = {
  clinic: 'Clínica o consultorio', school: 'Escuela o centro educativo',
  service_provider: 'Terapeuta o prestador de servicios', ngo: 'Asociación civil',
  merchant: 'Comercio', wellness: 'Bienestar', legal: 'Servicios legales',
  caregiver: 'Cuidador', company: 'Empresa', tourism: 'Turismo',
};
const etiqueta = (t: string) => ETIQUETAS[t] ?? t;
