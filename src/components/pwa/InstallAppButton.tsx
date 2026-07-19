/**
 * InstallAppButton — botón para instalar Neuromundi como app (PWA).
 *
 * Android / escritorio (Chromium): lanza el prompt NATIVO de instalación (instala
 * de verdad, sin instrucciones). iOS (Safari): no existe instalación programática,
 * así que ahí sí se muestran instrucciones. En navegadores sin soporte, o si la
 * app ya corre instalada (standalone), el botón no se muestra.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Share } from 'lucide-react';
import { Modal, useToast } from '@/components/ui';
import { usePwaInstall } from '@/hooks/usePwaInstall';

const BTN =
  'inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function InstallAppButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { isStandalone, canPrompt, isIOS, promptInstall } = usePwaInstall();
  const [showHelp, setShowHelp] = useState(false);

  // Ya está instalada / corriendo como app.
  if (isStandalone) return null;

  // Android / escritorio (Chromium): instalación real con el prompt nativo.
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

  // iOS (Safari): no hay instalación programática → instrucciones manuales.
  if (isIOS) {
    return (
      <>
        <button type="button" onClick={() => setShowHelp(true)} className={className ?? BTN}>
          <Download className="h-4 w-4" aria-hidden="true" /> {t('pwa.install')}
        </button>
        {showHelp && (
          <Modal open onClose={() => setShowHelp(false)} title={t('pwa.helpTitle')}>
            <p className="text-sm text-slate-600">{t('pwa.helpIntro')}</p>
            <p className="mt-3 flex items-start gap-2 text-sm text-slate-700">
              <Share className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              <span>{t('pwa.iosStep')}</span>
            </p>
          </Modal>
        )}
      </>
    );
  }

  // Navegador sin soporte de instalación (o aún sin prompt disponible): no se
  // muestra el botón para no ofrecer instrucciones en móvil/escritorio.
  return null;
}
