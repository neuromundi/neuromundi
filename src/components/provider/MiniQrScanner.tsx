/**
 * MiniQrScanner — escáner de QR de un solo uso.
 *
 * Pide cámara al montar, devuelve el primer texto decodificado y apaga la cámara.
 * Genérico: lo usa el armador de recetas para vincular al padre por su QR. La
 * cámara se libera siempre en el cleanup.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { logger } from '@/lib/utils';

export interface MiniQrScannerProps {
  onDecoded: (text: string) => void;
  onError?: (message: string) => void;
  regionId?: string;
}

export function MiniQrScanner({
  onDecoded,
  onError,
  regionId = 'mini-qr-region',
}: MiniQrScannerProps) {
  const { t } = useTranslation();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const [failed, setFailed] = useState(false);

  const stop = useCallback(async () => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      if (s.isScanning) await s.stop();
      s.clear();
    } catch (e) {
      logger.warn('Error al detener cámara:', e);
    } finally {
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      if (!mounted) return;
      try {
        const scanner = new Html5Qrcode(regionId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => {
            if (handledRef.current) return;
            handledRef.current = true;
            void stop().then(() => onDecoded(text));
          },
          () => {},
        );
      } catch (e) {
        logger.error('Cámara no disponible:', e);
        setFailed(true);
        onError?.('No pudimos usar la cámara. Revisa los permisos.');
      }
    })();
    return () => {
      mounted = false;
      void stop();
    };
  }, [regionId, stop, onDecoded, onError]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div id={regionId} className="w-full max-w-xs overflow-hidden rounded-2xl border border-slate-200" />
      {failed ? (
        <p role="alert" className="text-sm text-evs-1">
          {t('rx.cameraUnavailable')}
        </p>
      ) : (
        <p className="text-sm text-muted">{t('rx.aimQr')}</p>
      )}
      <Button variant="ghost" onClick={() => void stop()}>
        {t('rx.stop')}
      </Button>
    </div>
  );
}
