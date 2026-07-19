/**
 * BookAppointment — botón "Agendar cita" para consumidores en el perfil del
 * prestador. Abre un modal con los horarios disponibles; si no hay, permite
 * unirse a la lista de espera.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarPlus } from 'lucide-react';
import { Button, Modal, useToast, Skeleton } from '@/components/ui';
import { useConsumerAgenda } from '@/hooks/useAgenda';

const input = 'w-full rounded-lg border border-slate-200 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function BookAppointment({ providerId, label }: { providerId: string; label?: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { slots, loading, book, joinWaitlist } = useConsumerAgenda(providerId);
  const [open, setOpen] = useState(false);
  const [slotIdx, setSlotIdx] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const cta = label ?? t('agenda.book');

  const onBook = async () => {
    setBusy(true);
    const res = await book(slots[slotIdx], note);
    setBusy(false);
    if (res.ok) {
      toast.success(t('agenda.booked'));
      setOpen(false);
    } else toast.error(res.error);
  };

  const onWaitlist = async () => {
    const res = await joinWaitlist(note);
    toast[res.ok ? 'success' : 'error'](res.ok ? t('agenda.joinedWaitlist') : res.error);
    if (res.ok) setOpen(false);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} leadingIcon={<CalendarPlus className="h-4 w-4" />}>
        {cta}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={cta}>
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-2/3" />
            </div>
          ) : slots.length === 0 ? (
            <>
              <p className="text-sm text-muted">{t('agenda.noSlots')}</p>
              <textarea className={input} rows={2} placeholder={t('agenda.notePlaceholder')} value={note} onChange={(e) => setNote(e.target.value)} />
              <Button variant="secondary" fullWidth onClick={onWaitlist}>{t('agenda.joinWaitlist')}</Button>
            </>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-900">{t('agenda.chooseSlot')}</label>
                <select className={input} value={slotIdx} onChange={(e) => setSlotIdx(Number(e.target.value))}>
                  {slots.slice(0, 60).map((s, i) => (
                    <option key={s.startsAt} value={i}>{new Date(s.startsAt).toLocaleString()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-900">{t('agenda.note')}</label>
                <textarea className={input} rows={2} placeholder={t('agenda.notePlaceholder')} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <Button fullWidth loading={busy} onClick={onBook}>
                {busy ? t('agenda.booking') : t('agenda.book')}
              </Button>
              <button type="button" onClick={onWaitlist} className="w-full text-sm text-brand-700 hover:underline">
                {t('agenda.joinWaitlist')}
              </button>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
