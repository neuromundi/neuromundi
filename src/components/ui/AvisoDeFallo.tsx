/**
 * AvisoDeFallo — «no se pudo cargar», que no es lo mismo que «no hay nada».
 *
 * Por qué existe (15 oct 2026, auditoría, hallazgo A-12): quince pantallas
 * convertían un fallo de consulta en una lista vacía. Un fundador que pagó no
 * aparecía en el muro, un foro con mensajes se veía vacío y el buscador decía
 * «no encontramos nada» para términos que sí tienen resultados. Nadie se
 * enteraba de que la consulta había fallado, ni el usuario ni el administrador.
 */
import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface AvisoDeFalloProps {
  /** Qué hacer al reintentar. Si no se pasa, se ofrece recargar la página. */
  onRetry?: () => void;
  /** Mensaje propio; por omisión, el genérico de carga. */
  mensaje?: string;
}

export function AvisoDeFallo({ onRetry, mensaje }: AvisoDeFalloProps) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center"
    >
      <AlertTriangle className="h-8 w-8 text-amber-600" aria-hidden="true" />
      <p className="text-sm font-semibold text-amber-900">{mensaje ?? t('common.loadFailed')}</p>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => (onRetry ? onRetry() : window.location.reload())}
        leadingIcon={<RefreshCw className="h-4 w-4" />}
      >
        {t('common.retry')}
      </Button>
    </div>
  );
}
