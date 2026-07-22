/**
 * Button — botón base del sistema.
 *
 * Garantiza área táctil mínima de 44×44px, foco visible por teclado, estado de
 * carga con spinner accesible y respeto a prefers-reduced-motion vía la
 * transición de Tailwind (motion-safe).
 */
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Muestra spinner y deshabilita la interacción. */
  loading?: boolean;
  /** Ocupa todo el ancho disponible. */
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold ' +
  'min-h-[44px] select-none ' +
  'transition-colors motion-safe:duration-150 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed';

const variants: Record<ButtonVariant, string> = {
  // brand-600 sobre blanco da 4.1:1 y no alcanza el mínimo AA (4.5:1);
  // brand-700 da 5.93:1 y mantiene el azul de marca.
  primary: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900',
  secondary:
    'bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-100',
  ghost: 'bg-transparent text-brand-700 hover:bg-brand-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'px-3 text-sm min-w-[44px]',
  md: 'px-4 py-2.5 text-base',
  lg: 'px-6 py-3 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    leadingIcon,
    trailingIcon,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 motion-safe:animate-spin" aria-hidden="true" />
      ) : (
        leadingIcon
      )}
      {children}
      {!loading && trailingIcon}
    </button>
  );
});
