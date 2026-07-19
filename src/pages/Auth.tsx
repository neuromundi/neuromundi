/**
 * Auth — entrar o crear cuenta. Si ya hay sesión, redirige al panel. Al
 * autenticarse, navega al destino previo o al panel.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LoginForm, RegisterForm } from '@/components/auth';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

type LocationState = { from?: string } | null;

export function Auth() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const dest = (location.state as LocationState)?.from ?? '/panel';

  useEffect(() => {
    if (isAuthenticated) navigate(dest, { replace: true });
  }, [isAuthenticated, dest, navigate]);

  if (isAuthenticated) return <Navigate to={dest} replace />;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={cn(
              'flex-1 rounded-lg py-2 text-sm font-semibold',
              mode === m ? 'bg-white text-brand-700 shadow-sm' : 'text-muted',
            )}
          >
            {m === 'login' ? t('auth.login') : t('auth.register')}
          </button>
        ))}
      </div>

      {mode === 'login' ? (
        <LoginForm onSuccess={() => navigate(dest, { replace: true })} />
      ) : (
        <RegisterForm onSuccess={() => navigate(dest, { replace: true })} />
      )}
    </div>
  );
}
