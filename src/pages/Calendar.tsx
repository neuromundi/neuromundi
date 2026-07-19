/**
 * Calendar — Calendario personal (/calendario, requiere sesión).
 *
 * Reúne en un solo lugar los eventos guardados, las citas agendadas y las
 * terapias/entradas propias del usuario. Dos vistas: lista de agenda y
 * cuadrícula mensual. Permite agregar entradas y exportarlas a un calendario
 * externo (.ics / Google).
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, CalendarRange, List, Plus, Trash2, MapPin, Globe2, Stethoscope, HeartPulse, NotebookPen, ChevronLeft, ChevronRight, Download, ExternalLink } from 'lucide-react';
import { Button, Modal, useToast, EmptyState, SkeletonCard } from '@/components/ui';
import { useCalendar, type CalendarItem, type EntryKind } from '@/hooks/useCalendar';
import { AppointmentRequests } from '@/components/calendar/AppointmentRequests';
import { googleCalendarUrl, downloadICS } from '@/lib/calendar';
import { groupItemsByDay, buildMonthCells, itemToCalendarEvent } from '@/lib/calendarView';
import { cn } from '@/lib/utils';

const inputCls =
  'w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

const KIND_ICON: Record<EntryKind, typeof CalendarDays> = {
  event: CalendarDays,
  appointment: Stethoscope,
  therapy: HeartPulse,
  personal: NotebookPen,
};

export function Calendar() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { items, loading, addEntry, removeEntry } = useCalendar();
  const [view, setView] = useState<'agenda' | 'month'>('agenda');
  const [adding, setAdding] = useState(false);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const kindLabel = (k: EntryKind) => t(`calendar.kind_${k}`);
  const timeFmt = (iso: string) => new Date(iso).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  const dayFmt = (iso: string) => new Date(iso).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' });

  const onRemove = async (id: string) => {
    const r = await removeEntry(id);
    if (r.ok) toast.success(t('calendar.removed')); else toast.error(r.error);
  };

  const Row = ({ it }: { it: CalendarItem }) => {
    const Icon = KIND_ICON[it.kind];
    const cal = itemToCalendarEvent(it);
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{kindLabel(it.kind)} · {timeFmt(it.starts_at)}</p>
          <p className="font-semibold text-slate-900">{it.title || kindLabel(it.kind)}</p>
          {(it.location || it.online_url) && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-600">
              {it.online_url ? <Globe2 className="h-3.5 w-3.5 text-sage-600" aria-hidden="true" /> : <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />}
              {it.online_url ? <a href={it.online_url} target="_blank" rel="noopener noreferrer" className="text-sage-700 hover:underline">{t('events.join')}</a> : it.location}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-2">
            <a href={googleCalendarUrl(cal)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Google
            </a>
            <button type="button" onClick={() => downloadICS(cal, 'entrada-neuromundi.ics')} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
              <Download className="h-3.5 w-3.5" aria-hidden="true" /> {t('events.ics')}
            </button>
          </div>
        </div>
        {it.editable && it.entryId && (
          <button type="button" onClick={() => onRemove(it.entryId!)} aria-label={t('common.delete')} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  };

  // Agrupación por día para la vista de agenda.
  const grouped = useMemo(() => groupItemsByDay(items), [items]);

  // Celdas del mes para la vista de cuadrícula.
  const monthCells = useMemo(() => buildMonthCells(cursor.getFullYear(), cursor.getMonth(), items), [cursor, items]);

  const weekdays = useMemo(() => {
    const base = new Date(2024, 0, 1); // lunes
    return Array.from({ length: 7 }, (_, i) => new Date(base.getTime() + i * 86400000).toLocaleDateString(i18n.language, { weekday: 'short' }));
  }, [i18n.language]);

  const monthLabel = cursor.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });
  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <CalendarDays className="h-6 w-6 text-brand-600" aria-hidden="true" /> {t('calendar.title')}
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label={t('calendar.view')}>
            <button type="button" onClick={() => setView('agenda')} aria-pressed={view === 'agenda'} className={cn('inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold', view === 'agenda' ? 'bg-white text-slate-900 shadow-sm' : 'text-muted')}>
              <List className="h-4 w-4" /> {t('calendar.agenda')}
            </button>
            <button type="button" onClick={() => setView('month')} aria-pressed={view === 'month'} className={cn('inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold', view === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-muted')}>
              <CalendarRange className="h-4 w-4" /> {t('calendar.month')}
            </button>
          </div>
          <Button onClick={() => setAdding(true)} leadingIcon={<Plus className="h-4 w-4" />}>{t('calendar.add')}</Button>
        </div>
      </div>

      <p className="text-sm text-muted">{t('calendar.intro')}</p>

      <AppointmentRequests />

      {loading ? (
        <div className="space-y-3"><SkeletonCard rows={1} /><SkeletonCard rows={1} /></div>
      ) : view === 'agenda' ? (
        items.length === 0 ? (
          <EmptyState icon={<CalendarDays className="h-6 w-6" />} title={t('calendar.emptyTitle')} description={t('calendar.empty')} />
        ) : (
          <div className="space-y-5">
            {grouped.map((grp) => (
              <section key={grp.day}>
                <h2 className="mb-2 text-sm font-bold capitalize text-slate-700">{dayFmt(grp.iso)}</h2>
                <div className="space-y-2">{grp.items.map((it) => <Row key={it.key} it={it} />)}</div>
              </section>
            ))}
          </div>
        )
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label={t('calendar.prevMonth')} className="rounded-lg p-2 hover:bg-slate-100"><ChevronLeft className="h-5 w-5" /></button>
            <span className="font-bold capitalize text-slate-900">{monthLabel}</span>
            <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label={t('calendar.nextMonth')} className="rounded-lg p-2 hover:bg-slate-100"><ChevronRight className="h-5 w-5" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted">
            {weekdays.map((w) => <div key={w} className="py-1">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((cell, i) => (
              <div key={i} className={cn('min-h-[70px] rounded-lg border p-1 text-left align-top', cell.date ? 'border-slate-100' : 'border-transparent', cell.date && cell.date.toISOString().slice(0, 10) === todayKey ? 'bg-brand-50 ring-1 ring-brand-200' : '')}>
                {cell.date && (
                  <>
                    <span className="text-xs font-semibold text-slate-500">{cell.date.getDate()}</span>
                    <div className="mt-0.5 space-y-0.5">
                      {cell.items.slice(0, 3).map((it) => {
                        const Icon = KIND_ICON[it.kind];
                        return (
                          <div key={it.key} className="flex items-center gap-1 truncate rounded bg-brand-100/70 px-1 py-0.5 text-[10px] text-brand-800" title={it.title}>
                            <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <span className="truncate">{it.title || kindLabel(it.kind)}</span>
                          </div>
                        );
                      })}
                      {cell.items.length > 3 && <p className="text-[10px] font-semibold text-muted">+{cell.items.length - 3}</p>}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {adding && (
        <EntryForm
          onClose={() => setAdding(false)}
          onSubmit={async (payload) => {
            const r = await addEntry(payload);
            if (r.ok) { toast.success(t('calendar.addedEntry')); setAdding(false); }
            else toast.error(r.error);
          }}
        />
      )}
    </main>
  );
}

function EntryForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (p: { title: string; kind: EntryKind; starts_at: string; ends_at: string | null; location: string | null; online_url: string | null }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<EntryKind>('personal');
  const [starts, setStarts] = useState('');
  const [ends, setEnds] = useState('');
  const [location, setLocation] = useState('');
  const [onlineUrl, setOnlineUrl] = useState('');

  const submit = async () => {
    if (!title.trim() || !starts) return;
    setBusy(true);
    await onSubmit({
      title: title.trim(),
      kind,
      starts_at: new Date(starts).toISOString(),
      ends_at: ends ? new Date(ends).toISOString() : null,
      location: location.trim() || null,
      online_url: onlineUrl.trim() || null,
    });
    setBusy(false);
  };

  const KINDS: EntryKind[] = ['personal', 'appointment', 'therapy', 'event'];

  return (
    <Modal open onClose={onClose} title={t('calendar.newEntry')}>
      <div className="space-y-3">
        <input className={inputCls} placeholder={t('calendar.fTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as EntryKind)}>
          {KINDS.map((k) => <option key={k} value={k}>{t(`calendar.kind_${k}`)}</option>)}
        </select>
        <label className="block text-sm font-semibold text-slate-700">{t('calendar.fStarts')}
          <input type="datetime-local" className={inputCls} value={starts} onChange={(e) => setStarts(e.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">{t('calendar.fEnds')}
          <input type="datetime-local" className={inputCls} value={ends} onChange={(e) => setEnds(e.target.value)} />
        </label>
        <input className={inputCls} placeholder={t('calendar.fLocation')} value={location} onChange={(e) => setLocation(e.target.value)} />
        <input className={inputCls} placeholder={t('calendar.fOnline')} value={onlineUrl} onChange={(e) => setOnlineUrl(e.target.value)} />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button loading={busy} disabled={!title.trim() || !starts} onClick={submit}>{t('common.save')}</Button>
        </div>
      </div>
    </Modal>
  );
}
