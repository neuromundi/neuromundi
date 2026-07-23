/**
 * InstallAppButton — botón para instalar Neuromundi como app (PWA).
 *
 * Orden de preferencia:
 *  1. Si hay prompt NATIVO disponible (Android/escritorio Chromium tras
 *     `beforeinstallprompt`) → instala de verdad con un toque.
 *  2. Si no hay prompt pero es un dispositivo TÁCTIL (móvil/tablet) → muestra el
 *     botón igual y abre instrucciones según la plataforma (iOS Safari usa
 *     Compartir → Agregar a inicio; Android/otros, el menú del navegador). Esto
 *     garantiza que en móvil SIEMPRE se vea una vía para instalar, aunque el
 *     navegador no haya ofrecido el prompt (Chrome no lo dispara siempre: tiene
 *     periodos de espera tras un rechazo, y otros navegadores no lo emiten).
 *  3. En escritorio sin prompt no se muestra nada (evita ruido; ahí el botón
 *     aparece solo cuando el navegador confirma que se puede instalar).
 *
 * Si la app ya corre instalada (standalone), no se muestra.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Share, Menu } from 'lucide-react';
import { Modal, useToast } from '@/components/ui';
import { usePwaInstall } from '@/hooks/usePwaInstall';

const BTN =
  'inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

/** ¿Es un dispositivo táctil? (móvil/tablet) — puntero grueso, sin hover fino. */
function isTouchDevice(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

export function InstallAppButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { isStandalone, canPrompt, isIOS, promptInstall } = usePwaInstall();
  const [showHelp, setShowHelp] = useState(false);

  // Ya está instalada / corriendo como app.
  if (isStandalone) return null;

  // 1) Prompt nativo (Android / escritorio Chromium): instalación real.
  if (canPrompt) {
    const onClick = async () => {
      const ok = await promptInstall();
      if (ok) toast.success(t('pwa.installedToast'));
    };
    return (
      <button type="button" onClick={onClick} className={className ?? BTN}>
        <Download className="h-4 w-4" aria-hidden="true" /> {t('pwa.install')}
      </button>
    );
  }

  // 2) Sin prompt: en móvil/tablet mostramos instrucciones (iOS o Android).
  //    En escritorio sin prompt no mostramos nada.
  if (isIOS || isTouchDevice()) {
    return (
      <>
        <button type="button" onClick={() => setShowHelp(true)} className={className ?? BTN}>
          <Download className="h-4 w-4" aria-hidden="true" /> {t('pwa.install')}
        </button>
        {showHelp && (
          <Modal open onClose={() => setShowHelp(false)} title={t('pwa.helpTitle')}>
            <p className="text-sm text-slate-600">{t('pwa.helpIntro')}</p>
            <p className="mt-3 flex items-start gap-2 text-sm text-slate-700">
              {isIOS ? (
                <Share className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              ) : (
                <Menu className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              )}
              <span>{isIOS ? t('pwa.iosStep') : t('pwa.androidStep')}</span>
            </p>
          </Modal>
        )}
      </>
    );
  }

  // 3) Escritorio sin prompt disponible: no se muestra.
  return null;
}
