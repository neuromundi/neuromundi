/**
 * Events — Eventos de la comunidad (/eventos).
 *
 * Eventos curados por la administración: presenciales (país/ciudad/lugar) o en
 * línea. Buscador por país (filtro global reutilizado), texto y modalidad. Cada
 * evento se puede agregar al calendario personal y exportar a un calendario
 * externo (.ics / Google). El administrador puede crear, editar y eliminar.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, MapPin, Globe2, Search, Plus, CalendarPlus, Check, Download, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { Button, Modal, useToast, EmptyState, SkeletonCard } from '@/components/ui';
import { CountryFilter } from '@/components/common/CountryFilter';
import { useCountry } from '@/stores/countryStore';
import { useAuth } from '@/hooks/useAuth';
import { useEvents, EVENT_CATEGORIES, type EventItem, type EventInput } from '@/hooks/useEvents';
import { useCalendar } from '@/hooks/useCalendar';
import { COUNTRIES } from '@/data/countries';
import { googleCalendarUrl, downloadICS } from '@/lib/calendar';
import { filterEvents, eventToCalendarEvent, toLocalDatetimeInput } from '@/lib/calendarView';
import { cn } from '@/lib/utils';

const inputCls =
  'w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function Events() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { country } = useCountry();
  const { isAuthenticated, isAdmin } = useAuth();
  const { events, loading, createEvent, updateEvent, deleteEvent } = useEvents();
  const { savedEventIds, saveEventToCalendar } = useCalendar();

  const [q, setQ] = useState('');
  const [mode, setMode] = useState<'all' | 'presencial' | 'online'>('all');
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [creating, setCreating] = useState(false);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language, {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });

  const term = q.trim().toLowerCase();
  const filtered = useMemo(
    () => filterEvents(events, { mode, country, term }),
    [events, mode, country, term],
  );

  const onSave = async (ev: EventItem) => {
    if (!isAuthenticated) { toast.error(t('events.needLogin')); return; }
    const r = await saveEventToCalendar(ev);
    toast[r.ok ? 'success' : 'error'](r.ok ? t('events.added') : r.error);
  };

  const onDelete = async (ev: EventItem) => {
    const r = await deleteEvent(ev.id);
    if (!r.ok) toast.error(r.error);
    else toast.success(t('events.deleted'));
  };

  const Card = ({ ev }: { ev: EventItem }) => {
    const saved = savedEventIds.has(ev.id);
    const cal = eventToCalendarEvent(ev);
    return (
      <article className="flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
          <CalendarDays className="h-4 w-4" aria-hidden="true" /> {fmt(ev.starts_at)}
        </div>
        <h3 className="mt-1 font-bold text-slate-900">{ev.title}</h3>
        {ev.category && <p className="text-xs text-muted">{t(`events.cat.${ev.category}`)}</p>}
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
          {ev.is_online ? (
            <><Globe2 className="h-4 w-4 text-sage-600" aria-hidden="true" /> {t('events.online')}</>
          ) : (
            <><MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" /> {[ev.venue, ev.city, ev.country].filter(Boolean).join(', ') || t('events.inPerson')}</>
          )}
        </p>
        {ev.description && <p className="mt-2 line-clamp-3 text-sm text-slate-600">{ev.description}</p>}
        {!ev.is_published && <p className="mt-1 text-xs font-semibold text-warm-700">{t('events.draft')}</p>}

        <div className="mt-auto space-y-2 pt-3">
          <Button
            fullWidth
            variant={saved ? 'secondary' : 'primary'}
            disabled={saved}
            onClick={() => onSave(ev)}
            leadingIcon={saved ? <Check className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
          >
            {saved ? t('events.inCalendar') : t('events.addToCalendar')}
          </Button>
          <div className="flex flex-wrap gap-2">
            <a
              href={googleCalendarUrl(cal)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-brand-700 hover:underline"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> Google
            </a>
            <button
              type="button"
              onClick={() => downloadICS(cal, 'evento-neuromundi.ics')}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-brand-700 hover:underline"
            >
              <Download className="h-4 w-4" aria-hidden="true" /> {t('events.ics')}
            </button>
            {ev.is_online && ev.online_url && (
              <a href={ev.online_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-sage-700 hover:underline">
                <Globe2 className="h-4 w-4" aria-hidden="true" /> {t('events.join')}
              </a>
            )}
          </div>
          {isAdmin && (
            <div className="flex gap-2 border-t border-slate-100 pt-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(ev)} leadingIcon={<Pencil className="h-4 w-4" />}>{t('common.edit')}</Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(ev)} leadingIcon={<Trash2 className="h-4 w-4" />}>{t('common.delete')}</Button>
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-indigo-600 to-indigo-800 p-8 text-white shadow-lg">
        <CalendarDays className="h-10 w-10 opacity-90" aria-hidden="true" />
        <h1 className="mt-3 text-3xl font-extrabold">{t('events.title')}</h1>
        <p className="mt-2 max-w-xl text-white/90">{t('events.subtitle')}</p>
      </section>

      <CountryFilter id="events-country" />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('events.searchPlaceholder')}
            aria-label={t('events.searchPlaceholder')}
            className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label={t('events.modality')}>
          {(['all', 'presencial', 'online'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={cn('rounded-lg px-3 py-1.5 text-sm font-semibold', mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-muted')}
            >
              {t(`events.mode_${m}`)}
            </button>
          ))}
        </div>
        {isAdmin && (
          <Button onClick={() => setCreating(true)} leadingIcon={<Plus className="h-4 w-4" />}>{t('events.create')}</Button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard rows={2} /><SkeletonCard rows={2} /><SkeletonCard rows={2} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<CalendarDays className="h-6 w-6" />} title={t('events.emptyTitle')} description={t('events.empty')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ev) => <Card key={ev.id} ev={ev} />)}
        </div>
      )}

      {(creating || editing) && (
        <EventForm
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSubmit={async (input) => {
            const r = editing ? await updateEvent(editing.id, input) : await createEvent(input);
            if (r.ok) { toast.success(t('events.saved')); setCreating(false); setEditing(null); }
            else toast.error(r.error);
          }}
        />
      )}
    </main>
  );
}

// ── Formulario admin ────────────────────────────────────────────────────────
function EventForm({
  initial,
  onClose,
  onSubmit,
}: {
  initial: EventItem | null;
  onClose: () => void;
  onSubmit: (input: EventInput) => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'workshop');
  const [isOnline, setIsOnline] = useState(initial?.is_online ?? false);
  const [onlineUrl, setOnlineUrl] = useState(initial?.online_url ?? '');
  const [ctry, setCtry] = useState(initial?.country ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [venue, setVenue] = useState(initial?.venue ?? '');
  const [starts, setStarts] = useState(toLocalDatetimeInput(initial?.starts_at ?? null));
  const [ends, setEnds] = useState(toLocalDatetimeInput(initial?.ends_at ?? null));
  const [description, setDescription] = useState(initial?.description ?? '');
  const [published, setPublished] = useState(initial?.is_published ?? true);

  const countries = useMemo(() => {
    let display: (c: string) => string = (c) => c;
    try { const dn = new Intl.DisplayNames([i18n.language], { type: 'region' }); display = (c) => dn.of(c) ?? c; } catch { /* noop */ }
    return COUNTRIES.map((c) => ({ value: c.name, label: display(c.code) || c.name })).sort((a, b) => a.label.localeCompare(b.label, i18n.language));
  }, [i18n.language]);

  const submit = async () => {
    if (!title.trim() || !starts) return;
    setBusy(true);
    await onSubmit({
      title: title.trim(),
      category,
      is_online: isOnline,
      online_url: isOnline ? (onlineUrl.trim() || null) : null,
      country: isOnline ? null : (ctry || null),
      city: isOnline ? null : (city.trim() || null),
      venue: isOnline ? null : (venue.trim() || null),
      starts_at: new Date(starts).toISOString(),
      ends_at: ends ? new Date(ends).toISOString() : null,
      description: description.trim() || null,
      is_published: published,
    });
    setBusy(false);
  };

  return (
    <Modal open onClose={onClose} title={initial ? t('events.editTitle') : t('events.create')}>
      <div className="space-y-3">
        <input className={inputCls} placeholder={t('events.fTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
          {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{t(`events.cat.${c}`)}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="h-5 w-5" checked={isOnline} onChange={(e) => setIsOnline(e.target.checked)} /> {t('events.isOnline')}
        </label>
        {isOnline ? (
          <input className={inputCls} placeholder={t('events.fUrl')} value={onlineUrl} onChange={(e) => setOnlineUrl(e.target.value)} />
        ) : (
          <>
            <select className={inputCls} value={ctry} onChange={(e) => setCtry(e.target.value)}>
              <option value="">{t('events.fCountry')}</option>
              {countries.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input className={inputCls} placeholder={t('events.fCity')} value={city} onChange={(e) => setCity(e.target.value)} />
            <input className={inputCls} placeholder={t('events.fVenue')} value={venue} onChange={(e) => setVenue(e.target.value)} />
          </>
        )}
        <label className="block text-sm font-semibold text-slate-700">{t('events.fStarts')}
          <input type="datetime-local" className={inputCls} value={starts} onChange={(e) => setStarts(e.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">{t('events.fEnds')}
          <input type="datetime-local" className={inputCls} value={ends} onChange={(e) => setEnds(e.target.value)} />
        </label>
        <textarea rows={3} className={inputCls} placeholder={t('events.fDescription')} value={description} onChange={(e) => setDescription(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="h-5 w-5" checked={published} onChange={(e) => setPublished(e.target.checked)} /> {t('events.fPublished')}
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button loading={busy} disabled={!title.trim() || !starts} onClick={submit}>{t('common.save')}</Button>
        </div>
      </div>
    </Modal>
  );
}
