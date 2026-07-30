/**
 * GlobalMemberBadge — tarjeta para descargar el distintivo oficial
 * "Neuromundi Global Member".
 *
 * Solo se muestra a miembros que YA hicieron su pago: `membership.status === 'active'`.
 * (Las familias/pacientes son gratuitas → `exempt`, y no lo ven; los que están en
 * `pending`/`past_due` tampoco, hasta cubrir su cuota.)
 *
 * Los archivos viven en `public/badge/` (PNG con fondo transparente para redes y
 * WebP más ligero para la web), generados con `scripts/gen_global_member_badge.py`.
 */
import { useTranslation } from 'react-i18next';
import { Download, Globe } from 'lucide-react';
import { useMembership } from '@/hooks/useMembership';

const PNG = '/badge/neuromundi-global-member-1080.png';
const WEBP = '/badge/neuromundi-global-member-1080.webp';

export function GlobalMemberBadge() {
  const { t } = useTranslation();
  const { status } = useMembership();

  if (status !== 'active') return null;

  return (
    <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4">
      <h3 className="flex items-center gap-2 font-semibold text-slate-900">
        <Globe className="h-4 w-4 text-amber-600" aria-hidden="true" />
        {t('globalMember.title')}
      </h3>
      <p className="mt-1 text-sm text-muted">{t('globalMember.desc')}</p>

      <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <img
          src={WEBP}
          alt={t('globalMember.title')}
          width={128}
          height={128}
          loading="lazy"
          decoding="async"
          className="h-32 w-32 shrink-0 object-contain"
        />
        <div className="flex flex-col gap-2">
          <a
            href={PNG}
            download="neuromundi-global-member.png"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {t('globalMember.dlPng')}
          </a>
          <a
            href={WEBP}
            download="neuromundi-global-member.webp"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {t('globalMember.dlWebp')}
          </a>
          <p className="text-xs text-muted">{t('globalMember.hint')}</p>
        </div>
      </div>
    </section>
  );
}
