/**
 * SchoolInclusionPanel — editor del "programa de inclusión" para escuelas y
 * clínicas. Guarda en `provider_details` (jsonb; sin migración): descripción del
 * programa, estado de admisiones/cupos y una nota de capacidad. Se muestra en el
 * perfil público (ver SchoolInclusionInfo).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Save } from 'lucide-react';
import { Button, SkeletonCard, useToast } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';

export type Admissions = 'open' | 'waitlist' | 'closed';
export const ADMISSIONS: Admissions[] = ['open', 'waitlist', 'closed'];

interface InclusionDetails {
  inclusion_program?: string;
  admissions?: Admissions;
  capacity_note?: string;
}

export function SchoolInclusionPanel() {
  const { t } = useTranslation();
  const toast = useToast();
  const { profile, updateProfile, saving } = useProfile();

  const details = (profile?.provider_details ?? {}) as InclusionDetails & Record<string, unknown>;
  const [program, setProgram] = useState(details.inclusion_program ?? '');
  const [admissions, setAdmissions] = useState<Admissions>(details.admissions ?? 'open');
  const [capacity, setCapacity] = useState(details.capacity_note ?? '');

  if (!profile) return <SkeletonCard rows={2} />;

  const save = async () => {
    const next = {
      ...(profile.provider_details as Record<string, unknown> | null ?? {}),
      inclusion_program: program.trim() || null,
      admissions,
      capacity_note: capacity.trim() || null,
    };
    const r = await updateProfile({ provider_details: next });
    toast[r.ok ? 'success' : 'error'](r.ok ? t('incl.saved') : t('incl.error'));
  };

  const inputCls = 'w-full rounded-lg border border-slate-200 p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

  return (
    <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div>
        <h3 className="flex items-center gap-2 font-semibold text-slate-900">
          <GraduationCap className="h-4 w-4 text-brand-600" aria-hidden="true" /> {t('incl.title')}
        </h3>
        <p className="mt-1 text-sm text-muted">{t('incl.help')}</p>
      </div>

      <div>
        <label htmlFor="incl-program" className="mb-1 block text-sm font-semibold text-slate-700">{t('incl.program')}</label>
        <textarea id="incl-program" rows={4} value={program} onChange={(e) => setProgram(e.target.value)} placeholder={t('incl.programPlaceholder')} className={inputCls} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="incl-adm" className="mb-1 block text-sm font-semibold text-slate-700">{t('incl.admissions')}</label>
          <select id="incl-adm" value={admissions} onChange={(e) => setAdmissions(e.target.value as Admissions)} className={inputCls}>
            {ADMISSIONS.map((a) => <option key={a} value={a}>{t(`incl.adm.${a}`)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="incl-cap" className="mb-1 block text-sm font-semibold text-slate-700">{t('incl.capacity')}</label>
          <input id="incl-cap" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder={t('incl.capacityPlaceholder')} className={inputCls} />
        </div>
      </div>

      <Button size="sm" loading={saving} onClick={() => void save()} leadingIcon={<Save className="h-4 w-4" />}>{t('incl.save')}</Button>
    </section>
  );
}
