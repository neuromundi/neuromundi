/**
 * schoolCatalog — catálogos para el registro de escuelas / centros educativos.
 * `value` = clave canónica indexable; etiquetas en español.
 * Los grados se reutilizan de SCHOOL_GRADES (satCatalogs).
 */
import type { CatItem } from '@/data/specialistCatalog';

export const INSTITUTION_TYPES: CatItem[] = [
  { value: 'regular_inclusiva', label: 'Escuela regular con inclusión' },
  { value: 'educacion_especial', label: 'Educación especial' },
  { value: 'centro_apoyo', label: 'Centro de apoyo / reforzamiento' },
  { value: 'mixta', label: 'Modelo mixto' },
];

export const INCLUSION_MODELS: CatItem[] = [
  { value: 'aula_regular_apoyo', label: 'Aula regular con apoyo' },
  { value: 'aula_recursos', label: 'Aula de recursos' },
  { value: 'grupos_reducidos', label: 'Grupos reducidos' },
  { value: 'curriculo_adaptado', label: 'Currículo adaptado (DUA)' },
  { value: 'otro', label: 'Otro' },
];

export const SUPPORT_SERVICES: CatItem[] = [
  { value: 'terapias', label: 'Terapias dentro del plantel' },
  { value: 'sombra', label: 'Maestro/a sombra' },
  { value: 'adecuaciones', label: 'Adecuaciones curriculares' },
  { value: 'psicopedagogia', label: 'Departamento psicopedagógico' },
  { value: 'sensorial_school', label: 'Espacios de baja carga sensorial' },
  { value: 'lenguaje', label: 'Apoyo de lenguaje / CAA' },
  { value: 'otro', label: 'Otro' },
];
