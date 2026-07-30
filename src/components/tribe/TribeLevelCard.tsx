/**
 * TribeLevelCard — muestra al miembro su nivel (Semilla→Raíz), sus Puntos de
 * Tribu, el avance al siguiente nivel, las fichas de gratitud que le quedan hoy y
 * su "impacto acumulado" (cuántas veces fue reconocido por cada insignia, sin
 * exponer quién). Modo silencioso: oculta niveles/puntos sin perder acceso.
 */
import { useTranslation } from 'react-i18next';
import { Sprout, VolumeX, Volume2 } from 'lucide-react';
import { levelForPoints } from '@/lib/tribeLevels';
import { useTribeGratitude, type TribeMember } from '@/hooks/useTribe';

export function TribeLevelCard({ member, userId, onToggleSilent }: {
  member: TribeMember;
  userId: string;
  onToggleSilent: (silent: boolean) => void;
}) {
  const { t } = useTranslation();
  const { impact, tokensLeft } = useTribeGratitude(userId);
  const lp = levelForPoints(member.points);

  if (member.silent_mode) {
    return (
      <section className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4">
        <p className="flex items-center gap-2 text-sm text-muted"><VolumeX className="h-4 w-4" /> {t('tribe.silentOn')}</p>
        <button type="button" onClick={() => onToggleSilent(false)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
          <Volume2 className="h-4 w-4" /> {t('tribe.silentOff')}
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Sprout className="h-5 w-5 text-emerald-600" aria-hidden="true" /> {t(`tribe.level.${lp.level.key}`)}
          </p>
          <p className="text-sm text-muted">{t('tribe.pointsLabel', { n: member.points })}</p>
        </div>
        <button type="button" onClick={() => onToggleSilent(true)} title={t('tribe.silentOn')} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
          <VolumeX className="h-4 w-4" />
        </button>
      </div>

      {/* Avance al siguiente nivel */}
      {lp.next && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.round(lp.progress * 100)}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">{t('tribe.toNext', { n: lp.toNext, level: t(`tribe.level.${lp.next.key}`) })}</p>
        </div>
      )}

      {/* Fichas de gratitud restantes hoy */}
      {tokensLeft != null && (
        <p className="mt-3 text-sm text-slate-700">{t('tribe.tokensLeft', { n: tokensLeft })}</p>
      )}

      {/* Impacto acumulado (fortalezas), sin exponer quién lo dio */}
      {impact.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {impact.map((r) => (
            <span key={r.badge_key} className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-700 ring-1 ring-slate-100">
              {t('tribe.impactItem', { n: r.n, badge: t(`tribe.badge.${r.badge_key}.name`) })}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
