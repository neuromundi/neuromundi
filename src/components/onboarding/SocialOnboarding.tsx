/**
 * SocialOnboarding — paso OBLIGATORIO para quien entra por login social. Como el
 * proveedor social no indica el tipo de usuario, aquí se ELIGE el tipo y se abre
 * el MISMO formulario de registro que ya existe para ese tipo (con su panel de
 * beneficios), en modo "completar": no pide correo ni contraseña (la cuenta ya
 * existe) y ACTUALIZA el perfil.
 *
 *   • Paciente / Familia  → `RegisterForm` (incluye su panel de beneficios).
 *   • Especialista        → `SpecialistRegister` (cédula, especialidades, áreas…).
 *   • Comercio            → `ProviderRegister`.
 *   • Escuela             → `SchoolRegister`.
 *
 * El formulario, al guardar, deja `rules_version_accepted`, con lo que la barrera
 * de onboarding se levanta y la app se muestra.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { RoleFeaturesPanel } from '@/components/auth/RoleFeaturesPanel';
import { SpecialistRegister } from '@/pages/SpecialistRegister';
import { ProviderRegister } from '@/pages/ProviderRegister';
import { SchoolRegister } from '@/pages/SchoolRegister';
import { ClinicRegister } from '@/pages/ClinicRegister';
import { KProviderRegister } from '@/pages/KProviderRegister';
import { CompanyRegister } from '@/pages/CompanyRegister';
import { EsparcimientoRegister } from '@/pages/EsparcimientoRegister';
import type { KType } from '@/data/kCatalog';
import type { RegType } from '@/lib/schemas';

type Role = 'patient' | 'parent' | 'provider';
type PType = 'service_provider' | 'merchant' | 'school' | 'clinic' | KType | 'company';

const K_SET = new Set<string>(['wellness', 'tourism', 'legal', 'ngo', 'caregiver']);

const TYPES: { role: Role; ptype?: PType; key: string }[] = [
  { role: 'parent', key: 'reg.typeParent' },
  { role: 'patient', key: 'reg.typePatient' },
  { role: 'provider', ptype: 'service_provider', key: 'reg.typeService' },
  { role: 'provider', ptype: 'clinic', key: 'create.cards.clinic.title' },
  { role: 'provider', ptype: 'merchant', key: 'reg.typeMerchant' },
  { role: 'provider', ptype: 'school', key: 'reg.typeSchool' },
  { role: 'provider', ptype: 'wellness', key: 'create.cards.wellness.title' },
  { role: 'provider', ptype: 'tourism', key: 'create.cards.tourism.title' },
  { role: 'provider', ptype: 'legal', key: 'create.cards.legal.title' },
  { role: 'provider', ptype: 'ngo', key: 'create.cards.ngo.title' },
  { role: 'provider', ptype: 'caregiver', key: 'create.cards.caregiver.title' },
  { role: 'provider', ptype: 'company', key: 'create.cards.company.title' },
];

export function SocialOnboarding() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  // Borrado duro para quien cancela el registro social sin terminarlo: así no
  // quedan cuentas incompletas en Supabase que el admin tenga que limpiar.
  const { deleteAccount } = useProfile();

  // Sin tipo preseleccionado: OBLIGA a elegir. Antes arrancaba en 0 ('parent'),
  // y quien enviaba sin tocar la selección se creaba como consumidor aunque
  // hubiera entrado como especialista/comercio/escuela.
  const [sel, setSel] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const choice = sel === null ? null : TYPES[sel];
  const isProvider = choice?.role === 'provider';

  // "Confirmar cancelar": elimina la cuenta (no solo cierra sesión) y recarga en
  // la portada. Si el borrado fallara, al menos se cierra sesión para no dejar
  // al usuario atrapado en la barrera de onboarding.
  const confirmCancel = async () => {
    setDeleting(true);
    const res = await deleteAccount();
    if (!res.ok) {
      setDeleting(false);
      setConfirming(false);
      await signOut();
      return;
    }
    window.location.assign('/');
  };

  const cancel = (
    <button type="button" onClick={() => setConfirming(true)} className="text-xs text-muted hover:underline">
      {t('onb.cancel')}
    </button>
  );

  return createPortal(
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-gradient-to-br from-brand-600 via-brand-500 to-indigo-600 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ${isProvider ? 'max-w-4xl' : 'max-w-3xl'}`}
      >
        <h2 className="text-xl font-bold text-slate-900">{t('onb.title')}</h2>
        <p className="mt-1 text-sm text-muted">{t('onb.intro')}</p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block font-semibold text-slate-900">{t('onb.type')}</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TYPES.map((tp, i) => (
                <button
                  key={tp.key}
                  type="button"
                  onClick={() => setSel(i)}
                  aria-pressed={sel === i}
                  className={`rounded-xl border px-3 py-2 text-left text-sm ${sel === i ? 'border-brand-500 bg-brand-50 font-semibold text-brand-800' : 'border-slate-200 text-slate-700'}`}
                >
                  {t(tp.key)}
                </button>
              ))}
            </div>
            {sel === null && (
              <p className="mt-2 text-sm font-medium text-evs-1">{t('onb.pickRequired')}</p>
            )}
          </div>

          {choice && (
            <div className="border-t border-slate-100 pt-4">
              {/* Consumidores: RegisterForm ya trae su panel de beneficios dentro.
                  Prestadores: mostramos el panel y luego su formulario dedicado. */}
              {!isProvider ? (
                <RegisterForm complete initialType={choice.role as RegType} />
              ) : (
                <>
                  <div className="mb-4"><RoleFeaturesPanel type={choice.ptype ?? ''} /></div>
                  {choice.ptype === 'service_provider' && <SpecialistRegister complete />}
                  {choice.ptype === 'clinic' && <ClinicRegister complete />}
                  {choice.ptype === 'merchant' && <ProviderRegister complete />}
                  {choice.ptype === 'school' && <SchoolRegister complete />}
                  {choice.ptype === 'company' && <CompanyRegister complete />}
                  {choice.ptype === 'tourism' && <EsparcimientoRegister complete />}
                  {choice.ptype && choice.ptype !== 'tourism' && K_SET.has(choice.ptype) && (
                    <KProviderRegister typeKey={choice.ptype as KType} complete />
                  )}
                </>
              )}
              <div className="mt-3">{cancel}</div>
            </div>
          )}

          {!choice && <div>{cancel}</div>}
        </div>
      </div>

      {/* Confirmación de cancelación: borra la cuenta para no dejar registros
          incompletos. */}
      {confirming && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4">
          <div role="alertdialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">{t('onb.cancelConfirmTitle')}</h3>
            <p className="mt-2 text-sm text-slate-700">{t('onb.cancelConfirmBody')}</p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void confirmCancel()}
                disabled={deleting}
                className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-60"
              >
                {deleting ? '…' : t('onb.cancelConfirmBtn')}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="text-sm font-semibold text-muted hover:underline disabled:opacity-60"
              >
                {t('onb.cancelBack')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
