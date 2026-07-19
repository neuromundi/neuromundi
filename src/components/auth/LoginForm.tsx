/**
 * LoginForm — inicio de sesión.
 *
 * React Hook Form + Zod. Llama a useAuth().signIn; al éxito invoca onSuccess.
 * Ante un fallo de credenciales, Supabase puede devolver un error genérico que
 * engloba dos causas: contraseña incorrecta o correo sin confirmar. Por eso, al
 * fallar, ofrecemos SIEMPRE dos vías de recuperación: reenviar la confirmación
 * del correo y enviar un enlace para restablecer la contraseña.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button, useToast, PasswordInput} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { loginSchema, type LoginValues } from '@/lib/schemas';

const inputCls =
  'w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const labelCls = 'mb-1 block font-semibold text-slate-900';

export function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const { signIn } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [resending, setResending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    setShowHelp(false);
    const res = await signIn(values.email, values.password);
    if (res.ok) { onSuccess?.(); return; }
    setFormError(res.error);
    setShowHelp(true); // El error puede ser contraseña o correo sin confirmar.
  };

  const resend = async () => {
    const email = getValues('email');
    if (!email) { toast.error(t('auth.enterEmailFirst')); return; }
    setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    if (error) toast.error(error.message);
    else toast.success(t('auth.confirmResent'));
  };

  const resetPassword = async () => {
    const email = getValues('email');
    if (!email) { toast.error(t('auth.enterEmailFirst')); return; }
    setResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/ajustes?recovery=1`,
    });
    setResetting(false);
    if (error) toast.error(error.message);
    else toast.success(t('auth.resetSent'));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {formError && (
        <div role="alert" className="space-y-2 rounded-lg bg-red-50 p-3 text-sm text-evs-1">
          <p>{formError}</p>
          {showHelp && (
            <>
              <p className="text-slate-600">{t('auth.loginHelp')}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" loading={resending} onClick={resend}>
                  {t('auth.resendConfirm')}
                </Button>
                <Button type="button" size="sm" variant="ghost" loading={resetting} onClick={resetPassword}>
                  {t('auth.forgotPassword')}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
      <div>
        <label htmlFor="login-email" className={labelCls}>{t('auth.email')}</label>
        <input id="login-email" type="email" autoComplete="email" className={inputCls} {...register('email')} />
        {errors.email && <p role="alert" className="mt-1 text-sm text-evs-1">{t(errors.email.message!)}</p>}
      </div>
      <div>
        <label htmlFor="login-password" className={labelCls}>{t('auth.password')}</label>
        <PasswordInput id="login-password" autoComplete="current-password" className={inputCls} {...register('password')} />
        {errors.password && <p role="alert" className="mt-1 text-sm text-evs-1">{t(errors.password.message!)}</p>}
      </div>
      <Button type="submit" loading={isSubmitting} fullWidth>{t('auth.signIn')}</Button>
      <button
        type="button"
        onClick={resetPassword}
        className="mx-auto block text-sm font-semibold text-brand-700 hover:underline"
      >
        {t('auth.forgotPassword')}
      </button>
    </form>
  );
}
