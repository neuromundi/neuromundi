/**
 * SocialButtons — inicio de sesión con proveedores sociales. Tras autenticarse,
 * si el usuario es nuevo se le pedirá completar su perfil (elegir tipo + aceptar
 * reglamento) mediante el flujo de onboarding.
 *
 * Activos: Google, LinkedIn, Azure (Microsoft).
 * Ocultos por ahora: Facebook y Apple (su código se conserva más abajo).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

type Provider = 'google' | 'facebook' | 'apple' | 'linkedin_oidc' | 'azure';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
    <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
  </svg>
);
const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="#0A66C2"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.8 0 0 .78 0 1.74v20.52C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.74V1.74C24 .78 23.2 0 22.22 0Z" /></svg>
);
const AzureIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path fill="#F25022" d="M3 3h8.5v8.5H3z" />
    <path fill="#7FBA00" d="M12.5 3H21v8.5h-8.5z" />
    <path fill="#00A4EF" d="M3 12.5h8.5V21H3z" />
    <path fill="#FFB900" d="M12.5 12.5H21V21h-8.5z" />
  </svg>
);

export function SocialButtons() {
  const { t } = useTranslation();
  const toast = useToast();
  const { signInWithProvider } = useAuth();
  const [busy, setBusy] = useState<Provider | null>(null);

  const go = async (p: Provider) => {
    setBusy(p);
    const r = await signInWithProvider(p);
    if (!r.ok) { toast.error(r.error); setBusy(null); }
  };

  const btn = 'flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 py-1 text-xs text-muted">
        <span className="h-px flex-1 bg-slate-200" /> {t('social.or')} <span className="h-px flex-1 bg-slate-200" />
      </div>
      <button type="button" className={btn} disabled={busy !== null} onClick={() => go('google')}>
        <GoogleIcon /> {t('social.google')}
      </button>
      <button type="button" className={btn} disabled={busy !== null} onClick={() => go('linkedin_oidc')}>
        <LinkedInIcon /> {t('social.linkedin')}
      </button>
      <button type="button" className={btn} disabled={busy !== null} onClick={() => go('azure')}>
        <AzureIcon /> {t('social.azure')}
      </button>

      {/* Ocultos por ahora: Facebook y Apple. Para reactivarlos, añade aquí sus
          botones llamando go('facebook') / go('apple'); el resto del flujo ya
          está implementado en authStore.signInWithProvider. */}
    </div>
  );
}
