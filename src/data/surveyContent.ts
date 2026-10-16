/**
 * surveyContent — Primera Encuesta Internacional (neurodesarrollo,
 * neurodivergencia, afecciones neurológicas).
 *
 * ESTE ARCHIVO NO CONTIENE TEXTO. Sólo la estructura del cuestionario: claves,
 * tipos y CÓDIGOS de opción. Todo el texto vive en los once archivos de idioma,
 * bajo `survey.q.<clave>`, `survey.opt.<clave>.<código>`, `survey.role.<rol>`,
 * `survey.section.<sección>` y `survey.ui.*`.
 *
 * Por qué los códigos (auditoría 15 oct 2026, hallazgo M-12): antes la opción
 * que se guardaba en `survey_responses.answers` era la etiqueta en español. Al
 * abrir la encuesta a once idiomas, cada respuesta habría quedado escrita en el
 * idioma de quien respondió y el cruce entre países sería imposible. Lo que se
 * guarda ahora es el código, igual en todos los idiomas. Se cambió con CERO
 * respuestas en la tabla: medido antes de tocar nada.
 *
 * Los códigos son estables: si cambia la redacción en español, el código NO
 * cambia. Si se añade una opción, se añade un código nuevo y se traduce.
 */
export type QType = 'radio' | 'checkbox' | 'select' | 'text';

export interface Question {
  key: string;
  type: QType;
  /** Códigos de opción, no etiquetas. La etiqueta sale de survey.opt.<key>.<code>. */
  options?: string[];
  optional?: boolean;
}

/** Valores de rol. Etiqueta en survey.role.<valor>. */
export const ROLES: string[] = ['familiar', 'persona', 'especialista', 'proveedor', 'servicios', 'organizacion', 'escuela', 'empresa'];

/** Valores de sección. Etiqueta en survey.section.<valor>. */
export const SECTION_OPTIONS: string[] = ['neurodesarrollo', 'neurodivergencias', 'afecciones'];

/** Roles que responden como "usuarios" (experiencia vivida) vs. "oferta". */
export const CONSUMER_ROLES = ['familiar', 'persona'];
export function audienceOf(role: string): 'consumer' | 'provider' {
  return CONSUMER_ROLES.includes(role) ? 'consumer' : 'provider';
}

const EXPERIENCIA: Question[] = [
  { key: 'acceso_facil', type: 'radio', options: ['muy_facil', 'facil', 'dificil', 'muy_dificil'] },
  { key: 'trato_neuroafirmativo', type: 'radio', options: ['si_claramente', 'en_parte', 'no', 'no_aplica'] },
  { key: 'inclusion_escolar', type: 'radio', options: ['si_con_apoyos', 'parcial', 'no', 'no_aplica'] },
  { key: 'inclusion_laboral', type: 'radio', options: ['si', 'parcial', 'no', 'no_aplica'] },
  { key: 'carga_economica', type: 'radio', options: ['no_es_una_carga', 'carga_moderada', 'carga_alta', 'carga_muy_alta', 'prefiero_no_decir'] },
];

export const BRANCHES: Record<string, Question[]> = {
  familiar: EXPERIENCIA,
  persona: EXPERIENCIA,
  especialista: [
    { key: 'profesion', type: 'text' },
    { key: 'modalidad', type: 'checkbox', options: ['presencial', 'en_linea'] },
    { key: 'formacion', type: 'radio', options: ['si_formacion_especifica', 'parcial_autodidacta', 'no'] },
    { key: 'colaborar', type: 'radio', options: ['si', 'tal_vez', 'no'] },
    { key: 'herramientas', type: 'checkbox', options: ['agenda_citas_en_linea', 'expediente_electronico', 'teleconsulta', 'redes_sociales', 'ninguna'] },
  ],
  proveedor: [
    { key: 'productos', type: 'text' },
    { key: 'barreras_llegar', type: 'checkbox', options: ['costo_de_difusion', 'competencia', 'logistica_envios', 'poca_visibilidad_ante_familias', 'desconocimiento_del_sector'] },
    { key: 'interes_marketplace', type: 'radio', options: ['si', 'tal_vez', 'no'] },
  ],
  servicios: [
    { key: 'servicio_tipo', type: 'text' },
    { key: 'modalidad_serv', type: 'checkbox', options: ['presencial', 'a_domicilio', 'en_linea'] },
    { key: 'retos_serv', type: 'checkbox', options: ['baja_demanda_que_pueda_pagar', 'falta_de_derivaciones', 'falta_de_formacion_especifica', 'poca_difusion', 'tramites_o_marco_legal'] },
    { key: 'interes_directorio', type: 'radio', options: ['si', 'tal_vez', 'no'] },
  ],
  organizacion: [
    { key: 'servicios', type: 'text' },
    { key: 'necesidades', type: 'checkbox', options: ['financiamiento', 'difusion', 'voluntariado', 'alianzas', 'formacion'] },
    { key: 'colaborar_red', type: 'radio', options: ['si', 'tal_vez', 'no'] },
  ],
  escuela: [
    { key: 'programa_inclusion', type: 'radio', options: ['si', 'parcial', 'no'] },
    { key: 'retos_inclusion', type: 'checkbox', options: ['formacion_docente', 'cupo_recursos', 'apoyo_especializado', 'sensibilizacion_de_la_comunida', 'financiamiento'] },
    { key: 'apoyos_necesarios', type: 'text', optional: true },
  ],
  empresa: [
    { key: 'contrata_nd', type: 'radio', options: ['si', 'no_pero_nos_interesa', 'no'] },
    { key: 'barreras_laboral', type: 'checkbox', options: ['desconocimiento', 'falta_de_apoyos_ajustes', 'procesos_de_rh', 'sensibilizacion', 'ninguna'] },
    { key: 'interes_vacantes', type: 'radio', options: ['si', 'tal_vez', 'no'] },
  ],
};

export const SECTION_QUESTIONS: Record<string, { consumer: Question[]; provider: Question[] }> = {
  neurodesarrollo: {
    consumer: [
      { key: 'nd_edad_senal', type: 'select', options: ['antes_del_1_er_ano', '1_a_2_anos', '3_a_4_anos', '5_a_6_anos', 'edad_escolar', 'adolescencia_o_despues', 'no_aplica'] },
      { key: 'nd_vigilancia', type: 'radio', options: ['si_de_forma_sistematica', 'a_veces', 'no', 'no_lo_se'] },
      { key: 'nd_intervencion_temprana', type: 'radio', options: ['si', 'parcial', 'no', 'no_aplica'] },
      { key: 'nd_terapias', type: 'checkbox', options: ['terapia_ocupacional_integracio', 'fonoaudiologia_lenguaje', 'psicopedagogia_aprendizaje', 'fisioterapia_neuromotora', 'analisis_conductual_aba', 'dir_floortime', 'ninguna'] },
      { key: 'nd_barrera', type: 'checkbox', options: ['diagnostico_tardio', 'faltan_especialistas_en_interv', 'costo_de_terapias_continuas', 'coordinar_terapias_con_la_escu', 'informacion_confiable'] },
    ],
    provider: [
      { key: 'nd_acceso_it', type: 'radio', options: ['buena', 'limitada', 'escasa', 'casi_nula'] },
      { key: 'nd_brecha_prof', type: 'checkbox', options: ['deteccion_tardia', 'pocos_terapeutas_formados', 'listas_de_espera', 'falta_de_trabajo_interdiscipli', 'continuidad_escuelaterapia'] },
    ],
  },
  neurodivergencias: {
    consumer: [
      { key: 'ndx_identificacion', type: 'radio', options: ['diagnostico_clinico_formal', 'en_proceso_de_diagnostico', 'autoidentificacion_sin_diagnos', 'no_aplica'] },
      { key: 'ndx_edad_dx', type: 'select', options: ['infancia_temprana', 'ninez', 'adolescencia', 'adultez', 'aun_sin_diagnostico', 'no_aplica'] },
      { key: 'ndx_adaptaciones', type: 'checkbox', options: ['sensoriales_ruido_luz_texturas', 'comunicacion_tiempos_claridad', 'flexibilidad_de_rutinas_horari', 'apoyo_a_funciones_ejecutivas', 'espacios_de_calma_regulacion'] },
      { key: 'ndx_afirmativo', type: 'radio', options: ['si', 'en_parte', 'no', 'no_aplica'] },
      { key: 'ndx_salud_mental', type: 'radio', options: ['si_con_apoyo', 'si_sin_apoyo', 'no'] },
      { key: 'ndx_barrera', type: 'checkbox', options: ['estigma_o_prejuicio', 'faltan_profesionales_neuroafir', 'costo', 'falta_de_adaptaciones_en_escue', 'diagnostico_tardio_adultos_muj'] },
    ],
    provider: [
      { key: 'ndx_enfoque', type: 'radio', options: ['si_explicitamente', 'parcial', 'no'] },
      { key: 'ndx_no_cubierto', type: 'checkbox', options: ['diagnostico_en_adultos_y_mujer', 'adaptaciones_escolares_laboral', 'salud_mental_asociada', 'formacion_de_profesionales', 'autonomia_y_vida_independiente'] },
    ],
  },
  afecciones: {
    consumer: [
      { key: 'af_tipo', type: 'select', options: ['epilepsia', 'parkinson_u_otro_trastorno_del', 'esclerosis_multiple', 'ela_enfermedad_neuromuscular', 'secuelas_de_acv_ictus', 'lesion_cerebral_o_medular', 'cefaleas_migrana', 'demencia_deterioro_cognitivo', 'otra'] },
      { key: 'af_acceso_neuro', type: 'radio', options: ['facil', 'dificil', 'muy_dificil'] },
      { key: 'af_tratamiento', type: 'radio', options: ['si_sin_problema', 'con_dificultad_o_alto_costo', 'no_siempre', 'no'] },
      { key: 'af_rehabilitacion', type: 'radio', options: ['si', 'parcial', 'no', 'no_aplica'] },
      { key: 'af_urgencias', type: 'radio', options: ['si', 'a_veces', 'no', 'no_aplica'] },
      { key: 'af_cuidador', type: 'radio', options: ['si', 'poco', 'no', 'no_soy_cuidador_a'] },
      { key: 'af_barrera', type: 'checkbox', options: ['pocos_neurologos_o_subespecial', 'costo_del_tratamiento_continuo', 'distancia_a_los_centros', 'rehabilitacion_insuficiente', 'falta_de_apoyo_a_cuidadores', 'falta_de_continuidad_entre_niv'] },
    ],
    provider: [
      { key: 'af_oferta', type: 'radio', options: ['suficiente', 'limitada', 'escasa', 'casi_nula'] },
      { key: 'af_brecha_prof', type: 'checkbox', options: ['falta_de_subespecialistas', 'rehabilitacion', 'continuidad_del_tratamiento', 'apoyo_a_cuidadores', 'cuidados_paliativos_avanzados'] },
    ],
  },
};

export const CLOSING: Question[] = [
  { key: 'necesidad_libre', type: 'text', optional: true },
];
