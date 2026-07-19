/**
 * DownloadResourceButton — botón reutilizable para descargar un recurso (PDF).
 *
 * Accesible: enlace real con `download`, etiqueta que incluye el formato, área
 * táctil amplia y foco visible. Transición solo de color (sin movimiento).
 */
import { Download, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export interface DownloadResourceButtonProps {
  /** Ruta del archivo (servido desde /public, p. ej. "/kit/bitacora-abc.pdf"). */
  file: string;
  label: string;
  description?: string;
  className?: string;
}

export function DownloadResourceButton({ file, label, description, className }: DownloadResourceButtonProps) {
  const { t } = useTranslation();
  return (
    <a
      href={file}
      download
      aria-label={`${t('kit.download')}: ${label} (PDF)`}
      className={cn(
        'group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left',
        'transition-colors hover:border-brand-400 hover:bg-brand-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        className,
      )}
    >
      <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-white">
        <FileText className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-semibold text-slate-900">{label}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">PDF</span>
        </span>
        {description && <span className="mt-1 block text-sm leading-relaxed text-muted">{description}</span>}
        <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
          <Download className="h-4 w-4" aria-hidden="true" /> {t('kit.download')}
        </span>
      </span>
    </a>
  );
}
