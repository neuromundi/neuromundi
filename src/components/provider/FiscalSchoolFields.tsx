/**
 * FiscalSchoolFields — datos de facturación y, para escuelas, grados académicos.
 *
 * Si el país del perfil es México, muestra los campos CFDI 4.0 (RFC ya vive en su
 * propio campo; aquí van razón social, régimen, uso CFDI, CP, dirección y correo
 * de facturación). Para otros países, una variante internacional genérica.
 */
import { useTranslation } from 'react-i18next';
import type { UseFormRegister } from 'react-hook-form';
import type { ProfileFormValues } from '@/lib/schemas';
import { REGIMEN_FISCAL, USO_CFDI, SCHOOL_GRADES } from '@/data/satCatalogs';
import { MEXICO_NAME } from '@/data/countries';

const inputCls =
  'w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const labelCls = 'mb-1 block font-semibold text-slate-900';

interface Props {
  register: UseFormRegister<ProfileFormValues>;
  country: string | undefined;
  providerType: string | null | undefined;
}

export function FiscalSchoolFields({ register, country, providerType }: Props) {
  const { t } = useTranslation();
  const isMexico = country === MEXICO_NAME;

  return (
    <div className="space-y-6">
      {/* ── Datos fiscales ─────────────────────────────────────────── */}
      <fieldset className="space-y-3 rounded-2xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">{t('fiscal.title')}</legend>
        <p className="text-xs text-muted">{t('fiscal.help')}</p>

        <div>
          <label htmlFor="f-razon" className={labelCls}>{t('fiscal.razonSocial')}</label>
          <input id="f-razon" className={inputCls} {...register('fiscal_razon_social')} />
        </div>

        {isMexico ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="f-regimen" className={labelCls}>{t('fiscal.regimen')}</label>
                <select id="f-regimen" className={inputCls} {...register('fiscal_regimen')}>
                  <option value="">—</option>
                  {REGIMEN_FISCAL.map((r) => (
                    <option key={r.code} value={r.code}>{r.code} · {r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="f-uso" className={labelCls}>{t('fiscal.usoCfdi')}</label>
                <select id="f-uso" className={inputCls} {...register('fiscal_uso_cfdi')}>
                  <option value="">—</option>
                  {USO_CFDI.map((u) => (
                    <option key={u.code} value={u.code}>{u.code} · {u.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="f-cp" className={labelCls}>{t('fiscal.cp')}</label>
                <input id="f-cp" inputMode="numeric" className={inputCls} {...register('fiscal_cp')} />
              </div>
              <div>
                <label htmlFor="f-email" className={labelCls}>{t('fiscal.email')}</label>
                <input id="f-email" type="email" className={inputCls} {...register('fiscal_email')} />
              </div>
            </div>
            <div>
              <label htmlFor="f-dir" className={labelCls}>{t('fiscal.direccion')}</label>
              <input id="f-dir" className={inputCls} {...register('fiscal_direccion')} />
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="f-taxid" className={labelCls}>{t('fiscal.taxId')}</label>
                <input id="f-taxid" className={inputCls} {...register('fiscal_tax_id')} />
              </div>
              <div>
                <label htmlFor="f-fcountry" className={labelCls}>{t('fiscal.country')}</label>
                <input id="f-fcountry" className={inputCls} {...register('fiscal_country')} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="f-email-i" className={labelCls}>{t('fiscal.email')}</label>
                <input id="f-email-i" type="email" className={inputCls} {...register('fiscal_email')} />
              </div>
              <div>
                <label htmlFor="f-dir-i" className={labelCls}>{t('fiscal.direccion')}</label>
                <input id="f-dir-i" className={inputCls} {...register('fiscal_direccion')} />
              </div>
            </div>
          </>
        )}
      </fieldset>

      {/* ── Grados académicos (solo escuelas) ──────────────────────── */}
      {providerType === 'school' && (
        <fieldset className="space-y-2 rounded-2xl border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">{t('grades.title')}</legend>
          <p className="text-xs text-muted">{t('grades.help')}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SCHOOL_GRADES.map((g) => (
              <label key={g} className="flex items-center gap-2 rounded-lg border border-slate-100 p-2 text-sm">
                <input type="checkbox" value={g} className="h-4 w-4 rounded border-slate-300 text-brand-500" {...register('school_grades')} />
                <span className="text-slate-700">{t(`grades.${g}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
