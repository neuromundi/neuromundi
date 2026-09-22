/**
 * surveyContent — cuestionario de la Primera Encuesta Internacional
 * (neurodesarrollo, neurodivergencia y afecciones neurológicas).
 *
 * Contenido en ESPAÑOL (arranca en es; se localizará a los 11 idiomas después,
 * como el kit y los legales, que también viven fuera de i18n). La página
 * `/encuesta` lo renderiza: todos responden lo COMÚN, luego la rama de su ROL,
 * y al final el cierre + consentimiento. Las respuestas se guardan en
 * `survey_responses.answers` (jsonb), así que ampliar preguntas NO exige migrar.
 */
export type QType = 'radio' | 'checkbox' | 'select' | 'text';

export interface Question {
  key: string;
  q: string;
  type: QType;
  options?: string[];
  help?: string;
  optional?: boolean;
}

export const ROLES: { value: string; label: string }[] = [
  { value: 'familiar', label: 'Familiar (padre/madre/tutor/pariente)' },
  { value: 'persona', label: 'Persona / paciente' },
  { value: 'especialista', label: 'Especialista o profesional' },
  { value: 'proveedor', label: 'Proveedor de productos' },
  { value: 'organizacion', label: 'Organización / ONG' },
  { value: 'escuela', label: 'Escuela o clínica' },
  { value: 'empresa', label: 'Empresa' },
];

export const SECTION_OPTIONS: { value: string; label: string }[] = [
  { value: 'neurodesarrollo', label: 'Neurodesarrollo' },
  { value: 'neurodivergencias', label: 'Neurodivergencias' },
  { value: 'afecciones', label: 'Afecciones neurológicas' },
];

const EXPERIENCIA: Question[] = [
  { key: 'acceso_facil', q: '¿Qué tan fácil fue encontrar el apoyo o especialista que necesitabas?', type: 'radio', options: ['Muy fácil', 'Fácil', 'Difícil', 'Muy difícil'] },
  { key: 'tiempo_dx', q: '¿Cuánto tiempo pasó hasta el diagnóstico o la primera atención?', type: 'select', options: ['Menos de 3 meses', '3 a 6 meses', '6 a 12 meses', '1 a 2 años', 'Más de 2 años', 'Aún sin diagnóstico', 'No aplica'] },
  { key: 'barreras', q: '¿Cuáles fueron las principales barreras?', type: 'checkbox', options: ['Costo', 'Distancia / disponibilidad local', 'Falta de información confiable', 'Listas de espera', 'Estigma o falta de comprensión', 'Diagnóstico tardío'] },
  { key: 'trato_neuroafirmativo', q: 'En tu última experiencia, ¿el trato fue neuroafirmativo (adaptación sensorial, flexibilidad, trato humano)?', type: 'radio', options: ['Sí, claramente', 'En parte', 'No', 'No aplica'] },
  { key: 'inclusion_escolar', q: 'Inclusión escolar: ¿hubo acceso a una escuela realmente inclusiva?', type: 'radio', options: ['Sí, con apoyos', 'Parcial', 'No', 'No aplica'] },
  { key: 'inclusion_laboral', q: 'Inclusión laboral (personas adultas): ¿hay oportunidades reales?', type: 'radio', options: ['Sí', 'Parcial', 'No', 'No aplica'] },
  { key: 'carga_economica', q: 'El costo del acompañamiento, ¿qué tanta carga representa para tu hogar?', type: 'radio', options: ['No es una carga', 'Carga moderada', 'Carga alta', 'Carga muy alta', 'Prefiero no decir'] },
];

export const BRANCHES: Record<string, Question[]> = {
  familiar: EXPERIENCIA,
  persona: EXPERIENCIA,
  especialista: [
    { key: 'profesion', q: '¿Cuál es tu profesión o especialidad?', type: 'text' },
    { key: 'modalidad', q: '¿En qué modalidad atiendes?', type: 'checkbox', options: ['Presencial', 'En línea'] },
    { key: 'retos', q: 'Principales retos para atender a esta población:', type: 'checkbox', options: ['Baja demanda que pueda pagar', 'Falta de derivaciones', 'Falta de formación específica', 'Poca difusión de mi práctica', 'Trámites o marco legal', 'Aislamiento profesional'] },
    { key: 'demanda_no_cubierta', q: '¿Qué demanda observas que hoy NO está cubierta?', type: 'text', optional: true },
    { key: 'formacion', q: '¿Has recibido formación específica en estas áreas?', type: 'radio', options: ['Sí, formación específica', 'Parcial / autodidacta', 'No'] },
    { key: 'colaborar', q: '¿Te interesaría formarte de forma continua y colaborar en la comunidad?', type: 'radio', options: ['Sí', 'Tal vez', 'No'] },
    { key: 'herramientas', q: '¿Qué herramientas digitales usas en tu práctica?', type: 'checkbox', options: ['Agenda / citas en línea', 'Expediente electrónico', 'Teleconsulta', 'Redes sociales', 'Ninguna'] },
  ],
  proveedor: [
    { key: 'productos', q: '¿Qué tipo de productos ofreces?', type: 'text' },
    { key: 'barreras_llegar', q: 'Barreras para llegar a las familias:', type: 'checkbox', options: ['Costo de difusión', 'Competencia', 'Logística / envíos', 'Poca visibilidad ante familias', 'Desconocimiento del sector'] },
    { key: 'interes_marketplace', q: '¿Te interesaría vender en un marketplace especializado?', type: 'radio', options: ['Sí', 'Tal vez', 'No'] },
  ],
  organizacion: [
    { key: 'servicios', q: '¿Qué servicios o programas ofrece tu organización?', type: 'text' },
    { key: 'necesidades', q: 'Mayores necesidades de tu organización:', type: 'checkbox', options: ['Financiamiento', 'Difusión', 'Voluntariado', 'Alianzas', 'Formación'] },
    { key: 'colaborar_red', q: '¿Les interesaría colaborar en una red de organizaciones?', type: 'radio', options: ['Sí', 'Tal vez', 'No'] },
  ],
  escuela: [
    { key: 'programa_inclusion', q: '¿Cuentan con un programa de inclusión?', type: 'radio', options: ['Sí', 'Parcial', 'No'] },
    { key: 'retos_inclusion', q: 'Principales retos de inclusión:', type: 'checkbox', options: ['Formación docente', 'Cupo / recursos', 'Apoyo especializado', 'Sensibilización de la comunidad', 'Financiamiento'] },
    { key: 'apoyos_necesarios', q: '¿Qué apoyos necesitarían para incluir mejor?', type: 'text', optional: true },
  ],
  empresa: [
    { key: 'contrata_nd', q: '¿Contratan talento neurodivergente?', type: 'radio', options: ['Sí', 'No, pero nos interesa', 'No'] },
    { key: 'barreras_laboral', q: 'Barreras para la inclusión laboral:', type: 'checkbox', options: ['Desconocimiento', 'Falta de apoyos / ajustes', 'Procesos de RH', 'Sensibilización', 'Ninguna'] },
    { key: 'interes_vacantes', q: '¿Les interesaría publicar vacantes inclusivas?', type: 'radio', options: ['Sí', 'Tal vez', 'No'] },
    { key: 'apoyos_contratar', q: '¿Qué facilitaría contratar?', type: 'checkbox', options: ['Guías / capacitación', 'Acompañamiento', 'Incentivos', 'Candidatos preseleccionados'] },
  ],
};

export const CLOSING: Question[] = [
  { key: 'necesidad_libre', q: '¿Qué es lo que MÁS falta hoy en tu comunidad? (opcional)', type: 'text', optional: true },
];
