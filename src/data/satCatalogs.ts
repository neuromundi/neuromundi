/**
 * satCatalogs — catálogos oficiales del SAT (CFDI 4.0) para facturación en México:
 * Régimen Fiscal (c_RegimenFiscal) y Uso de CFDI (c_UsoCFDI). También la lista
 * canónica de grados académicos para escuelas (las etiquetas se traducen por i18n).
 */
export interface SatItem { code: string; label: string }

export const REGIMEN_FISCAL: SatItem[] = [
  { code: '601', label: 'General de Ley Personas Morales' },
  { code: '603', label: 'Personas Morales con Fines no Lucrativos' },
  { code: '605', label: 'Sueldos y Salarios e Ingresos Asimilados a Salarios' },
  { code: '606', label: 'Arrendamiento' },
  { code: '607', label: 'Régimen de Enajenación o Adquisición de Bienes' },
  { code: '608', label: 'Demás ingresos' },
  { code: '610', label: 'Residentes en el Extranjero sin Establecimiento Permanente' },
  { code: '611', label: 'Ingresos por Dividendos (socios y accionistas)' },
  { code: '612', label: 'Personas Físicas con Actividades Empresariales y Profesionales' },
  { code: '614', label: 'Ingresos por intereses' },
  { code: '615', label: 'Régimen de los ingresos por obtención de premios' },
  { code: '616', label: 'Sin obligaciones fiscales' },
  { code: '620', label: 'Sociedades Cooperativas de Producción que difieren ingresos' },
  { code: '621', label: 'Incorporación Fiscal' },
  { code: '622', label: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
  { code: '623', label: 'Opcional para Grupos de Sociedades' },
  { code: '624', label: 'Coordinados' },
  { code: '625', label: 'Actividades Empresariales con ingresos por Plataformas Tecnológicas' },
  { code: '626', label: 'Régimen Simplificado de Confianza (RESICO)' },
];

export const USO_CFDI: SatItem[] = [
  { code: 'G01', label: 'Adquisición de mercancías' },
  { code: 'G02', label: 'Devoluciones, descuentos o bonificaciones' },
  { code: 'G03', label: 'Gastos en general' },
  { code: 'I01', label: 'Construcciones' },
  { code: 'I02', label: 'Mobiliario y equipo de oficina por inversiones' },
  { code: 'I03', label: 'Equipo de transporte' },
  { code: 'I04', label: 'Equipo de cómputo y accesorios' },
  { code: 'I05', label: 'Dados, troqueles, moldes, matrices y herramental' },
  { code: 'I06', label: 'Comunicaciones telefónicas' },
  { code: 'I07', label: 'Comunicaciones satelitales' },
  { code: 'I08', label: 'Otra maquinaria y equipo' },
  { code: 'D01', label: 'Honorarios médicos, dentales y gastos hospitalarios' },
  { code: 'D02', label: 'Gastos médicos por incapacidad o discapacidad' },
  { code: 'D03', label: 'Gastos funerales' },
  { code: 'D04', label: 'Donativos' },
  { code: 'D05', label: 'Intereses por créditos hipotecarios (casa habitación)' },
  { code: 'D06', label: 'Aportaciones voluntarias al SAR' },
  { code: 'D07', label: 'Primas por seguros de gastos médicos' },
  { code: 'D08', label: 'Gastos de transportación escolar obligatoria' },
  { code: 'D09', label: 'Depósitos en cuentas para el ahorro / planes de pensiones' },
  { code: 'D10', label: 'Pagos por servicios educativos (colegiaturas)' },
  { code: 'S01', label: 'Sin efectos fiscales' },
  { code: 'CP01', label: 'Pagos' },
  { code: 'CN01', label: 'Nómina' },
];

/** Grados académicos (claves canónicas; etiqueta traducible por i18n grades.*). */
export const SCHOOL_GRADES: string[] = [
  'maternal',
  'preescolar',
  'prefirst',
  'primaria',
  'secundaria',
  'preparatoria',
  'bachillerato_tecnico',
  'universidad',
  'posgrado',
  'educacion_especial',
  'educacion_continua',
];
