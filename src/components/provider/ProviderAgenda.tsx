/**
 * ProviderAgenda — agenda del prestador:
 *  - Editor de disponibilidad semanal.
 *  - Próximas citas (cancelar, editar enlace de videollamada).
 *  - Lista de espera: al cancelarse un hueco, el prestador puede asignarlo a un
 *    paciente en espera; el paciente solo se entera DESPUÉS de su confirmación.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Video, CalendarClock } from 'lucide-react';
import { Button, SkeletonCard, Modal, useToast, useConfirm, HowTo} from '@/components/ui';
import { useProviderAgenda, generateSlots, type WaitlistEntry, type Slot } from '@/hooks/useAgenda';

interface DayDraft {
  weekday: number;
  enabled: boolean;
  start: string;
  end: string;
  slot: number;
}

const input = 'rounded-lg border border-slate-200 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function ProviderAgenda() {
  const { t } = useTranslation();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const { availability, appointments, waitlist, loading, saveAvailability, cancelAppointment, setVideoLink, assignFromWaitlist } =
    useProviderAgenda();
  const weekdays = t('agenda.weekdays', { returnObjects: true }) as string[];

  const [draft, setDraft] = useState<DayDraft[]>([]);
  const [assigning, setAssigning] = useState<WaitlistEntry | null>(null);

  useEffect(() => {
    const base: DayDraft[] = Array.from({ length: 7 }, (_, w) => {
      const found = availability.find((a) => a.weekday === w);
      return {
        weekday: w,
        enabled: !!found,
        start: found?.start_time?.slice(0, 5) ?? '09:00',
        end: found?.end_time?.slice(0, 5) ?? '14:00',
        slot: found?.slot_minutes ?? 60,
      };
    });
    setDraft(base);
  }, [availability]);

  const slotsForAssign = useMemo(
    () => generateSlots(availability, appointments, 21),
    [availability, appointments],
  );

  if (loading) return <SkeletonCard rows={4} />;

  const onSaveAvailability = async () => {
    const rows = draft
      .filter((d) => d.enabled)
      .map((d) => ({ weekday: d.weekday, start_time: `${d.start}:00`, end_time: `${d.end}:00`, slot_minutes: d.slot, provider_id: '' }));
    const res = await saveAvailability(rows);
    toast[res.ok ? 'success' : 'error'](res.ok ? t('agenda.saved') : res.error);
  };

  const upcoming = appointments.filter((a) => a.status === 'booked');

  return (
    <div className="space-y-6">
      <HowTo stepsKey="howto.agenda" />
      {/* Disponibilidad */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">{t('agenda.availability')}</h2>
        <ul className="space-y-2">
          {draft.map((d, i) => (
            <li key={d.weekday} className="flex flex-wrap items-center gap-2 text-sm">
              <label className="flex w-28 items-center gap-2">
                <input
                  type="checkbox"
                  checked={d.enabled}
                  onChange={(e) => setDraft((p) => p.map((x, j) => (j === i ? { ...x, enabled: e.target.checked } : x)))}
                />
                {weekdays[d.weekday]}
              </label>
              <input type="time" className={input} value={d.start} disabled={!d.enabled}
                onChange={(e) => setDraft((p) => p.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} />
              <span className="text-muted">{t('agenda.to')}</span>
              <input type="time" className={input} value={d.end} disabled={!d.enabled}
                onChange={(e) => setDraft((p) => p.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} />
              <input type="number" min={10} step={5} className={`${input} w-20`} value={d.slot} disabled={!d.enabled}
                title={t('agenda.slotMinutes')}
                onChange={(e) => setDraft((p) => p.map((x, j) => (j === i ? { ...x, slot: Number(e.target.value) } : x)))} />
              <span className="text-muted">min</span>
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <Button size="sm" onClick={onSaveAvailability}>{t('agenda.saveAvailability')}</Button>
        </div>
        <p className="mt-2 text-xs text-muted">{t('agenda.remindersNote')}</p>
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
