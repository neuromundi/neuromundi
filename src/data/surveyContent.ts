/**
 * surveyContent — Primera Encuesta Internacional (neurodesarrollo, neurodivergencia,
 * afecciones neurológicas). Español (se localizará después, como kit/legales).
 *
 * Estructura del cuestionario (la renderiza src/pages/Encuesta.tsx):
 *   1) COMÚN: rol, secciones (una o varias), país, consentimiento.
 *   2) RAMA POR ROL (BRANCHES): preguntas propias del vínculo del respondente
 *      con el ecosistema (familia/persona, especialista, proveedor, ONG, escuela,
 *      empresa).
 *   3) BLOQUE POR SECCIÓN (SECTION_QUESTIONS): por CADA sección elegida se
 *      muestran preguntas ESPECIALIZADas y distintas, con variante para
 *      "consumer" (familia/persona) o "provider" (resto).
 *
 * Todas las respuestas se guardan en `survey_responses.answers` (jsonb): las
 * claves deben ser únicas (por eso las de sección van prefijadas nd_/ndx_/af_).
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
  { value: 'especialista', label: 'Especialista o profesional de la salud/educación' },
  { value: 'proveedor', label: 'Proveedor de productos' },
  { value: 'servicios', label: 'Prestador de servicios' },
  { value: 'organizacion', label: 'Organización / ONG' },
  { value: 'escuela', label: 'Escuela o clínica' },
  { value: 'empresa', label: 'Empresa' },
];

export const SECTION_OPTIONS: { value: string; label: string }[] = [
  { value: 'neurodesarrollo', label: 'Neurodesarrollo' },
  { value: 'neurodivergencias', label: 'Neurodivergencias' },
  { value: 'afecciones', label: 'Afecciones neurológicas' },
];

/** Roles que responden como "usuarios" (experiencia vivida) vs. "oferta". */
export const CONSUMER_ROLES = ['familiar', 'persona'];
export function audienceOf(role: string): 'consumer' | 'provider' {
  return CONSUMER_ROLES.includes(role) ? 'consumer' : 'provider';
}

// ---- Rama por ROL (transversal a secciones) --------------------------------
const EXPERIENCIA: Question[] = [
  { key: 'acceso_facil', q: '¿Qué tan fácil fue encontrar el apoyo o especialista que necesitabas?', type: 'radio', options: ['Muy fácil', 'Fácil', 'Difícil', 'Muy difícil'] },
  { key: 'trato_neuroafirmativo', q: '¿El trato que recibieron fue neuroafirmativo (adaptación sensorial, flexibilidad, trato humano)?', type: 'radio', options: ['Sí, claramente', 'En parte', 'No', 'No aplica'] },
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
    { key: 'formacion', q: '¿Has recibido formación específica en las áreas que atiendes?', type: 'radio', options: ['Sí, formación específica', 'Parcial / autodidacta', 'No'] },
    { key: 'colaborar', q: '¿Te interesaría formarte de forma continua y colaborar en la comunidad?', type: 'radio', options: ['Sí', 'Tal vez', 'No'] },
    { key: 'herramientas', q: '¿Qué herramientas digitales usas en tu práctica?', type: 'checkbox', options: ['Agenda / citas en línea', 'Expediente electrónico', 'Teleconsulta', 'Redes sociales', 'Ninguna'] },
  ],
  proveedor: [
    { key: 'productos', q: '¿Qué tipo de productos ofreces?', type: 'text' },
    { key: 'barreras_llegar', q: 'Barreras para llegar a las familias:', type: 'checkbox', options: ['Costo de difusión', 'Competencia', 'Logística / envíos', 'Poca visibilidad ante familias', 'Desconocimiento del sector'] },
    { key: 'interes_marketplace', q: '¿Te interesaría vender en un marketplace especializado?', type: 'radio', options: ['Sí', 'Tal vez', 'No'] },
  ],
  servicios: [
    { key: 'servicio_tipo', q: '¿Qué servicio prestas?', type: 'text' },
    { key: 'modalidad_serv', q: 'Modalidad:', type: 'checkbox', options: ['Presencial', 'A domicilio', 'En línea'] },
    { key: 'retos_serv', q: 'Principales retos para prestar tu servicio a esta población:', type: 'checkbox', options: ['Baja demanda que pueda pagar', 'Falta de derivaciones', 'Falta de formación específica', 'Poca difusión', 'Trámites o marco legal'] },
    { key: 'interes_directorio', q: '¿Te interesaría figurar en un directorio especializado?', type: 'radio', options: ['Sí', 'Tal vez', 'No'] },
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
  ],
};

// ---- Bloques ESPECIALIZADOS por SECCIÓN ------------------------------------
// Redactados con enfoque de especialista de cada área. Cada sección tiene una
// variante para consumidor (familia/persona) y otra para el lado de la oferta.
export const SECTION_QUESTIONS: Record<string, { consumer: Question[]; provider: Question[] }> = {
  // ===================== NEURODESARROLLO =====================
  neurodesarrollo: {
    consumer: [
      { key: 'nd_edad_senal', q: '¿A qué edad se detectaron las primeras señales en el desarrollo?', type: 'select', options: ['Antes del 1.er año', '1 a 2 años', '3 a 4 años', '5 a 6 años', 'Edad escolar', 'Adolescencia o después', 'No aplica'] },
      { key: 'nd_vigilancia', q: '¿Recibieron vigilancia del desarrollo o tamiz en los controles de niño sano?', type: 'radio', options: ['Sí, de forma sistemática', 'A veces', 'No', 'No lo sé'] },
      { key: 'nd_intervencion_temprana', q: '¿Accedieron a intervención temprana antes de los 3 años?', type: 'radio', options: ['Sí', 'Parcial', 'No', 'No aplica'] },
      { key: 'nd_terapias', q: '¿Qué terapias de neurodesarrollo han utilizado?', type: 'checkbox', options: ['Terapia ocupacional / integración sensorial', 'Fonoaudiología / lenguaje', 'Psicopedagogía / aprendizaje', 'Fisioterapia / neuromotora', 'Análisis conductual (ABA)', 'DIR / Floortime', 'Ninguna'] },
      { key: 'nd_barrera', q: '¿Cuál fue la mayor dificultad en el neurodesarrollo?', type: 'checkbox', options: ['Diagnóstico tardío', 'Faltan especialistas en intervención temprana', 'Costo de terapias continuas', 'Coordinar terapias con la escuela', 'Información confiable'] },
    ],
    provider: [
      { key: 'nd_acceso_it', q: '¿Qué tan accesible es la intervención temprana (0–3 años) en tu zona?', type: 'radio', options: ['Buena', 'Limitada', 'Escasa', 'Casi nula'] },
      { key: 'nd_brecha_prof', q: 'Mayor brecha que observas en neurodesarrollo:', type: 'checkbox', options: ['Detección tardía', 'Pocos terapeutas formados', 'Listas de espera', 'Falta de trabajo interdisciplinario', 'Continuidad escuela–terapia'] },
    ],
  },
  // ===================== NEURODIVERGENCIAS (enfoque neuroafirmativo) =====================
  neurodivergencias: {
    consumer: [
      { key: 'ndx_identificacion', q: '¿Cómo se identificó la neurodivergencia?', type: 'radio', options: ['Diagnóstico clínico formal', 'En proceso de diagnóstico', 'Autoidentificación sin diagnóstico formal', 'No aplica'] },
      { key: 'ndx_edad_dx', q: 'Si hubo diagnóstico, ¿en qué etapa llegó?', type: 'select', options: ['Infancia temprana', 'Niñez', 'Adolescencia', 'Adultez', 'Aún sin diagnóstico', 'No aplica'] },
      { key: 'ndx_adaptaciones', q: '¿Qué adaptaciones necesitas más en el día a día?', type: 'checkbox', options: ['Sensoriales (ruido, luz, texturas)', 'Comunicación (tiempos, claridad, CAA)', 'Flexibilidad de rutinas/horarios', 'Apoyo a funciones ejecutivas', 'Espacios de calma / regulación'] },
      { key: 'ndx_afirmativo', q: '¿Tus entornos (escuela, trabajo, salud) son neuroafirmativos y no solo "tolerantes"?', type: 'radio', options: ['Sí', 'En parte', 'No', 'No aplica'] },
      { key: 'ndx_salud_mental', q: '¿Has enfrentado dificultades de salud mental asociadas (ansiedad, agotamiento/burnout)?', type: 'radio', options: ['Sí, con apoyo', 'Sí, sin apoyo', 'No'] },
      { key: 'ndx_barrera', q: 'Principal barrera que enfrentas:', type: 'checkbox', options: ['Estigma o prejuicio', 'Faltan profesionales neuroafirmativos', 'Costo', 'Falta de adaptaciones en escuela/trabajo', 'Diagnóstico tardío (adultos/mujeres)'] },
    ],
    provider: [
      { key: 'ndx_enfoque', q: '¿Tu práctica u organización sigue un enfoque neuroafirmativo (no centrado en "normalizar")?', type: 'radio', options: ['Sí, explícitamente', 'Parcial', 'No'] },
      { key: 'ndx_no_cubierto', q: 'Mayor necesidad no cubierta en neurodivergencia:', type: 'checkbox', options: ['Diagnóstico en adultos y mujeres', 'Adaptaciones escolares/laborales', 'Salud mental asociada', 'Formación de profesionales', 'Autonomía y vida independiente'] },
    ],
  },
  // ===================== AFECCIONES NEUROLÓGICAS =====================
  afecciones: {
    consumer: [
      { key: 'af_tipo', q: '¿Cuál es la afección neurológica principal?', type: 'select', options: ['Epilepsia', 'Parkinson u otro trastorno del movimiento', 'Esclerosis múltiple', 'ELA / enfermedad neuromuscular', 'Secuelas de ACV / ictus', 'Lesión cerebral o medular', 'Cefaleas / migraña', 'Demencia / deterioro cognitivo', 'Otra'] },
      { key: 'af_acceso_neuro', q: '¿Qué tan fácil es acceder a neurología y a un seguimiento continuo?', type: 'radio', options: ['Fácil', 'Difícil', 'Muy difícil'] },
      { key: 'af_tratamiento', q: '¿Tienes acceso constante a tu medicación o tratamiento?', type: 'radio', options: ['Sí, sin problema', 'Con dificultad o alto costo', 'No siempre', 'No'] },
      { key: 'af_rehabilitacion', q: '¿Accedes a la rehabilitación que necesitas (física, ocupacional, lenguaje, cognitiva)?', type: 'radio', options: ['Sí', 'Parcial', 'No', 'No aplica'] },
      { key: 'af_urgencias', q: 'Ante una crisis o urgencia, ¿supiste a dónde acudir y hubo respuesta oportuna?', type: 'radio', options: ['Sí', 'A veces', 'No', 'No aplica'] },
      { key: 'af_cuidador', q: 'Si eres persona cuidadora, ¿cuentas con apoyo para el cuidado?', type: 'radio', options: ['Sí', 'Poco', 'No', 'No soy cuidador/a'] },
      { key: 'af_barrera', q: 'Mayor barrera en la afección neurológica:', type: 'checkbox', options: ['Pocos neurólogos o subespecialistas', 'Costo del tratamiento continuo', 'Distancia a los centros', 'Rehabilitación insuficiente', 'Falta de apoyo a cuidadores', 'Falta de continuidad entre niveles de atención'] },
    ],
    provider: [
      { key: 'af_oferta', q: '¿Qué tan suficiente es la oferta de neurología y rehabilitación en tu zona?', type: 'radio', options: ['Suficiente', 'Limitada', 'Escasa', 'Casi nula'] },
      { key: 'af_brecha_prof', q: 'Mayor brecha en afecciones neurológicas:', type: 'checkbox', options: ['Falta de subespecialistas', 'Rehabilitación', 'Continuidad del tratamiento', 'Apoyo a cuidadores', 'Cuidados paliativos / avanzados'] },
    ],
  },
};

export const CLOSING: Question[] = [
  { key: 'necesidad_libre', q: '¿Qué es lo que MÁS falta hoy en tu comunidad? (opcional)', type: 'text', optional: true },
];
