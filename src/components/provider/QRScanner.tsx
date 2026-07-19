/**
 * QRScanner — escaneo del QR del padre y aplicación del descuento.
 *
 * Pide permiso de cámara SOLO al iniciar el escaneo (no al cargar el dashboard).
 * Decodifica { parentId, qrToken }, valida contra Supabase, deja elegir una
 * oferta activa y crea la transacción en estado 'pending'. La cámara se apaga
 * tras un escaneo exitoso. Maneja QR inválido, expirado y cámara no disponible.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CheckCircle2, CameraOff, ScanLine } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, HowTo} from '@/components/ui';
import { useTransactions } from '@/hooks/useTransactions';
import { logger } from '@/lib/utils';
import type { Offer, ParentQrPayload } from '@/types/app';

type ScannedParent = { id: string; full_name: string };

export interface QRScannerProps {
  providerId: string;
  /** Ofertas activas entre las que elegir al aplicar el descuento. */
  activeOffers: Offer[];
  /** Se llama tras aplicar un descuento, para refrescar el historial. */
  onApplied?: () => void;
}

type Phase = 'idle' | 'scanning' | 'choosing' | 'applying' | 'success' | 'error';

const READER_ID = 'qr-reader-region';

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function parsePayload(text: string): ParentQrPayload | null {
  try {
    const obj = JSON.parse(text);
    if (typeof obj?.parentId === 'string' && typeof obj?.qrToken === 'string') {
      return { parentId: obj.parentId, qrToken: obj.qrToken };
    }
  } catch {
    /* no es JSON válido */
  }
  return null;
}

function Confetti() {
  if (prefersReduced) return null;
  const colors = ['#0ea5e9', '#f59e0b', '#22c55e', '#84cc16', '#f97316'];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="absolute top-0 h-2 w-2 rounded-sm"
          style={{
            left: `${(i / 14) * 100}%`,
            backgroundColor: colors[i % colors.length],
            animation: `confettiFall ${0.8 + (i % 5) * 0.15}s ease-in ${(i % 7) * 0.05}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

export function QRScanner({ providerId, activeOffers, onApplied }: QRScannerProps) {
  const { t } = useTranslation();
  const { validateQr, createFromScan } = useTransactions(providerId, 'provider');

  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [parent, setParent] = useState<ScannedParent | null>(null);
  const [qr, setQr] = useState<ParentQrPayload | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch (e) {
      logger.warn('Error al detener la cámara:', e);
    } finally {
      scannerRef.current = null;
    }
  }, []);

  // Garantiza apagar la cámara al desmontar.
  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  const onScanSuccess = useCallback(
    async (decodedText: string) => {
      if (handledRef.current) return;
      handledRef.current = true;
      await stopCamera();

      const payload = parsePayload(decodedText);
      if (!payload) {
        setMessage(t('scan.notNeuro'));
        setPhase('error');
        return;
      }
      if (payload.parentId === providerId) {
        setMessage(t('scan.selfScan'));
        setPhase('error');
        return;
      }

      const valid = await validateQr(payload);
      if (!valid.ok) {
        setMessage(valid.error);
        setPhase('error');
        return;
      }
      setParent(valid.data);
      setQr(payload);
      setPhase('choosing');
    },
    [providerId, stopCamera, validateQr],
  );

  const startScanning = useCallback(async () => {
    setMessage(null);
    handledRef.current = false;
    setPhase('scanning');
    // Espera a que el contenedor exista en el DOM.
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    try {
      const scanner = new Html5Qrcode(READER_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text) => void onScanSuccess(text),
        () => {
          /* fallo por frame: se ignora */
        },
      );
    } catch (e) {
      logger.error('No se pudo iniciar la cámara:', e);
      setMessage(
        t('scan.cameraError'),
      );
      setPhase('error');
    }
  }, [onScanSuccess]);

  const applyOffer = useCallback(
    async (offer: Offer) => {
      if (!qr) return;
      setPhase('applying');
      const res = await createFromScan({ qr, offerId: offer.id, providerId });
      if (res.ok) {
        setPhase('success');
        onApplied?.();
      } else {
        setMessage(res.error);
        setPhase('error');
      }
    },
    [qr, providerId, createFromScan, onApplied],
  );

  const reset = useCallback(() => {
    setParent(null);
    setQr(null);
    setMessage(null);
    setPhase('idle');
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === 'success') {
    return (
      <div className="relative flex flex-col items-center gap-4 py-10 text-center">
        <Confetti />
        <CheckCircle2
          className="h-16 w-16 text-sage-500 motion-safe:animate-[fade_300ms_ease-out]"
          aria-hidden="true"
        />
        <div role="status">
          <p className="text-lg font-bold text-slate-900">{t('scan.appliedTitle')}</p>
          <p className="text-sm text-muted">{t('scan.appliedBody')}</p>
        </div>
        <Button onClick={startScanning} leadingIcon={<ScanLine className="h-5 w-5" />}>
          {t('scan.scanAnother')}
        </Button>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <CameraOff className="h-14 w-14 text-muted" aria-hidden="true" />
        <p role="alert" className="max-w-sm text-slate-700">
          {message}
        </p>
        <Button onClick={startScanning}>{t('scan.retry')}</Button>
      </div>
    );
  }

  if (phase === 'choosing') {
    return (
      <div className="space-y-4">
        <HowTo stepsKey="howto.scan" />
        <p className="text-center text-slate-700">
          {t('scan.chooseFor')}{' '}
          <span className="font-semibold">{parent?.full_name ?? t('scan.clientFallback')}</span>:
        </p>
        {activeOffers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-muted">
            {t('scan.noActive')}
          </div>
        ) : (
          <ul className="space-y-2">
            {activeOffers.map((offer) => (
              <li key={offer.id}>
                <button
                  type="button"
                  onClick={() => applyOffer(offer)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-4 text-left hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <span className="font-semibold text-slate-900">{offer.title}</span>
                  <span className="text-sm text-brand-700">{t('scan.apply')}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="text-center">
          <Button variant="ghost" onClick={reset}>
            {t('scan.cancel')}
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'applying') {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <ScanLine className="h-12 w-12 text-brand-500 motion-safe:animate-pulse" aria-hidden="true" />
        <p className="text-slate-700">{t('scan.applying')}</p>
      </div>
    );
  }

  if (phase === 'scanning') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div
          id={READER_ID}
          className="w-full max-w-xs overflow-hidden rounded-2xl border border-slate-200"
        />
        <p className="text-sm text-muted">{t('scan.aim')}</p>
        <Button variant="ghost" onClick={() => void stopCamera().then(reset)}>
          {t('scan.stop')}
        </Button>
      </div>
    );
  }

  // idle
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <Camera className="h-8 w-8" aria-hidden="true" />
      </span>
      <div>
        <p className="text-lg font-semibold text-slate-900">{t('scan.idleTitle')}</p>
        <p className="max-w-sm text-sm text-muted">
          {t('scan.idleBody')}
        </p>
      </div>
      <Button onClick={startScanning} leadingIcon={<ScanLine className="h-5 w-5" />}>
        {t('scan.start')}
      </Button>
    </div>
  );
}
