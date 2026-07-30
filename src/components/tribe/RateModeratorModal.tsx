/**
 * RateModeratorModal — los miembros califican a un moderador por dimensiones
 * afirmativas: empatía, lenguaje inclusivo, cordialidad, conocimiento y
 * disponibilidad. Comentario opcional y opción anónima. Una reseña por moderador
 * (se actualiza si vuelves a calificar).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, StarRating, useToast } from '@/components/ui';
import { useTribeModerators } from '@/hooks/useTribe';

const DIMS = ['empathy', 'inclusive', 'cordiality', 'knowledge', 'availability'] as const;
type Dim = (typeof DIMS)[number];

export function RateModeratorModal({ moderatorId, moderatorName, onClose, onRated }: {
  moderatorId: string; moderatorName: string; onClose: () => void; onRated?: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const { rate } = useTribeModerators();
  const [scores, setScores] = useState<Record<Dim, number>>({ empathy: 0, inclusive: 0, cordiality: 0, knowledge: 0, availability: 0 });
  const [comment, setComment] = useState('');
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);

  const complete = DIMS.every((d) => scores[d] >= 1);

  const submit = async () => {
    if (!complete) { toast.error(t('tribe.mod.rateIncomplete')); return; }
    setBusy(true);
    const err = await rate(moderatorId, scores, comment.trim(), anon);
    setBusy(false);
    if (err) toast.error(err);
    else { toast.success(t('tribe.mod.rated')); onRated?.(); onClose(); }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('tribe.mod.rateTitle', { name: moderatorName })}
      footer={<Button onClick={submit} loading={busy} disabled={!complete}>{t('tribe.mod.rateSubmit')}</Button>}
    >
      <div className="space-y-4">
        {DIMS.map((d) => (
          <div key={d} className="border-b border-slate-100 pb-3 last:border-0">
            <p className="mb-1 font-semibold text-slate-900">{t(`tribe.mod.dim.${d}`)}</p>
            <StarRating value={scores[d]} onChange={(v) => setScores((s) => ({ ...s, [d]: v }))} label={t(`tribe.mod.dim.${d}`)} />
          </div>
        ))}
        <div>
          <label className="mb-1 block font-semibold text-slate-900">{t('tribe.mod.commentLabel')}</label>
          <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={400}
            className="w-full rounded-xl border border-slate-200 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" />
        </div>
        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-brand-500" />
          <span>{t('tribe.grat.anon')}</span>
        </label>
      </div>
    </Modal>
  );
}
