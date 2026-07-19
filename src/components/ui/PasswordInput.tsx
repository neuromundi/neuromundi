/**
 * PasswordInput — campo de contraseña con botón para ver/ocultar.
 *
 * Evita errores de tecleo (typos, Bloq Mayús) permitiendo mostrar el texto.
 * Compatible con react-hook-form (reenvía ref y props vía forwardRef) y con
 * campos controlados (value/onChange). El botón es accesible por teclado y
 * cumple el objetivo de toque; el área táctil no desplaza el layout.
 */
import { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PasswordInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, ...rest }, ref) {
    const { t } = useTranslation();
    const [show, setShow] = useState(false);
    const label = show ? t('auth.hidePassword') : t('auth.showPassword');
    return (
      <div className="relative">
        <input
          ref={ref}
          type={show ? 'text' : 'password'}
          className={cn(className, 'pr-12')}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={label}
          aria-pressed={show}
          title={label}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {show ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>
    );
  },
);
