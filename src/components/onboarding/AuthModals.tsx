/**
 * AuthModals — flujo de acceso por modales:
 *  - 'access'   → elegir entre Registrarme / Iniciar sesión + enlace "Conocer más".
 *  - 'register' → formulario de registro (con su selector de 4 tipos).
 *  - 'login'    → formulario de inicio de sesión.
 *
 * El estado lo controla el padre (AppLayout) vía `view` y `onChangeView`.
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserPlus, LogIn, Info } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { LoginForm, RegisterForm } from '@/components/auth';
import { MembershipModal } from './MembershipModal';
import { SocialButtons } from './SocialButtons';

export type AuthView = 'none' | 'access' | 'register' | 'login' | 'membership';

interface AuthModalsProps {
  view: AuthView;
  onChangeView: (v: AuthView) => void;
  onAuthenticated?: () => void;
}

export function AuthModals({ view, onChangeView, onAuthenticated }: AuthModalsProps) {
  const { t } = useTranslation();
  const close = () => onChangeView('none');
  // Tras iniciar sesión vamos al panel; tras registrarse mostramos la cuota.
  const afterLogin = () => {
    onAuthenticated?.();
    close();
  };
  const afterRegister = () => onChangeView('membership');

  return (
    <>
      {/* Acceso: dos opciones + conocer más */}
      <Modal open={view === 'access'} onClose={close} title={t('access.title')} description={t('access.subtitle')}>
        <div className="space-y-3">
          <Button onClick={() => onChangeView('register')} leadingIcon={<UserPlus className="h-5 w-5" />} fullWidth>
            {t('access.register')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => onChangeView('login')}
            leadingIcon={<LogIn className="h-5 w-5" />}
            fullWidth
          >
            {t('access.login')}
          </Button>
          <Link
            to="/conocer-mas"
            onClick={close}
            className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-brand-700 hover:underline"
          >
            <Info className="h-4 w-4" aria-hidden="true" />
            {t('access.learnMore')}
          </Link>
          <SocialButtons />
        </div>
      </Modal>

      {/* Registro: el propio formulario trae el selector de tipo (paciente,
          padre/tutor, prestador de servicios, proveedor). */}
      <Modal open={view === 'register'} onClose={close} title={t('auth.register')} size="lg">
        <RegisterForm
          onSuccess={(regType) =>
            regType === 'patient' || regType === 'parent' ? afterLogin() : afterRegister()
          }
        />
      </Modal>

      {/* Inicio de sesión */}
      <Modal open={view === 'login'} onClose={close} title={t('auth.login')}>
        <LoginForm onSuccess={afterLogin} />
      </Modal>

      {/* Cuota de afiliación (tras el registro) */}
      <MembershipModal
        open={view === 'membership'}
        onClose={() => {
          onAuthenticated?.();
          close();
        }}
      />
    </>
  );
}
