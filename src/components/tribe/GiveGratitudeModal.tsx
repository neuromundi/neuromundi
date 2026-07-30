/**
 * GiveGratitudeModal — "Dar Gratitud": el miembro elige UNA insignia (con su
 * mensaje preseteado, sin texto libre) y puede enviarla de forma anónima. Solo
 * suma puntos positivos al receptor; nunca resta. Respeta los topes y el
 * enfriamiento del servidor (muestra el motivo si se rechaza).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gem, BookOpen, ShieldCheck, Lightbulb, Map, Heart, Sparkles, type LucideIcon } from 'lucide-react';
import { Modal, Button, useToast } from '@/components/ui';
import { TRIBE_BADGES } from '@/data/tribeBadges';
import { useTribeGratitude } from '@/hooks/useTribe';
import { cn } from '@/lib/utils';

const ICONS: Record<string, LucideIcon> = { Gem, BookOpen, ShieldCheck, Lightbulb, Map, Heart, Sparkles };

export function GiveGratitudeModal({
  receiverId, receiverName, forumId, onClose, onGiven,
}: {
  receiverId: string;
  receiverName: string;
  forumId: string | null;
  onClose: () => void;
  onGiven?: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const { give } = useTribeGratitude(null);
  const [selected, setSelected] = useState<string>('');
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!selected) { toast.error(t('tribe.grat.pick')); return; }
    setBusy(true);
    const res = await give(receiverId, selected, forumId, anon);
    setBusy(false);
    if (res.ok) { toast.success(t('tribe.grat.sent')); onGiven?.(); onClose(); }
    else toast.error(res.error ?? t('tribe.grat.err'));
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('tribe.grat.title', { name: receiverName })}
      description={t('tribe.grat.desc')}
      footer={<Button onClick={submit} loading={busy} disabled={!selected}>{t('tribe.grat.give')}</Button>}
    >
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {TRIBE_BADGES.map((b) => {
            const Icon = ICONS[b.icon] ?? Sparkles;
            const active = selected === b.key;
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => setSelected(b.key)}
                aria-pressed={active}
                className={cn(
                  'flex items-start gap-2 rounded-xl border p-3 text-left',
                  active ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50',
                )}
              >
                <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', active ? 'text-brand-600' : 'text-slate-400')} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-900">{t(`tribe.badge.${b.key}.name`)}</span>
                    <span className="rounded-full bg-brand-100 px-1.5 text-xs font-bold text-brand-700">+{b.points}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{t(`tribe.badge.${b.key}.msg`)}</span>
                </span>
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-brand-500" />
          <span>{t('tribe.grat.anon')}</span>
        </label>
        <p className="text-xs text-muted">{t('tribe.grat.note')}</p>
      </div>
    </Modal>
  );
}
