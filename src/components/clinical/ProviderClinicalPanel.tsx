/**
 * ProviderClinicalPanel — pestaña "Expedientes" del especialista. Lista las
 * familias que le otorgaron consentimiento; al elegir una, abre su expediente.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, User } from 'lucide-react';
import { SkeletonCard, HowTo} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useConsents } from '@/hooks/useClinical';
import { ClinicalRecord } from './ClinicalRecord';

export function ProviderClinicalPanel() {
  const { t } = useTranslation();
  const { userId } = useAuth();
  const { accessTo, loading } = useConsents();
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);

  if (loading) return <SkeletonCard rows={3} />;

  if (picked && userId) {
    return (
      <div className="space-y-3">
        <button type="button" onClick={() => setPicked(null)} className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
          <ChevronLeft className="h-4 w-4" /> {t('common.back')}
        </button>
        <p className="text-sm text-muted">{t('clin.recordOf')} <span className="font-semibold text-slate-800">{picked.name}</span></p>
        <ClinicalRecord patientId={picked.id} providerId={userId} />
      </div>
    );
  }

  return (
    <div>
      <HowTo stepsKey="howto.providerClinical" />
      <h3 className="mb-3 font-semibold text-slate-900">{t('clin.patients')}</h3>
      {accessTo.length === 0 ? (
        <p className="text-sm text-muted">{t('clin.noPatients')}</p>
      ) : (
        <ul className="space-y-2">
          {accessTo.map((c) => (
            <li key={c.patient.id}>
              <button type="button" onClick={() => setPicked({ id: c.patient.id, name: c.patient.name })}
                className="flex w-full items-center gap-2 rounded-xl border border-slate-100 bg-white p-3 text-left text-sm shadow-sm hover:border-brand-200">
                <User className="h-4 w-4 text-brand-600" />
                <span className="font-medium text-slate-800">{c.patient.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
