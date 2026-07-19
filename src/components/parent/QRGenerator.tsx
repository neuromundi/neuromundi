/**
 * QRGenerator — el código QR personal del padre.
 *
 * Codifica { parentId, qrToken } en JSON. Permite descargarlo como PNG y rotar
 * el token (invalida QR previos) tras una confirmación explícita. Incluye
 * instrucciones de uso en tres pasos para reducir la carga cognitiva.
 */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, RefreshCw, ScanLine, Tag, Star } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useToast, HowTo} from '@/components/ui';
import { Button, Modal } from '@/components/ui';
import type { ParentQrPayload, Profile } from '@/types/app';

export interface QRGeneratorProps {
  profile: Profile;
}

const STEPS = [
  { icon: ScanLine, key: 'qr.step1' },
  { icon: Tag, key: 'qr.step2' },
  { icon: Star, key: 'qr.step3' },
];

export function QRGenerator({ profile }: QRGeneratorProps) {
  const { t } = useTranslation();
  const { regenerateQrToken, saving } = useProfile();
  const toast = useToast();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const payload: ParentQrPayload = {
    parentId: profile.id,
    qrToken: profile.qr_token,
  };
  const value = JSON.stringify(payload);

  const handleDownload = () => {
    const canvas = wrapperRef.current?.querySelector('canvas');
    if (!canvas) {
      toast.error(t('qr.downloadError'));
      return;
    }
    const link = document.createElement('a');
    link.download = 'mi-codigo-neuromundi.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleRegenerate = async () => {
    const result = await regenerateQrToken();
    setConfirmOpen(false);
    if (result.ok) {
      toast.success(t('qr.regenerated'));
    } else {
      toast.error(result.error);
    }
  };

  return (
    <section aria-label={t('qr.sectionAria')} className="flex flex-col items-center gap-6">
      <div className="w-full"><HowTo stepsKey="howto.parentQr" /></div>
      <div
        ref={wrapperRef}
        className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
      >
        <QRCodeCanvas
          value={value}
          size={232}
          level="M"
          includeMargin
          aria-label={t('qr.imgAria')}
          role="img"
        />
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <Button onClick={handleDownload} leadingIcon={<Download className="h-5 w-5" />} fullWidth>
          {t('qr.download')}
        </Button>
        <Button
          variant="secondary"
          onClick={() => setConfirmOpen(true)}
          leadingIcon={<RefreshCw className="h-5 w-5" />}
          fullWidth
        >
          {t('qr.regenerate')}
        </Button>
      </div>

      <ol className="w-full max-w-sm space-y-3" aria-label={t('qr.howToAria')}>
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <li key={i} className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-sm text-slate-700">
                <span className="font-semibold">{t('qr.step', { n: i + 1 })}</span> {t(step.key)}
              </span>
            </li>
          );
        })}
      </ol>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('qr.confirmTitle')}
        description={t('qr.confirmDesc')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t('common.betterNot')}
            </Button>
            <Button variant="primary" onClick={handleRegenerate} loading={saving}>
              {t('qr.confirmYes')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          {t('qr.confirmBody')}
        </p>
      </Modal>
    </section>
  );
}
