/**
 * clinicCatalog — catálogos para el registro de clínicas / centros terapéuticos.
 * `value` = clave canónica indexable; etiquetas en español.
 */
import type { CatItem } from '@/data/specialistCatalog';

export const CLINIC_MODALITIES: CatItem[] = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'online', label: 'En línea' },
  { value: 'hibrido', label: 'Híbrido' },
  { value: 'domicilio', label: 'A domicilio' },
];

export const CLINIC_SPECIALTIES: CatItem[] = [
  { value: 'integracion_sensorial', label: 'Integración Sensorial' },
  { value: 'neuropediatria', label: 'Neuropediatría' },
  { value: 'psicologia_clinica', label: 'Psicología Clínica' },
  { value: 'logopedia', label: 'Logopedia / Fonoaudiología' },
  { value: 'fisioterapia', label: 'Fisioterapia' },
  { value: 'terapia_ocupacional', label: 'Terapia Ocupacional' },
  { value: 'psicopedagogia', label: 'Psicopedagogía' },
  { value: 'psiquiatria', label: 'Psiquiatría' },
  // ── Ampliación (taxonomía Neuromundi) ──────────────────────────────────────
  { value: 'neuropsicologia', label: 'Neuropsicología' },
  { value: 'neuropediatria_genetica', label: 'Neuropediatría y Genética' },
  { value: 'psicomotricidad', label: 'Psicomotricidad' },
  { value: 'optometria_comportamental', label: 'Optometría Comportamental / Terapia Visual' },
  { value: 'neurofeedback', label: 'Neurofeedback / Biofeedback' },
  { value: 'terapia_neurosensorial', label: 'Terapia Neurosensorial (Tomatis / Bérard / SSP)' },
  { value: 'nutricion', label: 'Nutrición Especializada' },
  { value: 'terapia_familiar', label: 'Terapia Familiar y Sistémica' },
  { value: 'otro', label: 'Otro' },
];

export const CLINIC_SERVICES: CatItem[] = [
  { value: 'evaluacion', label: 'Evaluación y diagnóstico' },
  { value: 'terapia', label: 'Terapia regular' },
  { value: 'grupos_sociales', label: 'Grupos de habilidades sociales' },
  { value: 'asesoria_padres', label: 'Asesoramiento a padres' },
  // ── Ampliación (taxonomía Neuromundi) ──────────────────────────────────────
  { value: 'lactancia_alimentacion', label: 'Lactancia y alimentación temprana' },
  { value: 'sueno', label: 'Consultoría de sueño infantil' },
  { value: 'saac', label: 'Comunicación aumentativa (SAAC)' },
  { value: 'acompanamiento_escolar', label: 'Acompañamiento e inclusión escolar' },
  { value: 'vida_independiente', label: 'Programa de vida independiente / transición' },
  { value: 'teleterapia', label: 'Teleterapia' },
  { value: 'otro', label: 'Otro' },
];

/**
 * Categorías de registro. Un mismo establecimiento puede marcar varias
 * (p. ej. una clínica que además es gabinete de imagen). Determina qué
 * secciones dinámicas se muestran en el formulario.
 */
export const CLINIC_CATEGORIES: CatItem[] = [
  { value: 'clinic', label: 'Clínica / Centro terapéutico' },
  { value: 'gabinete', label: 'Gabinete de Imagen' },
  { value: 'laboratorio', label: 'Laboratorio de Análisis' },
];

/** Imagenología y Neurofisiología (categoría "gabinete"). */
export const IMAGING_SERVICES: CatItem[] = [
  { value: 'eeg', label: 'Electroencefalograma (EEG)' },
  { value: 'qeeg', label: 'Mapeo Cerebral (QEEG)' },
  { value: 'rmn', label: 'Resonancia Magnética (RMN)' },
  { value: 'tac', label: 'Tomografía Computarizada (TAC)' },
  { value: 'radiografia', label: 'Radiografía convencional' },
];

/** Laboratorio Clínico (categoría "laboratorio"). */
export const LAB_SERVICES: CatItem[] = [
  { value: 'sangre', label: 'Análisis de sangre / Bioquímica general' },
];

/** Tipo de equipo para Tomografía (TAC). */
export const TAC_EQUIPMENT: CatItem[] = [
  { value: 'multicorte', label: 'Tomógrafo multicorte' },
  { value: 'helicoidal', label: 'Tomógrafo helicoidal' },
  { value: 'otro', label: 'Otro' },
];

/** Tipo de toma de muestra para análisis de sangre. */
export const SAMPLE_COLLECTION: CatItem[] = [
  { value: 'gabinete', label: 'Solo en gabinete / laboratorio' },
  { value: 'domicilio', label: 'Toma a domicilio' },
  { value: 'ambas', label: 'En gabinete y a domicilio' },
];

/** Dónde se procesan las muestras de laboratorio. */
export const LAB_PROCESSING: CatItem[] = [
  { value: 'propio', label: 'Laboratorio propio' },
  { value: 'externo', label: 'Procesamiento externo (subrogado)' },
];

/**
 * Indicaciones automatizadas por defecto que se enviarán al paciente según el
 * servicio elegido. El gabinete puede editarlas en "Requisitos previos".
 */
export const DIAG_DEFAULT_INDICATIONS: Record<string, string> = {
  sangre: 'Ayuno de 8 a 12 horas.',
  tac: 'Retirar objetos metálicos y especificar alergias al medio de contraste.',
};
