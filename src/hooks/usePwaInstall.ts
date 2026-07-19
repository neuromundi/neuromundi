/**
 * usePwaInstall — soporte para instalar la PWA.
 *
 * En Android/escritorio (Chromium) captura el evento `beforeinstallprompt` para
 * lanzar la instalación con un toque. En iOS (Safari) no existe ese evento, así
 * que sólo se detecta el caso para mostrar instrucciones manuales. Detecta si la
 * app ya corre instalada (standalone) para ocultar el botón.
 */
import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mm = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mm || iosStandalone;
}

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ se anuncia como Mac con pantalla táctil.
  const iPadOS = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1;
  return iOSDevice || iPadOS;
}

export function usePwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState<boolean>(detectStandalone());
  const isIOS = detectIOS();

  useEffect(() => {
    const onBIP = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent); };
    const onInstalled = () => { setStandalone(true); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onBIP as EventListener);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP as EventListener);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    return choice.outcome === 'accepted';
  }, [deferred]);

  return {
    /** Ya está instalada / corriendo como app: no mostrar el botón. */
    isStandalone: standalone,
    /** Hay prompt nativo disponible (Android/escritorio). */
    canPrompt: !!deferred && !standalone,
    /** Dispositivo iOS (instrucciones manuales por Safari). */
    isIOS,
    promptInstall,
  };
}
