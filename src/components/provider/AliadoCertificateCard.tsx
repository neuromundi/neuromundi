/**
 * AliadoCertificateCard — cuando el prestador alcanza el distintivo "Aliado
 * Destacado" (o superior), ofrece descargar su reconocimiento oficial en PDF
 * tamaño carta. El distintivo ya se habilita solo por el sistema de badge; esto
 * es únicamente el diploma descargable.
 */
import { useTranslation } from 'react-i18next';
import { Award, Download } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { PROFESSIONS } from '@/data/specialistCatalog';
import { openAliadoCertificate } from '@/lib/aliadoCertificate';
import type { BadgeResult } from '@/lib/badge';

export function AliadoCertificateCard({ badge }: { badge: BadgeResult | null }) {
  const { t, i18n } = useTranslation();
  const profile = useAuthStore((s) => s.profile);

  // Solo desde el nivel "Aliado Destacado" en adelante.
  if (!profile || !badge || (badge.level !== 'aliado' && badge.level !== 'embajador')) return null;

  const name = profile.business_name ?? profile.full_name;
  const memberNo = profile.member_no != null ? `NM-${String(profile.member_no).padStart(6, '0')}` : '—';
  const professionLabel = profile.profession
    ? (PROFESSIONS.find((p) => p.value === profile.profession)?.label ?? profile.profession)
    : null;
  const specialty = professionLabel ?? t('provider.ratings.certSpecialtyFallback');
  const dateStr = new Date().toLocaleDateString(i18n.language, { day: '2-digit', month: 'long', year: 'numeric' });

  const download = () =>
    openAliadoCertificate(
      { memberNo, name, specialty, dateStr },
      {
        brand: 'Neuromundi',
        heading: t('provider.ratings.certHeading'),
        award: t('provider.ratings.certAward'),
        awardedTo: t('provider.ratings.certAwardedTo'),
        memberLabel: t('provider.ratings.certMember'),
        specialtyLabel: t('provider.ratings.certSpecialty'),
        justification: t('provider.ratings.certJustification'),
        dateLabel: t('provider.ratings.certDate'),
        fileTitle: t('provider.ratings.certFile'),
      },
    );

  return (
    <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Award className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-900">{t('provider.ratings.certTitle')}</h3>
          <p className="mt-0.5 text-sm text-slate-700">{t('provider.ratings.certDesc')}</p>
          <Button className="mt-3" size="sm" onClick={download} leadingIcon={<Download className="h-4 w-4" />}>
            {t('provider.ratings.certDownload')}
          </Button>
        </div>
      </div>
    </section>
  );
}
