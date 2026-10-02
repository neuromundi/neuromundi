/**
 * VerifiableBadgeCard — deja al miembro descargar su distintivo VERIFICABLE:
 * personalizado (nombre + folio) y con un QR a /verificar/:folio. Un QR oculto
 * (qrcode.react) se rasteriza a dataURL y se incrusta en el documento imprimible.
 */
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeCanvas } from 'qrcode.react';
import { BadgeCheck, Download } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { downloadVerifiableBadge } from '@/lib/verifiableBadge';

export function VerifiableBadgeCard() {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const qrWrapRef = useRef<HTMLDivElement>(null);

  if (!profile?.member_no) return null;

  const folio = `NM-${String(profile.member_no).padStart(6, '0')}`;
  const name = profile.business_name || profile.full_name || folio;
  const isCompany = profile.provider_type === 'company';
  const title = isCompany ? t('verifiable.companyTitle') : t('verifiable.memberTitle');
  const verifyUrl = `${window.location.origin}/verificar/${folio}`;

  const download = () => {
    const canvas = qrWrapRef.current?.querySelector('canvas');
    const qrDataUrl = canvas ? canvas.toDataURL('image/png') : '';
    downloadVerifiableBadge({
      title, name, folio, qrDataUrl,
      verifyUrl: verifyUrl.replace(/^https?:\/\//, ''),
      labels: { verify: t('verifiable.verifyLabel'), folio: t('verifiable.folioLabel') },
    });
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <BadgeCheck className="h-6 w-6 shrink-0 text-brand-600" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="font-bold text-slate-900">{t('verifiable.card')}</h3>
          <p className="mt-1 text-sm text-muted">{t('verifiable.desc')}</p>
          <Button className="mt-3" size="sm" onClick={download} leadingIcon={<Download className="h-4 w-4" />}>
            {t('verifiable.download')}
          </Button>
        </div>
      </div>
      {/* QR oculto, solo para rasterizar a dataURL */}
      <div ref={qrWrapRef} className="pointer-events-none absolute -left-[9999px] -top-[9999px]" aria-hidden="true">
        <QRCodeCanvas value={verifyUrl} size={380} level="M" includeMargin />
      </div>
    </div>
  );
}
