/**
 * EventosPropios — el prestador propone un evento y ve en qué quedó.
 *
 * (Decisión de Enyoria, 16 oct 2026.) La propuesta nace pendiente y sin
 * publicar; sólo la aprobación del administrador la pone en la página de
 * eventos. Mientras sigue pendiente puede corregirla o retirarla.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarPlus, RefreshCw, Trash2, Clock, Check, X } from 'lucide-react';
import { Button, SkeletonCard, AvisoDeFallo } from '@/components/ui';
import { useEventosPropios } from '@/hooks/useEventosPropios';
import { useAvisarResultado } from '@/hooks/useAvisarResultado';
import { EVENT_CATEGORIES } from '@/hooks/useEvents';
import { ZONAS_HORARIAS } from '@/data/zonasHorarias';
import { instanteDesdeHoraLocal } from '@/lib/horaEvento';
import { formatDate } from '@/lib/utils';
import { SectionPicker } from '@/components/common/SectionPicker';

const inputCls =
  'w-full rounded-xl border border-slate-200 p-3 text-base ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const labelCls = 'mb-1 block text-sm font-semibold text-slate-900';

const ICONO = {
  pendiente: <Clock className="h-4 w-4" aria-hidden="true" />,
  aprobado: <Check className="h-4 w-4" aria-hidden="true" />,
  rechazado: <X className="h-4 w-4" aria-hidden="true" />,
} as const;

export function EventosPropios() {
  const { t } = useTranslation();
  const { items, loading, fallo, reload, proponer, retirar, pendientes } = useEventosPropios();
  const avisar = useAvisarResultado();

  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('workshop');
  const [isOnline, setIsOnline] = useState(false);
  const [onlineUrl, setOnlineUrl] = useState('');
  const [infoUrl, setInfoUrl] = useState('');
  // Las tres áreas de Neuromundi: las marca quien propone el evento.
  const [secs, setSecs] = useState<string[]>([]);
  const [zona, setZona] = useState('');
  const [horaConfirmada, setHoraConfirmada] = useState(true);
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [venue, setVenue] = useState('');
  const [starts, setStarts] = useState('');
  const [ends, setEnds] = useState('');
  const [description, setDescription] = useState('');

  const limpiar = () => {
    setTitle(''); setCategory('workshop'); setIsOnline(false); setOnlineUrl('');
    setCountry(''); setCity(''); setVenue(''); setStarts(''); setEnds(''); setDescription(''); setInfoUrl(''); setSecs([]);
    setZona(''); setHoraConfirmada(true);
  };

  // `datetime-local` entrega hora de pared sin zona. Si el prestador eligió la
  // zona del evento, esa hora se lee en esa zona; si no, en la del navegador.
  const aIso = (v: string): string | null => {
    if (!v) return null;
    const iso = instanteDesdeHoraLocal(v, zona || null);
    return Number.isNaN(new Date(iso).getTime()) ? null : iso;
  };

  const enviar = async () => {
    const inicio = aIso(starts);
    if (!inicio) { await avisar(Promise.resolve({ ok: false, error: t('events.err.sinFecha') })); return; }
    setEnviando(true);
    const ok = await avisar(
      proponer(
        {
          title, starts_at: inicio,
          description: description || null,
          category,
          is_online: isOnline,
          online_url: isOnline ? onlineUrl : null,
          info_url: infoUrl.trim() || null,
          sections: secs,
          timezone: zona || null,
          hora_confirmada: horaConfirmada,
          country: isOnline ? null : country,
          city: isOnline ? null : city,
          venue: isOnline ? null : venue,
          ends_at: aIso(ends),
        },
        (clave) => t(clave),
      ),
      t('events.mine.enviada'),
    );
    setEnviando(false);
    if (ok) { limpiar(); setAbierto(false); }
  };

  if (loading) return <div className="space-y-3"><SkeletonCard rows={0} /><SkeletonCard rows={0} /></div>;
  if (fallo) return <AvisoDeFallo onRetry={() => void reload()} />;

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
        {t('events.mine.aviso')}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">{t('events.mine.pendientes', { n: pendientes })}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => void reload()} leadingIcon={<RefreshCw className="h-4 w-4" />}>
            {t('common.refresh')}
          </Button>
          <Button size="sm" onClick={() => setAbierto((v) => !v)} leadingIcon={<CalendarPlus className="h-4 w-4" />}>
            {t('events.mine.proponer')}
          </Button>
        </div>
      </div>

      {abierto && (
        <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div>
            <label htmlFor="ev-title" className={labelCls}>{t('events.fTitle')}</label>
            <input id="ev-title" className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
          </div>

          <div>
            <label htmlFor="ev-cat" className={labelCls}>{t('events.mine.categoria')}</label>
            <select id="ev-cat" className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{t(`events.cat.${c}`)}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-3 text-sm font-semibold text-slate-900">
            <input type="checkbox" className="h-5 w-5" checked={isOnline} onChange={(e) => setIsOnline(e.target.checked)} />
            {t('events.isOnline')}
          </label>

          {isOnline ? (
            <div>
              <label htmlFor="ev-url" className={labelCls}>{t('events.fUrl')}</label>
              <input id="ev-url" className={inputCls} value={onlineUrl} onChange={(e) => setOnlineUrl(e.target.value)}
                placeholder="https://" inputMode="url" maxLength={500} />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="ev-country" className={labelCls}>{t('events.fCountry')}</label>
                <input id="ev-country" className={inputCls} value={country} onChange={(e) => setCountry(e.target.value)} maxLength={80} />
              </div>
              <div>
                <label htmlFor="ev-city" className={labelCls}>{t('events.fCity')}</label>
                <input id="ev-city" className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} maxLength={120} />
              </div>
              <div>
                <label htmlFor="ev-venue" className={labelCls}>{t('events.fVenue')}</label>
                <input id="ev-venue" className={inputCls} value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={160} />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="ev-zone" className={labelCls}>{t('events.fZone')}</label>
            <select id="ev-zone" className={inputCls} value={zona} onChange={(e) => setZona(e.target.value)}>
              <option value="">{t('events.fZoneReader')}</option>
              {ZONAS_HORARIAS.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-3 text-sm font-semibold text-slate-900">
            <input type="checkbox" className="h-5 w-5" checked={!horaConfirmada} onChange={(e) => setHoraConfirmada(!e.target.checked)} />
            {t('events.fTimeTbc')}
          </label>

          <div>
            <label htmlFor="ev-info-url" className={labelCls}>{t('events.fInfoUrl')}</label>
            <input id="ev-info-url" className={inputCls} value={infoUrl} onChange={(e) => setInfoUrl(e.target.value)}
              placeholder="https://" inputMode="url" maxLength={500} />
          </div>

          <SectionPicker value={secs} onChange={setSecs} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="ev-starts" className={labelCls}>{t('events.fStarts')}</label>
              <input id="ev-starts" type="datetime-local" className={inputCls} value={starts} onChange={(e) => setStarts(e.target.value)} />
            </div>
            <div>
              <label htmlFor="ev-ends" className={labelCls}>{t('events.fEnds')}</label>
              <input id="ev-ends" type="datetime-local" className={inputCls} value={ends} onChange={(e) => setEnds(e.target.value)} />
            </div>
          </div>

          <div>
            <label htmlFor="ev-desc" className={labelCls}>{t('events.fDescription')}</label>
            <textarea id="ev-desc" className={inputCls} rows={4} value={description}
              onChange={(e) => setDescription(e.target.value)} maxLength={4000} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button loading={enviando} onClick={() => void enviar()}>{t('events.mine.enviar')}</Button>
            <Button variant="secondary" onClick={() => { limpiar(); setAbierto(false); }}>{t('common.cancel')}</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-muted">
          {t('events.mine.vacia')}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((e) => (
            <li key={e.id} className={`rounded-2xl border border-slate-100 p-4 shadow-sm ${e.revision === 'pendiente' ? 'bg-white' : 'bg-slate-50'}`}>
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  {ICONO[e.revision]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {e.title}
                    <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {t(`events.rev.${e.revision}`)}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(e.starts_at)}
                    {e.is_online ? ` · ${t('events.online')}` : ` · ${[e.venue, e.city, e.country].filter(Boolean).join(', ')}`}
                  </p>
                  {e.sections.length > 0 && (
                    <p className="mt-1 flex flex-wrap gap-1.5">
                      {e.sections.map((sec) => (
                        <span key={sec} className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {t(`sections.${sec}.name`)}
                        </span>
                      ))}
                    </p>
                  )}
                  {e.nota_admin && (
                    <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-700">{e.nota_admin}</p>
                  )}
                  {e.revision === 'pendiente' && (
                    <div className="mt-3">
                      <Button size="sm" variant="secondary" leadingIcon={<Trash2 className="h-4 w-4" />}
                        onClick={() => void avisar(retirar(e.id), t('events.mine.retirada'))}>
                        {t('events.mine.retirar')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
