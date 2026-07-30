/**
 * MemberBadgesCard — tarjeta con los distintivos que el admin subió para el tipo
 * de miembro indicado (p. ej. 'company' → "Empresa inclusiva" y "Aliado
 * Neuromundi"). Cada uno se descarga desde su URL pública. Si no hay distintivos
 * activos para ese tipo, no renderiza nada.
 */
import { useTranslation } from 'react-i18next';
import { Download, Award } from 'lucide-react';
import { useMemberBadges } from '@/hooks/useJobOpenings';

export function MemberBadgesCard({ memberType }: { memberType: string | null | undefined }) {
  const { t } = useTranslation();
  const { badges, loading } = useMemberBadges(memberType);

  if (loading || badges.length === 0) return null;

  return (
    <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 font-bold text-slate-900">
        <Award className="h-5 w-5 text-brand-600" aria-hidden="true" /> {t('memberBadges.title')}
      </h3>
      <p className="mt-1 text-sm text-muted">{t('memberBadges.desc')}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {badges.map((b) => (
          <div key={b.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
            {b.public_url ? (
              <img src={b.public_url} alt={b.title ?? ''} className="h-14 w-14 shrink-0 rounded-lg object-contain" loading="lazy" />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Award className="h-6 w-6" /></span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{b.title || t(`memberBadges.key.${b.badge_key}`, { defaultValue: b.badge_key })}</p>
              {b.public_url && (
                <a
                  href={b.public_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
                >
                  <Download className="h-4 w-4" /> {t('memberBadges.download')}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
