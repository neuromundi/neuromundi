/**
 * FamilyClinicalPanel — pestaña "Expediente" de la familia. Gestiona consentimiento
 * a especialistas, muestra el expediente con el especialista elegido (para el chat
 * y los archivos) y el rastreador de hitos local-first.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HowTo } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { ConsentManager } from './ConsentManager';
import { ClinicalRecord } from './ClinicalRecord';
import { MilestoneTracker } from './MilestoneTracker';

export function FamilyClinicalPanel() {
  const { t } = useTranslation();
  const { userId } = useAuth();
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="space-y-6">
      <HowTo stepsKey="howto.familyClinical" />
      <ConsentManager onPick={(id, name) => setPicked({ id, name })} />

      {picked ? (
        <div>
          <p className="mb-2 text-sm text-muted">{t('clin.viewingWith')} <span className="font-semibold text-slate-800">{picked.name}</span></p>
          {userId && <ClinicalRecord patientId={userId} providerId={picked.id} />}
        </div>
      ) : (
        <p className="text-sm text-muted">{t('clin.pickSpecialist')}</p>
      )}

      <MilestoneTracker />
    </div>
  );
}
