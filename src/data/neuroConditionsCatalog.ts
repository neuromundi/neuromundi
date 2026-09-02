/**
 * neuroConditionsCatalog — catálogo de AFECCIONES NEUROLÓGICAS de la sección
 * "Afecciones neurológicas" del directorio. Los prestadores de esa sección
 * declaran qué afecciones atienden (se guardan en `profiles.neuro_conditions`).
 *
 * Base de autoridad: OMS — CIE-11 (ICD-11), Capítulo 08 "Enfermedades del sistema
 * nervioso", y el Plan de acción mundial intersectorial sobre la epilepsia y
 * otros trastornos neurológicos 2022-2031 (IGAP). Lista curada y legible para
 * familias y especialistas (no la taxonomía completa).
 *
 * El `value` es la clave canónica; la etiqueta se localiza por i18n con
 * `cat.<value>` (helper `useCatLabel()`), con respaldo en español en `label`.
 */
import type { CatItem } from '@/data/specialistCatalog';

export const NEURO_CONDITIONS: CatItem[] = [
  { value: 'epilepsia', label: 'Epilepsia y crisis convulsivas' },
  { value: 'paralisis_cerebral_afeccion', label: 'Parálisis cerebral' },
  { value: 'acv', label: 'Enfermedad cerebrovascular / ACV (ictus)' },
  { value: 'cefalea_migrana', label: 'Cefaleas y migraña' },
  { value: 'esclerosis_multiple', label: 'Esclerosis múltiple y enfermedades desmielinizantes' },
  { value: 'parkinson', label: 'Enfermedad de Parkinson y parkinsonismos' },
  { value: 'enf_neuromuscular', label: 'Enfermedades neuromusculares (ELA, distrofias, AME)' },
  { value: 'neuropatia_periferica', label: 'Neuropatías periféricas' },
  { value: 'distonia_movimiento', label: 'Distonías y trastornos del movimiento' },
  { value: 'demencia_neurocognitivo', label: 'Trastornos neurocognitivos / demencias' },
  { value: 'tce_lesion_medular', label: 'Traumatismo craneoencefálico y lesión medular' },
  { value: 'hidrocefalia_lcr', label: 'Hidrocefalia y trastornos del líquido cefalorraquídeo' },
  { value: 'tumor_snc', label: 'Tumores del sistema nervioso' },
  { value: 'enf_neurogenetica', label: 'Enfermedades neurogenéticas (X frágil, esclerosis tuberosa, neurofibromatosis)' },
  { value: 'espina_bifida', label: 'Malformaciones del desarrollo cortical / espina bífida' },
  { value: 'neuroinmune', label: 'Trastornos neuroinmunitarios (encefalitis autoinmune)' },
  { value: 'ataxia', label: 'Ataxias hereditarias' },
  { value: 'sueno_neurologico', label: 'Trastornos del sueño de origen neurológico (narcolepsia)' },
  { value: 'infeccion_snc', label: 'Secuelas de infecciones del SNC (meningitis / encefalitis)' },
  { value: 'otra_afeccion', label: 'Otra afección neurológica' },
];

export const NEURO_CONDITION_VALUES: string[] = NEURO_CONDITIONS.map((c) => c.value);
