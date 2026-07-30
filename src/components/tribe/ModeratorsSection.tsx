/**
 * ModeratorsSection — en el hub de la Tribu: postularse a moderador (con código
 * de ética), ver el estado de la propia postulación y el directorio de
 * moderadores aprobados con su nivel y calificación, con opción de calificarlos.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Star, Scale } from 'lucide-react';
import { Button } from '@/components/ui';
import { useTribeModerator, useTribeModerators } from '@/hooks/useTribe';
import { modLevelForPoints } from '@/lib/tribeModLevels';
import { ApplyModeratorModal } from './ApplyModeratorModal';
import { RateModeratorModal } from './RateModeratorModal';

export function ModeratorsSection({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const { mod, reload } = useTribeModerator();
  const { mods, reload: reloadList } = useTribeModerators();
  const [applying, setApplying] = useState(false);
  const [rating, setRating] = useState<{ id: string; name: string } | null>(null);

  return (
    <section className="mt-6 rounded-2xl border border-slate-100 p-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <ShieldCheck className="h-5 w-5 text-brand-600" aria-hidden="true" /> {t('tribe.mod.title')}
      </h2>

      {/* Mi postulación / estado */}
      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
        {!mod && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-slate-700">{t('tribe.mod.becomePrompt')}</p>
            <Button size="sm" variant="secondary" leadingIcon={<Scale className="h-4 w-4" />} onClick={() => setApplying(true)}>{t('tribe.mod.become')}</Button>
          </div>
        )}
        {mod?.status === 'pending' && <p className="text-amber-700">{t('tribe.mod.pendingMine')}</p>}
        {mod?.status === 'rejected' && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-slate-600">{t('tribe.mod.rejectedMine')}</p>
            <Button size="sm" variant="ghost" onClick={() => setApplying(true)}>{t('tribe.mod.reapply')}</Button>
          </div>
        )}
        {mod?.status === 'approved' && (
          <p className="flex items-center gap-2 font-semibold text-brand-700">
            <ShieldCheck className="h-4 w-4" /> {t('tribe.mod.youAre', { level: t(`tribe.modLevel.${modLevelForPoints(mod.points).key}`) })}
          </p>
        )}
      </div>

      {/* Directorio de moderadores */}
      {mods.length > 0 && (
        <ul className="mt-4 space-y-2">
          {mods.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate font-semibold text-slate-900">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" /> {m.name}
                </p>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  <span>{t(`tribe.modLevel.${modLevelForPoints(m.points).key}`)}</span>
                  {m.n_ratings > 0 && <span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3 text-warm-500" /> {Number(m.avg_rating).toFixed(1)} ({m.n_ratings})</span>}
                </p>
              </div>
              {m.user_id !== userId && (
                <Button size="sm" variant="ghost" onClick={() => setRating({ id: m.user_id, name: m.name })}>
                  {m.i_rated ? t('tribe.mod.update') : t('tribe.mod.rate')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {applying && <ApplyModeratorModal onClose={() => setApplying(false)} onApplied={() => void reload()} />}
      {rating && <RateModeratorModal moderatorId={rating.id} moderatorName={rating.name} onClose={() => setRating(null)} onRated={() => void reloadList()} />}
    </section>
  );
}
