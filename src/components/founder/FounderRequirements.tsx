/**
 * FounderRequirements — muestra el porcentaje de cumplimiento de los requisitos
 * de Fundador del usuario y el detalle por requisito (✓ cumplido / ○ pendiente,
 * con avance en los contables como el beneficio comunitario verificado por QR).
 * Se actualiza a partir de datos reales; se usa en el área de cuenta del usuario.
 */
import { useTranslation } from 'react-i18next';
import { Award, Check, Circle } from 'lucide-react';
import { ProgressBar, SkeletonCard } from '@/components/ui';
import { useFounderProgress } from '@/hooks/useFounder';

export function FounderRequirements({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { progress, loading } = useFounderProgress();

  if (loading) return <SkeletonCard rows={2} />;
  if (!progress) return null;

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
      <div className="flex items-center gap-2">
        <Award className="h-5 w-5 text-brand-700" aria-hidden="true" />
        <h3 className="font-bold text-slate-900">{t('founderReq.title')}</h3>
      </div>

      <div className="mt-3">
        <ProgressBar
          label={t('founderReq.meter')}
          value={progress.pct}
          max={100}
          valueText={`${progress.pct}%`}
          color="#0ea5e9"
          size="md"
        />
        <p className="mt-1 text-xs text-brand-800">{t('founderReq.summary', { met: progress.metCount, total: progress.total })}</p>
      </div>

      {!compact && (
        <ul className="mt-3 space-y-1.5">
          {progress.items.map((it) => (
            <li key={it.key} className="flex items-start gap-2 text-sm">
              {it.met ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" aria-hidden="true" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
              )}
              <span className={it.met ? 'text-slate-700' : 'text-slate-600'}>
                {t(`founderReq.item.${it.key}`)}
                {it.progress ? ` (${it.progress.current}/${it.progress.target})` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
