/**
 * SensoryReportModal — reporte de accesibilidad sensorial de un evento: nivel de
 * ruido percibido, si se usó la sala de calma, comodidad general y notas. Otorga
 * +15 Puntos de Tribu la primera vez.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, StarRating, useToast } from '@/components/ui';
import { useTribeEvents } from '@/hooks/useTribeEvents';

export function SensoryReportModal({ eventId, eventTitle, onClose, onDone }: { eventId: string; eventTitle: string; onClose: () => void; onDone?: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { report } = useTribeEvents('');
  const [noise, setNoise] = useState(0);
  const [comfort, setComfort] = useState(0);
  const [quietUsed, setQuietUsed] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (noise < 1 || comfort < 1) { toast.error(t('tribe.event.reportReq')); return; }
    setBusy(true);
    const err = await report(eventId, { noise, quietUsed, comfort, notes: notes.trim() });
    setBusy(false);
    if (err) toast.error(err);
    else { toast.success(t('tribe.event.reported')); onDone?.(); onClose(); }
  };

  return (
    <Modal open onClose={onClose} title={t('tribe.event.reportTitle', { name: eventTitle })}
      footer={<Button onClick={submit} loading={busy}>{t('tribe.event.sendReport')}</Button>}>
      <div className="space-y-4">
        <div>
          <p className="mb-1 font-semibold text-slate-900">{t('tribe.event.noiseLevel')}</p>
          <StarRating value={noise} onChange={setNoise} label={t('tribe.event.noiseLevel')} />
          <p className="mt-1 text-xs text-muted">{t('tribe.event.noiseScale')}</p>
        </div>
        <div>
          <p className="mb-1 font-semibold text-slate-900">{t('tribe.event.comfort')}</p>
          <StarRating value={comfort} onChange={setComfort} label={t('tribe.event.comfort')} />
        </div>
        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input type="checkbox" checked={quietUsed} onChange={(e) => setQuietUsed(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-brand-500" />
          <span>{t('tribe.event.quietUsed')}</span>
        </label>
        <div>
          <label className="mb-1 block font-semibold text-slate-900">{t('tribe.event.notes')}</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={400}
            className="w-full rounded-xl border border-slate-200 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" />
        </div>
        <p className="text-xs text-muted">{t('tribe.event.reportPoints')}</p>
      </div>
    </Modal>
  );
}
