/**
 * ApplyModeratorModal — postulación a moderador de la Tribu. Se pide una
 * justificación ("¿por qué deseas moderar?") y se muestra el CÓDIGO DE ÉTICA en
 * un listado concreto que debe aceptarse para enviar la solicitud (queda
 * pendiente de aprobación del admin).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tList } from '@/lib/tList';
import { Scale } from 'lucide-react';
import { Modal, Button, useToast } from '@/components/ui';
import { useTribeModerator } from '@/hooks/useTribe';

export function ApplyModeratorModal({ onClose, onApplied }: { onClose: () => void; onApplied?: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { apply } = useTribeModerator();
  const ethics = tList(t, 'tribe.ethics');
  const [justification, setJustification] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (justification.trim().length < 10) { toast.error(t('tribe.mod.justifyReq')); return; }
    if (!accepted) { toast.error(t('tribe.mod.mustAcceptEthics')); return; }
    setBusy(true);
    const err = await apply(justification.trim());
    setBusy(false);
    if (err) toast.error(err);
    else { toast.success(t('tribe.mod.applied')); onApplied?.(); onClose(); }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('tribe.mod.applyTitle')}
      footer={<Button onClick={submit} loading={busy} disabled={!accepted}>{t('tribe.mod.apply')}</Button>}
    >
      <div className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-900">{t('tribe.mod.justifyLabel')}</label>
          <textarea rows={3} value={justification} onChange={(e) => setJustification(e.target.value)} maxLength={500}
            className="w-full rounded-xl border border-slate-200 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            placeholder={t('tribe.mod.justifyPh')} />
        </div>

        <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Scale className="h-4 w-4 text-brand-600" aria-hidden="true" /> {t('tribe.mod.ethicsTitle')}
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {ethics.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-5 w-5 rounded border-slate-300 text-brand-500" />
          <span className="font-medium">{t('tribe.mod.acceptEthics')}</span>
        </label>
      </div>
    </Modal>
  );
}
