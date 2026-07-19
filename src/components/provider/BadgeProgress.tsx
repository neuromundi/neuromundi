/**
 * BadgeProgress — panel del proveedor: su distintivo actual, el desglose de
 * puntaje por bloques (50/30/20) y, sobre todo, QUÉ LE FALTA para subir de nivel.
 */
import { useTranslation } from 'react-i18next';
import { Trophy, Info, CheckCircle2 } from 'lucide-react';
import { ProgressBar, DistintivoBadge } from '@/components/ui';
import { nextLevel, type BadgeResult, type BadgeInputs, type BadgeRequirement } from '@/lib/badge';

export function BadgeProgress({ badge, inputs }: { badge: BadgeResult | null; inputs: BadgeInputs | null }) {
  const { t } = useTranslation();
  if (!badge || !inputs) return null;

  const next = nextLevel(badge, inputs);

  const reqText = (r: BadgeRequirement): string => {
    switch (r.kind) {
      case 'documental':
        return t('badgeProgress.reqDocumental');
      case 'rating':
        return t('badgeProgress.reqRating', { target: r.target.toFixed(1), current: r.current.toFixed(1) });
      case 'discount':
        return t('badgeProgress.reqDiscount', { target: r.target, current: Math.round(r.current) });
      case 'empathy':
        return t('badgeProgress.reqEmpathy', { target: r.target, current: Math.round(r.current) });
      default:
        return '';
    }
  };

  const currentLabel = badge.level
    ? t(`badge.${badge.level}`)
    : badge.status === 'en_revision'
      ? t('badge.enRevision')
      : t('admin.badgeNone');

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 font-bold text-slate-900">
        <Trophy className="h-5 w-5 text-brand-600" aria-hidden="true" /> {t('badgeProgress.title')}
      </h3>

      <div className="mt-3 flex items-center gap-3">
        <DistintivoBadge badge={badge} size="lg" showReview />
        <div>
          <p className="text-lg font-bold text-slate-900">{currentLabel}</p>
          <p className="text-sm text-muted">{t('badgeProgress.score', { score: badge.score })}</p>
        </div>
      </div>

      {/* Desglose por bloques */}
      <div className="mt-4 space-y-2.5">
        <ProgressBar label={t('badgeProgress.blockQuality')} value={badge.breakdown.qualityHuman} max={50} color="#0284c7" valueText={`${badge.breakdown.qualityHuman}/50`} size="sm" />
        <ProgressBar label={t('badgeProgress.blockEconomic')} value={badge.breakdown.economic} max={30} color="#0284c7" valueText={`${badge.breakdown.economic}/30`} size="sm" />
        <ProgressBar label={t('badgeProgress.blockCommitment')} value={badge.breakdown.commitment} max={20} color="#0284c7" valueText={`${badge.breakdown.commitment}/20`} size="sm" />
      </div>

      {/* Qué falta para el siguiente nivel */}
      <div className="mt-4 rounded-xl bg-brand-50 p-3">
        {next.maxed ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-brand-800">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {t('badgeProgress.maxed')}
          </p>
        ) : next.requirements.length === 0 ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-brand-800">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {t('badgeProgress.readyNext', { level: next.nextLevel ? t(`badge.${next.nextLevel}`) : '' })}
          </p>
        ) : (
          <>
            <p className="text-sm font-semibold text-brand-800">
              {t('badgeProgress.nextTitle', { level: next.nextLevel ? t(`badge.${next.nextLevel}`) : '' })}
            </p>
            <ul className="mt-2 space-y-1">
              {next.requirements.map((r, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" /> {reqText(r)}
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-2 text-xs text-muted">{t('badgeProgress.discountNote')}</p>
      </div>
    </section>
  );
}
