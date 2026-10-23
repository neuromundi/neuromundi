/**
 * HomeBlogEvents — dos fichas contiguas en la portada que asoman el blog y los
 * eventos con ejemplos reales.
 *
 * Por qué (decisión de Enyoria, 19 oct 2026): las dos secciones vivían sólo en
 * el menú, así que el visitante nuevo no se percataba de que existen. Van
 * ARRIBA de «¿Qué es Neuromundi?», donde la persona todavía está decidiendo si
 * la plataforma le sirve: ver un artículo y un evento concretos responde esa
 * pregunta mejor que un párrafo.
 *
 * Son ejemplos, no un listado: tres de cada uno, con su portada en miniatura, y
 * el enlace a la sección completa. Toda la ficha es clicable para quien quiera
 * entrar directo.
 *
 * Si una de las dos está vacía, su ficha dice qué habrá ahí en vez de
 * desaparecer: el objetivo es justamente que la persona sepa que la sección
 * existe. Si la consulta FALLA, la portada no pinta el bloque (lo decide Home),
 * porque un fallo no es «no hay nada».
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, CalendarDays, ArrowRight, Globe2, MapPin } from 'lucide-react';
import { useHomePeek, type PeekPost, type PeekEvent } from '@/hooks/useHomePeek';
import { fechaDeEvento } from '@/lib/horaEvento';
import { safeHttpUrl } from '@/lib/safeUrl';
import { trackHomeClick } from '@/lib/homeTrack';

const MINIATURA = 'h-14 w-14 shrink-0 rounded-xl object-cover';
const MINIATURA_VACIA = 'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-slate-100 text-brand-300';

function Ficha({
  icono,
  titulo,
  cuerpo,
  verTodo,
  destino,
  track,
  children,
}: {
  icono: React.ReactNode;
  titulo: string;
  cuerpo: string;
  verTodo: string;
  destino: string;
  track: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          {icono}
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-900">{titulo}</h2>
          <p className="mt-1 text-sm text-muted">{cuerpo}</p>
        </div>
      </div>

      <ul className="mt-4 space-y-3">{children}</ul>

      <Link
        to={destino}
        onClick={() => trackHomeClick(track)}
        className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-brand-700 hover:text-brand-800"
      >
        {verTodo} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
      </Link>
    </section>
  );
}

function RenglonBlog({ p }: { p: PeekPost }) {
  const esEnlace = p.type === 'link' && !!p.external_url;
  const interior = (
    <div className="flex items-center gap-3">
      {p.cover_url ? (
        <img loading="lazy" decoding="async" width={56} height={56} src={p.cover_url} alt="" className={MINIATURA} />
      ) : (
        <span className={MINIATURA_VACIA}><BookOpen className="h-6 w-6" aria-hidden="true" /></span>
      )}
      <span className="line-clamp-2 text-sm font-medium text-slate-800 group-hover:text-brand-700">{p.title}</span>
    </div>
  );
  return (
    <li className="group" onClick={() => trackHomeClick('blog-item')}>
      {esEnlace ? (
        <a href={safeHttpUrl(p.external_url)} target="_blank" rel="noopener noreferrer">{interior}</a>
      ) : (
        <Link to={`/contenido/${p.id}`}>{interior}</Link>
      )}
    </li>
  );
}

function RenglonEvento({ ev, idioma }: { ev: PeekEvent; idioma: string }) {
  const { t } = useTranslation();
  const lugar = ev.is_online ? null : [ev.city, ev.country].filter(Boolean).join(', ');
  return (
    <li className="group" onClick={() => trackHomeClick('evento-item')}>
      <Link to="/eventos" className="flex items-center gap-3">
        {ev.cover_url ? (
          <img loading="lazy" decoding="async" width={56} height={56} src={ev.cover_url} alt="" className={MINIATURA} />
        ) : (
          <span className={MINIATURA_VACIA}><CalendarDays className="h-6 w-6" aria-hidden="true" /></span>
        )}
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-brand-700">
            {fechaDeEvento(ev.starts_at, { zona: ev.timezone, conHora: ev.hora_confirmada, idioma })}
          </span>
          <span className="line-clamp-2 text-sm font-medium text-slate-800 group-hover:text-brand-700">{ev.title}</span>
          <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
            {ev.is_online ? (
              <><Globe2 className="h-3 w-3" aria-hidden="true" /> {t('events.online')}</>
            ) : lugar ? (
              <><MapPin className="h-3 w-3" aria-hidden="true" /> {lugar}</>
            ) : null}
          </span>
        </span>
      </Link>
    </li>
  );
}

export function HomeBlogEvents() {
  const { t, i18n } = useTranslation();
  const { posts, events, loading, fallo } = useHomePeek();

  // Un fallo de la consulta no se pinta como sección vacía.
  if (fallo) return null;

  if (loading) {
    return (
      <div className="mt-16 grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-16 grid items-stretch gap-6 lg:grid-cols-2">
      <Ficha
        icono={<BookOpen className="h-5 w-5" aria-hidden="true" />}
        titulo={t('home.peek.blogTitle')}
        cuerpo={t('home.peek.blogBody')}
        verTodo={t('home.peek.blogCta')}
        destino="/blog"
        track="blog-ver-todo"
      >
        {posts.length > 0
          ? posts.map((p) => <RenglonBlog key={p.id} p={p} />)
          : <li className="text-sm text-muted">{t('home.peek.blogEmpty')}</li>}
      </Ficha>

      <Ficha
        icono={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
        titulo={t('home.peek.eventsTitle')}
        cuerpo={t('home.peek.eventsBody')}
        verTodo={t('home.peek.eventsCta')}
        destino="/eventos"
        track="eventos-ver-todo"
      >
        {events.length > 0
          ? events.map((ev) => <RenglonEvento key={ev.id} ev={ev} idioma={i18n.language} />)
          : <li className="text-sm text-muted">{t('home.peek.eventsEmpty')}</li>}
      </Ficha>
    </div>
  );
}
