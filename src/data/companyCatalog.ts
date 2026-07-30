/**
 * companyCatalog — rubros (sectores) de las "Empresas inclusivas".
 * El `label` es el respaldo en español; la localización a los demás idiomas se
 * hace por i18n con la clave `cat.<value>` (helper useCatLabel). Toda entrada
 * nueva debe llevar su `cat.<value>` en los 11 locales (paridad 0).
 */
import type { CatItem } from '@/data/specialistCatalog';

export const COMPANY_SECTORS: CatItem[] = [
  { value: 'tecnologia', label: 'Tecnología y TI' },
  { value: 'manufactura', label: 'Manufactura e industria' },
  { value: 'comercio_retail', label: 'Comercio y retail' },
  { value: 'servicios', label: 'Servicios profesionales' },
  { value: 'salud', label: 'Salud' },
  { value: 'educacion', label: 'Educación' },
  { value: 'alimentos', label: 'Alimentos y bebidas' },
  { value: 'turismo_hosteleria', label: 'Turismo y hostelería' },
  { value: 'finanzas', label: 'Finanzas y seguros' },
  { value: 'logistica', label: 'Logística y transporte' },
  { value: 'construccion', label: 'Construcción' },
  { value: 'agro', label: 'Agroindustria' },
  { value: 'creativo', label: 'Industrias creativas' },
  { value: 'gobierno_ong', label: 'Gobierno y ONG' },
  { value: 'otro', label: 'Otro' },
];
