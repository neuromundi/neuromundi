/**
 * AllyBadgeButton — el admin descarga el distintivo VERIFICABLE de un aliado
 * (organización). El QR apunta a /verificar/aliado/:id (su página de verificación
 * pública). Un QR oculto (qrcode.react) se rasteriza a dataURL para el documento.
 */
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeCanvas } from 'qrcode.react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui';
import { downloadVerifiableBadge } from '@/lib/verifiableBadge';

export function AllyBadgeButton({ id, name }: { id: string; name: string }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const verifyUrl = `${window.location.origin}/verificar/aliado/${id}`;

  const download = () => {
    const canvas = ref.current?.querySelector('canvas');
    downloadVerifiableBadge({
      title: t('verifiable.allyTitle'),
      name,
      qrDataUrl: canvas ? canvas.toDataURL('image/png') : '',
      verifyUrl: verifyUrl.replace(/^https?:\/\//, ''),
      labels: { verify: t('verifiable.verifyLabel') },
    });
  };

  return (
    <>
      <Button size="sm" variant="ghost" onClick={download} leadingIcon={<Download className="h-4 w-4" />}>
        {t('adm.ally.badge')}
      </Button>
      <div ref={ref} className="pointer-events-none absolute -left-[9999px] -top-[9999px]" aria-hidden="true">
        <QRCodeCanvas value={verifyUrl} size={380} level="M" includeMargin />
      </div>
    </>
  );
}
