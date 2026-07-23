/**
 * usePwaInstall — soporte para instalar la PWA.
 *
 * En Android/escritorio (Chromium) captura el evento `beforeinstallprompt` para
 * lanzar la instalación con un toque. En iOS (Safari) no existe ese evento, así
 * que sólo se detecta el caso para mostrar instrucciones manuales. Detecta si la
 * app ya corre instalada (standalone) para ocultar el botón.
 *
 * IMPORTANTE — el evento se comparte entre instancias:
 * `beforeinstallprompt` se dispara UNA sola vez, temprano en la carga. Si cada
 * componente registrara su propio listener al montarse, un botón que aparece
 * más tarde (p. ej. dentro del menú "Más", que se monta al abrirlo) ya se
 * habría perdido el evento y nunca podría instalar. Por eso el evento se captura
 * a nivel de MÓDULO una sola vez y se guarda; cualquier hook que monte después
 * lee ese valor cacheado y se suscribe a los cambios.
 */
import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// ── Estado compartido a nivel de módulo ─────────────────────────────────────
let cachedPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    cachedPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    cachedPrompt = null;
    notify();
  });
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
  // Un solo contador para forzar re-render cuando cambia el estado compartido.
  const [, force] = useState(0);
  const [standalone, setStandalone] = useState<boolean>(detectStandalone() || installed);
  const isIOS = detectIOS();

  useEffect(() => {
    const onChange = () => {
      if (installed) setStandalone(true);
      force((n) => n + 1);
    };
    listeners.add(onChange);
    // Por si el evento llegó ENTRE el render inicial y este efecto.
    onChange();
    return () => { listeners.delete(onChange); };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!cachedPrompt) return false;
    await cachedPrompt.prompt();
    const choice = await cachedPrompt.userChoice;
    cachedPrompt = null;
    notify();
    return choice.outcome === 'accepted';
  }, []);

  return {
    /** Ya está instalada / corriendo como app: no mostrar el botón. */
    isStandalone: standalone,
    /** Hay prompt nativo disponible (Android/escritorio). */
    canPrompt: !!cachedPrompt && !standalone,
    /** Dispositivo iOS (instrucciones manuales por Safari). */
    isIOS,
    promptInstall,
  };
}
