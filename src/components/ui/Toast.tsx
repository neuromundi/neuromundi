/**
 * Toast — notificaciones no bloqueantes (reemplazan alert()).
 *
 * `ToastProvider` envuelve la app y expone `useToast()`. Cada toast se anuncia
 * con aria-live, se auto-descarta a los 3s (configurable) y respeta el foco.
 * Variantes con tono positivo, alineadas a la guía de UX del spec.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'info' | 'error';

interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant, durationMs?: number) => void;
  success: (message: string) => void;
  info: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, { bar: string; icon: ReactNode; role: 'status' | 'alert' }> = {
  success: {
    bar: 'border-l-sage-500',
    icon: <CheckCircle2 className="h-5 w-5 text-sage-500" aria-hidden="true" />,
    role: 'status',
  },
  info: {
    bar: 'border-l-brand-500',
    icon: <Info className="h-5 w-5 text-brand-500" aria-hidden="true" />,
    role: 'status',
  },
  error: {
    bar: 'border-l-evs-2',
    icon: <AlertTriangle className="h-5 w-5 text-evs-2" aria-hidden="true" />,
    role: 'alert',
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t: translate } = useTranslation();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback<ToastContextValue['toast']>(
    (message, variant = 'info', durationMs = 3000) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, variant, message }]);
      const timer = setTimeout(() => dismiss(id), durationMs);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (m) => toast(m, 'success'),
      info: (m) => toast(m, 'info'),
      error: (m) => toast(m, 'error'),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6"
          aria-live="polite"
        >
          {toasts.map((t) => {
            const v = VARIANT_STYLES[t.variant];
            return (
              <div
                key={t.id}
                role={v.role}
                className={cn(
                  'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border-l-4 bg-white p-4 shadow-lg',
                  'motion-safe:animate-[slideUp_200ms_ease-out]',
                  v.bar,
                )}
              >
                {v.icon}
                <p className="flex-1 text-sm text-slate-800">{t.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label={translate('common.dismiss')}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>.');
  }
  return ctx;
}
