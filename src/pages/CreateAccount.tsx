/**
 * CreateAccount — página de "Entrar": el usuario elige su tipo de cuenta con
 * tarjetas y se abre el registro pre-seleccionado. Sustituye al modal de acceso.
 * Los 5 tipos base enlazan al RegisterForm; "clínica" tendrá su formulario por
 * pasos en una entrega posterior (por ahora se marca como próximamente).
 */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Users, Stethoscope, Building2, Store, School, ArrowLeft, LogIn, HeartPulse, Plane, Scale, HeartHandshake, HandHeart } from 'lucide-react';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { SpecialistRegister } from '@/pages/SpecialistRegister';
import { ProviderRegister } from '@/pages/ProviderRegister';
import { ClinicRegister } from '@/pages/ClinicRegister';
import { SchoolRegister } from '@/pages/SchoolRegister';
import { KProviderRegister } from '@/pages/KProviderRegister';
import { LoginForm } from '@/components/auth/LoginForm';
import { SocialButtons } from '@/components/onboarding/SocialButtons';
import type { RegType } from '@/lib/schemas';
import type { KType } from '@/data/kCatalog';

type CardType = RegType | 'clinic' | KType;

const CARDS: { type: CardType; icon: typeof User; color: string; soon?: boolean }[] = [
  { type: 'patient', icon: User, color: 'from-emerald-500 to-teal-600' },
  { type: 'parent', icon: Users, color: 'from-sky-500 to-brand-600' },
  { type: 'service_provider', icon: Stethoscope, color: 'from-brand-600 to-indigo-600' },
  { type: 'clinic', icon: Building2, color: 'from-cyan-600 to-teal-700' },
  { type: 'merchant', icon: Store, color: 'from-fuchsia-600 to-purple-600' },
  { type: 'school', icon: School, color: 'from-amber-500 to-orange-600' },
  { type: 'wellness', icon: HeartPulse, color: 'from-lime-500 to-emerald-600' },
  { type: 'tourism', icon: Plane, color: 'from-sky-500 to-cyan-600' },
  { type: 'legal', icon: Scale, color: 'from-slate-600 to-slate-800' },
  { type: 'ngo', icon: HeartHandshake, color: 'from-rose-500 to-pink-600' },
  { type: 'caregiver', icon: HandHeart, color: 'from-violet-500 to-purple-600' },
];

const K_SET = new Set<CardType>(['wellness', 'tourism', 'legal', 'ngo', 'caregiver']);

export function CreateAccount() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<CardType | null>(null);
  const [login, setLogin] = useState(false);
  const location = useLocation();

  // Al navegar a esta página (p. ej., pulsando "Entrar" en el header estando ya
  // aquí dentro de un sub-flujo), reiniciamos a la vista de selección de perfiles.
  useEffect(() => {
    setSelected(null);
    setLogin(false);
  }, [location.key]);

  // Registro pre-seleccionado
  if (selected) {
    const isSpecialist = selected === 'service_provider';
    const isProvider = selected === 'merchant';
    const isClinic = selected === 'clinic';
    const isSchool = selected === 'school';
    const isK = K_SET.has(selected);
    const wide = isSpecialist || isProvider || isClinic || isSchool || isK;
    return (
      <div className={`mx-auto px-4 py-10 ${wide ? 'max-w-4xl' : 'max-w-lg'}`}>
        <button onClick={() => setSelected(null)} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
          <ArrowLeft className="h-4 w-4" /> {t('create.back')}
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{t(`create.cards.${selected}.title`)}</h1>
        <div className="mt-4">
          {isSpecialist ? (
            <SpecialistRegister />
          ) : isProvider ? (
            <ProviderRegister />
          ) : isClinic ? (
            <ClinicRegister />
          ) : isSchool ? (
            <SchoolRegister />
          ) : isK ? (
            <KProviderRegister typeKey={selected as KType} />
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <RegisterForm initialType={selected as RegType} onSuccess={() => navigate('/panel')} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Inicio de sesión
  if (login) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <button onClick={() => setLogin(false)} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
          <ArrowLeft className="h-4 w-4" /> {t('create.back')}
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{t('auth.login')}</h1>
        <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <LoginForm onSuccess={() => navigate('/panel')} />
          <div className="mt-4"><SocialButtons /></div>
        </div>
      </div>
    );
  }

  // Selección de tipo
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-center text-3xl font-extrabold text-slate-900">{t('create.title')}</h1>
      <p className="mx-auto mt-2 max-w-xl text-center text-muted">{t('create.subtitle')}</p>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => setLogin(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <LogIn className="h-4 w-4" aria-hidden="true" /> {t('create.haveAccount')} {t('access.login')}
        </button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map(({ type, icon: Icon, color, soon }) => (
          <button
            key={type}
            type="button"
            disabled={soon}
            onClick={() => !soon && setSelected(type)}
            className={`group relative rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition ${soon ? 'cursor-not-allowed opacity-70' : 'hover:-translate-y-0.5 hover:shadow-md'}`}
          >
            {soon && (
              <span className="absolute right-3 top-3 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                {t('create.soon')}
              </span>
            )}
            <span className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white`}>
              <Icon className="h-6 w-6" />
            </span>
            <h2 className="mt-3 font-bold text-slate-900">{t(`create.cards.${type}.title`)}</h2>
            <p className="mt-1 text-sm text-muted">{t(`create.cards.${type}.desc`)}</p>
          </button>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-muted">
        {t('create.haveAccount')}{' '}
        <button onClick={() => setLogin(true)} className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
          <LogIn className="h-4 w-4" /> {t('access.login')}
        </button>
      </p>
    </div>
  );
}
