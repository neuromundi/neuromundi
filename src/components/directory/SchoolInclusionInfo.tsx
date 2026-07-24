/**
 * SchoolInclusionInfo — muestra en el perfil público el "programa de inclusión"
 * de una escuela o clínica: descripción, estado de admisiones/cupos y grados.
 * Lee de provider_details (jsonb) y de school_grades. No renderiza nada si la
 * escuela aún no llenó estos campos.
 */
import { useTranslation } from 'react-i18next';
import { GraduationCap, CircleCheck, Clock, CircleX } from 'lucide-react';
import { cn } from '@/lib/utils';

type Admissions = 'open' | 'waitlist' | 'closed';

const ADM_STYLE: Record<Admissions, string> = {
  open: 'bg-sage-50 text-sage-700',
  waitlist: 'bg-warm-50 text-warm-800',
  closed: 'bg-slate-100 text-muted',
};

export function SchoolInclusionInfo({
  details,
  grades,
}: {
  details: Record<string, unknown> | null;
  grades: string[] | null;
}) {
  const { t } = useTranslation();
  const d = (details ?? {}) as { inclusion_program?: string; admissions?: Admissions; capacity_note?: string };
  const program = d.inclusion_program?.trim();
  const admissions = d.admissions;
  const capacity = d.capacity_note?.trim();
  const hasGrades = Array.isArray(grades) && grades.length > 0;

  if (!program && !admissions && !capacity && !hasGrades) return null;

  const AdmIcon = admissions === 'open' ? CircleCheck : admissions === 'waitlist' ? Clock : CircleX;

  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
        <GraduationCap className="h-4 w-4 text-brand-600" aria-hidden="true" /> {t('incl.title')}
      </h2>

      {admissions && (
        <div className={cn('mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold', ADM_STYLE[admissions])}>
          <AdmIcon className="h-4 w-4" aria-hidden="true" />
          {t(`incl.adm.${admissions}`)}
          {capacity && <span className="font-normal">· {capacity}</span>}
        </div>
      )}

      {program && <p className="whitespace-pre-wrap text-slate-700">{program}</p>}

      {hasGrades && (
        <div className="mt-2 flex flex-wrap gap-2">
          {grades!.map((g) => (
            <span key={g} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{g}</span>
          ))}
        </div>
      )}
    </section>
  );
}
