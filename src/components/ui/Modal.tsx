/**
 * Modal — diálogo accesible.
 *
 * - role="dialog" + aria-modal, foco atrapado dentro del panel.
 * - ESC y clic en backdrop cierran… salvo en modo `dismissible={false}`, que se
 *   usa para la encuesta del padre (solo se sale completándola o al expirar).
 * - Render en portal, scroll del fondo bloqueado, animación motion-safe.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Si es false, oculta la X y desactiva ESC/backdrop. Default: true. */
  dismissible?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl' } as const;

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dismissible = true,
  size = 'md',
}: ModalProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2)}`).current;
  const descId = description
    ? `modal-desc-${titleId}`
    : undefined;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [dismissible, onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleKeyDown]);

  // Foco inicial y bloqueo de scroll: SOLO al abrir/cerrar (no en cada tecla).
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => {
      const panel = panelRef.current;
      panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = '';
      window.clearTimeout(timer);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 motion-safe:animate-[fade_150ms_ease-out] sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={cn(
          'w-full rounded-t-2xl bg-white shadow-xl sm:rounded-2xl',
          'max-h-[90vh] overflow-y-auto',
          widths[size],
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h2 id={titleId} className="text-xl font-bold text-slate-900">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </header>

        <div className="p-5">{children}</div>

        {footer && (
          <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-100 p-5">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
