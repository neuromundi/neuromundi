/**
 * ProviderAgenda — agenda del prestador:
 *  - Editor de disponibilidad semanal.
 *  - Próximas citas (cancelar, editar enlace de videollamada).
 *  - Lista de espera: al cancelarse un hueco, el prestador puede asignarlo a un
 *    paciente en espera; el paciente solo se entera DESPUÉS de su confirmación.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Video, CalendarClock, Plus, Trash2, Palmtree } from 'lucide-react';
import { Button, SkeletonCard, Modal, useToast, useConfirm, HowTo} from '@/components/ui';
import { useProviderAgenda, generateSlots, type WaitlistEntry, type Slot } from '@/hooks/useAgenda';
import { formatDate } from '@/lib/utils';

/** Un rango de disponibilidad dentro de un día (puede haber varios por día). */
interface RangeDraft {
  id: string;
  start: string;
  end: string;
  slot: number;
}
interface DayDraft {
  weekday: number;
  enabled: boolean;
  ranges: RangeDraft[];
}

const input = 'rounded-lg border border-slate-200 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const newRange = (): RangeDraft => ({ id: crypto.randomUUID(), start: '09:00', end: '14:00', slot: 60 });

export function ProviderAgenda() {
  const { t } = useTranslation();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const { availability, appointments, waitlist, timeOff, loading, saveAvailability, addTimeOff, removeTimeOff, cancelAppointment, setVideoLink, assignFromWaitlist } =
    useProviderAgenda();
  const weekdays = t('agenda.weekdays', { returnObjects: true }) as string[];

  const [draft, setDraft] = useState<DayDraft[]>([]);
  const [assigning, setAssigning] = useState<WaitlistEntry | null>(null);

  // Bloqueo nuevo (vacaciones o franja de horas).
  const [offDay, setOffDay] = useState(false); // false = todo el día
  const [offFrom, setOffFrom] = useState(new Date().toISOString().slice(0, 10));
  const [offTo, setOffTo] = useState(new Date().toISOString().slice(0, 10));
  const [offStart, setOffStart] = useState('09:00');
  const [offEnd, setOffEnd] = useState('13:00');
  const [offReason, setOffReason] = useState('');

  useEffect(() => {
    // Agrupa TODAS las reglas por día (soporta varios rangos por weekday).
    const base: DayDraft[] = Array.from({ length: 7 }, (_, w) => {
      const rules = availability.filter((a) => a.weekday === w);
      return {
        weekday: w,
        enabled: rules.length > 0,
        ranges: rules.length
          ? rules.map((r) => ({ id: crypto.randomUUID(), start: r.start_time.slice(0, 5), end: r.end_time.slice(0, 5), slot: r.slot_minutes }))
          : [newRange()],
      };
    });
    setDraft(base);
  }, [availability]);

  const slotsForAssign = useMemo(
    () => generateSlots(availability, appointments, timeOff, 21),
    [availability, appointments, timeOff],
  );

  if (loading) return <SkeletonCard rows={4} />;

  const patchRange = (wi: number, ri: number, patch: Partial<RangeDraft>) =>
    setDraft((p) => p.map((d, j) => (j === wi ? { ...d, ranges: d.ranges.map((r, k) => (k === ri ? { ...r, ...patch } : r)) } : d)));

  const onSaveAvailability = async () => {
    const rows = draft
      .filter((d) => d.enabled)
      .flatMap((d) => d.ranges.map((r) => ({ weekday: d.weekday, start_time: `${r.start}:00`, end_time: `${r.end}:00`, slot_minutes: r.slot, provider_id: '' })));
    const res = await saveAvailability(rows);
    toast[res.ok ? 'success' : 'error'](res.ok ? t('agenda.saved') : res.error);
  };

  const onAddTimeOff = async () => {
    // Todo el día: del inicio del primer día al final del último.
    const startIso = offDay ? `${offFrom}T00:00:00` : `${offFrom}T${offStart}:00`;
    const endIso = offDay ? `${offTo}T23:59:59` : `${offFrom}T${offEnd}:00`;
    if (new Date(endIso) <= new Date(startIso)) { toast.error(t('agenda.off.badRange')); return; }
    const res = await addTimeOff(new Date(startIso).toISOString(), new Date(endIso).toISOString(), offDay, offReason.trim() || undefined);
    if (res.ok) { toast.success(t('agenda.off.added')); setOffReason(''); }
    else toast.error(res.error);
  };

  const upcoming = appointments.filter((a) => a.status === 'booked');

  return (
    <div className="space-y-6">
      <HowTo stepsKey="howto.agenda" />
      {/* Disponibilidad */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">{t('agenda.availability')}</h2>
        <ul className="space-y-3">
          {draft.map((d, i) => (
            <li key={d.weekday} className="rounded-xl border border-slate-100 p-2.5">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={d.enabled}
                  onChange={(e) => setDraft((p) => p.map((x, j) => (j === i ? { ...x, enabled: e.target.checked } : x)))}
                />
                {weekdays[d.weekday]}
              </label>
              {d.enabled && (
                <div className="mt-2 space-y-2">
                  {d.ranges.map((r, ri) => (
                    <div key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <input type="time" className={input} value={r.start}
                        onChange={(e) => patchRange(i, ri, { start: e.target.value })} />
                      <span className="text-muted">{t('agenda.to')}</span>
                      <input type="time" className={input} value={r.end}
                        onChange={(e) => patchRange(i, ri, { end: e.target.value })} />
                      <input type="number" min={10} step={5} className={`${input} w-20`} value={r.slot}
                        title={t('agenda.slotMinutes')}
                        onChange={(e) => patchRange(i, ri, { slot: Number(e.target.value) })} />
                      <span className="text-muted">min</span>
                      {d.ranges.length > 1 && (
                        <button type="button" aria-label={t('common.delete')} className="text-evs-1 hover:opacity-80"
                          onClick={() => setDraft((p) => p.map((x, j) => (j === i ? { ...x, ranges: x.ranges.filter((_, k) => k !== ri) } : x)))}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button"
                    onClick={() => setDraft((p) => p.map((x, j) => (j === i ? { ...x, ranges: [...x.ranges, newRange()] } : x)))}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                    <Plus className="h-3.5 w-3.5" /> {t('agenda.addRange')}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <Button size="sm" onClick={onSaveAvailability}>{t('agenda.saveAvailability')}</Button>
        </div>
        <p className="mt-2 text-xs text-muted">{t('agenda.remindersNote')}</p>
      </section>

      {/* Vacaciones / bloqueos */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
          <Palmtree className="h-4 w-4 text-brand-600" aria-hidden="true" /> {t('agenda.off.title')}
        </h2>
        <p className="mb-3 text-xs text-muted">{t('agenda.off.help')}</p>

        <div className="flex flex-wrap items-end gap-2 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={offDay} onChange={(e) => setOffDay(e.target.checked)} />
            {t('agenda.off.allDay')}
          </label>
          <div>
            <span className="mb-0.5 block text-[11px] text-muted">{t('agenda.off.from')}</span>
            <input type="date" className={input} value={offFrom} onChange={(e) => setOffFrom(e.target.value)} />
          </div>
          {offDay ? (
            <div>
              <span className="mb-0.5 block text-[11px] text-muted">{t('agenda.off.to')}</span>
              <input type="date" className={input} value={offTo} onChange={(e) => setOffTo(e.target.value)} />
            </div>
          ) : (
            <>
              <div>
                <span className="mb-0.5 block text-[11px] text-muted">{t('agenda.off.start')}</span>
                <input type="time" className={input} value={offStart} onChange={(e) => setOffStart(e.target.value)} />
              </div>
              <div>
                <span className="mb-0.5 block text-[11px] text-muted">{t('agenda.off.end')}</span>
                <input type="time" className={input} value={offEnd} onChange={(e) => setOffEnd(e.target.value)} />
              </div>
            </>
          )}
          <input className={`${input} min-w-[10rem] flex-1`} placeholder={t('agenda.off.reason')} value={offReason} onChange={(e) => setOffReason(e.target.value)} />
          <Button size="sm" onClick={() => void onAddTimeOff()} leadingIcon={<Plus className="h-4 w-4" />}>{t('agenda.off.add')}</Button>
        </div>

        {timeOff.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {timeOff.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 p-2 text-sm">
                <span className="min-w-0">
                  <span className="font-medium text-slate-800">
                    {o.all_day
                      ? `${formatDate(o.starts_at)} — ${formatDate(o.ends_at)}`
                      : `${formatDate(o.starts_at)} · ${new Date(o.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–${new Date(o.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </span>
                  {o.reason && <span className="ml-2 text-muted">{o.reason}</span>}
                </span>
                <button type="button" aria-label={t('common.delete')} className="text-evs-1 hover:opacity-80" onClick={() => void removeTimeOff(o.id)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Próximas citas */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">{t('agenda.upcoming')}</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">{t('agenda.noAppointments')}</p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((a) => (
              <li key={a.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <CalendarClock className="h-4 w-4 text-brand-600" />
                    {new Date(a.starts_at).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!(await confirmDialog({ title: t('agenda.cancel'), message: t('agenda.confirmCancel'), danger: true }))) return;
                      const res = await cancelAppointment(a.id);
                      toast[res.ok ? 'success' : 'error'](res.ok ? t('agenda.cancelled') : res.error);
                    }}
                    className="text-sm text-evs-1 hover:underline"
                  >
                    {t('agenda.cancel')}
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Video className="h-4 w-4 text-muted" />
                  <input
                    className={`${input} flex-1`}
                    placeholder={t('agenda.videoHint')}
                    defaultValue={a.video_link ?? ''}
                    onBlur={async (e) => {
                      if (e.target.value !== (a.video_link ?? '')) {
                        const res = await setVideoLink(a.id, e.target.value);
                        if (res.ok) toast.success(t('agenda.saved'));
                      }
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Lista de espera */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">{t('agenda.waitlist')}</h2>
        {waitlist.length === 0 ? (
          <p className="text-sm text-muted">{t('agenda.waitlistEmpty')}</p>
        ) : (
          <ul className="space-y-2">
            {waitlist.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-3 text-sm">
                <span className="min-w-0 flex-1 truncate text-slate-700">{w.note || t('agenda.waitlist')}</span>
                <Button size="sm" variant="secondary" onClick={() => setAssigning(w)}>{t('agenda.assign')}</Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {assigning && (
        <AssignModal
          entry={assigning}
          slots={slotsForAssign}
          onClose={() => setAssigning(null)}
          onConfirm={async (slot, link) => {
            const res = await assignFromWaitlist(assigning, slot, link);
            toast[res.ok ? 'success' : 'error'](res.ok ? t('agenda.assigned') : res.error);
            setAssigning(null);
          }}
        />
      )}
    </div>
  );
}

function AssignModal({
  entry,
  slots,
  onClose,
  onConfirm,
}: {
  entry: WaitlistEntry;
  slots: Slot[];
  onClose: () => void;
  onConfirm: (slot: Slot, link: string) => void;
}) {
  const { t } = useTranslation();
  const [slotIdx, setSlotIdx] = useState(0);
  const [link, setLink] = useState('');

  return (
    <Modal open onClose={onClose} title={t('agenda.assignTitle')}>
      <div className="space-y-4">
        <p className="text-sm text-slate-700">{t('agenda.assignHelp')}</p>
        <p className="text-sm text-muted">{entry.note}</p>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-900">{t('agenda.assignSlot')}</label>
          {slots.length === 0 ? (
            <p className="text-sm text-muted">{t('agenda.noSlots')}</p>
          ) : (
            <select className={`${input} w-full`} value={slotIdx} onChange={(e) => setSlotIdx(Number(e.target.value))}>
              {slots.slice(0, 60).map((s, i) => (
                <option key={s.startsAt} value={i}>{new Date(s.startsAt).toLocaleString()}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-900">{t('agenda.videoLink')}</label>
          <input className={`${input} w-full`} placeholder={t('agenda.videoHint')} value={link} onChange={(e) => setLink(e.target.value)} />
        </div>
        <Button fullWidth disabled={slots.length === 0} onClick={() => onConfirm(slots[slotIdx], link)}>
          {t('agenda.assignConfirm')}
        </Button>
      </div>
    </Modal>
  );
}
