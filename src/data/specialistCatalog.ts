/**
 * specialistCatalog — catálogos para el registro y la indexación de especialistas.
 * Los valores (`value`) son claves canónicas que se guardan e indexan; las
 * etiquetas están en español (pueden localizarse más adelante).
 */
export interface CatItem { value: string; label: string }

export const TITLE_PREFIXES: string[] = ['Dr.', 'Dra.', 'Lic.', 'Mtro.', 'Mtra.', 'Ing.', 'Psic.', 'T.O.', 'Fga.', 'Fgo.'];

export const PROFESSIONS: CatItem[] = [
  { value: 'psicologia_clinica', label: 'Psicología Clínica' },
  { value: 'psicologia_infantil', label: 'Psicología Infantil' },
  { value: 'terapia_ocupacional', label: 'Terapia Ocupacional' },
  { value: 'logopedia', label: 'Logopedia / Fonoaudiología' },
  { value: 'fisioterapia', label: 'Fisioterapia' },
  { value: 'neuropediatria', label: 'Neuropediatría' },
  { value: 'psicopedagogia', label: 'Psicopedagogía' },
  { value: 'psiquiatria', label: 'Psiquiatría' },
  { value: 'neuropsicologia', label: 'Neuropsicología' },
  { value: 'educacion_especial', label: 'Educación Especial' },
  { value: 'nutricion', label: 'Nutrición' },
  { value: 'musicoterapia', label: 'Musicoterapia' },
  { value: 'otro', label: 'Otro' },
];

export const SPECIALTIES: CatItem[] = [
  { value: 'tea', label: 'Trastorno del Espectro Autista (TEA)' },
  { value: 'tdah', label: 'TDAH' },
  { value: 'lenguaje', label: 'Trastornos del Lenguaje y Habla' },
  { value: 'aprendizaje', label: 'Dificultades de Aprendizaje' },
  { value: 'sensorial', label: 'Procesamiento Sensorial' },
  { value: 'discapacidad_intelectual', label: 'Discapacidad Intelectual' },
  { value: 'estimulacion_temprana', label: 'Estimulación Temprana' },
  { value: 'conducta', label: 'Manejo Conductual' },
  { value: 'habilidades_sociales', label: 'Habilidades Sociales' },
  { value: 'funciones_ejecutivas', label: 'Funciones Ejecutivas' },
  { value: 'sindrome_down', label: 'Síndrome de Down' },
  { value: 'paralisis_cerebral', label: 'Parálisis Cerebral' },
  { value: 'otro', label: 'Otro' },
];

export const MODALITIES: CatItem[] = [
  { value: 'consultorio', label: 'Consultorio privado' },
  { value: 'online', label: 'En línea' },
  { value: 'domicilio', label: 'A domicilio' },
  { value: 'escuelas', label: 'Atención en escuelas' },
];

export const AGE_RANGES: CatItem[] = [
  { value: '0_3', label: '0–3 años' },
  { value: '3_6', label: '3–6 años' },
  { value: '6_12', label: '6–12 años' },
  { value: 'adolescentes', label: 'Adolescentes' },
  { value: 'adultos', label: 'Adultos' },
];

export const INTERVENTION_AREAS: CatItem[] = [
  { value: 'integracion_sensorial', label: 'Integración Sensorial' },
  { value: 'estimulacion_temprana', label: 'Estimulación Temprana' },
  { value: 'modificacion_conducta', label: 'Modificación de Conducta' },
  { value: 'habilidades_sociales', label: 'Desarrollo de Habilidades Sociales' },
  { value: 'lenguaje_habla', label: 'Lenguaje y Habla' },
  { value: 'motricidad', label: 'Motricidad y Psicomotricidad' },
  { value: 'funciones_ejecutivas', label: 'Funciones Ejecutivas' },
  { value: 'autonomia', label: 'Autonomía y AVD' },
  { value: 'otro', label: 'Otro' },
];

export const CERTIFICATIONS: string[] = [
  'ADOS-2', 'DIR/Floortime', 'PECS', 'Método Denver (ESDM)', 'Integración Sensorial de Ayres', 'ABA', 'TEACCH', 'Hanen',
];
