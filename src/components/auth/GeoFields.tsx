/**
 * GeoFields — País → Estado/Provincia → Municipio/Alcaldía.
 *
 * Opción B: si el país es México, Estado y Municipio son listas en cascada con el
 * catálogo oficial (INEGI), cargado de forma diferida. Para el resto del mundo,
 * Estado es texto libre y Municipio texto libre (no existe un catálogo mundial
 * de municipios práctico de empaquetar).
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCountryLabel } from '@/lib/countryLabel';
import type { UseFormRegister, UseFormSetValue, FieldValues, Path, PathValue } from 'react-hook-form';
import { COUNTRIES, MEXICO_NAME } from '@/data/countries';

interface GeoFieldsProps<T extends FieldValues> {
  register: UseFormRegister<T>;
  setValue: UseFormSetValue<T>;
  country: string | undefined;
  state: string | undefined;
  inputCls: string;
  labelCls: string;
}

export function GeoFields<T extends FieldValues>({
  register,
  setValue,
  country,
  state,
  inputCls,
  labelCls,
}: GeoFieldsProps<T>) {
  const { t } = useTranslation();
  const countryLabel = useCountryLabel();
  const isMexico = country === MEXICO_NAME;

  const [mx, setMx] = useState<{ estados: string[]; municipios: Record<string, string[]> } | null>(null);

  // Carga diferida del catálogo de México solo cuando se elige México.
  useEffect(() => {
    let active = true;
    if (isMexico && !mx) {
      void import('@/data/mxStatesMunicipalities').then((m) => {
        if (active) setMx({ estados: m.MX_ESTADOS, municipios: m.MX_MUNICIPIOS });
      });
    }
    return () => { active = false; };
  }, [isMexico, mx]);

  const municipios = isMexico && state && mx ? mx.municipios[state] ?? [] : [];

  return (
    <>
      <div>
        <label htmlFor="reg-country" className={labelCls}>{t('reg.country')}</label>
        <select
          id="reg-country"
          className={inputCls}
          {...register('country' as Path<T>, {
            onChange: () => {
              // Al cambiar de país, limpiar estado y municipio.
              setValue('state' as Path<T>, '' as PathValue<T, Path<T>>);
              setValue('municipality' as Path<T>, '' as PathValue<T, Path<T>>);
            },
          })}
        >
          <option value="">{t('reg.selectCountry')}</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.name}>{countryLabel(c.code, c.name)}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="reg-state" className={labelCls}>{t('reg.state')}</label>
          {isMexico ? (
            <select
              id="reg-state"
              className={inputCls}
              {...register('state' as Path<T>, {
                onChange: () => setValue('municipality' as Path<T>, '' as PathValue<T, Path<T>>),
              })}
            >
              <option value="">{t('reg.selectState')}</option>
              {(mx?.estados ?? []).map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          ) : (
            <input id="reg-state" className={inputCls} {...register('state' as Path<T>)} />
          )}
        </div>

        <div>
          <label htmlFor="reg-muni" className={labelCls}>{t('reg.municipality')}</label>
          {isMexico ? (
            <select id="reg-muni" className={inputCls} disabled={!state} {...register('municipality' as Path<T>)}>
              <option value="">{state ? t('reg.selectMunicipality') : t('reg.selectStateFirst')}</option>
              {municipios.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          ) : (
            <input id="reg-muni" className={inputCls} {...register('municipality' as Path<T>)} />
          )}
        </div>
      </div>
    </>
  );
}
