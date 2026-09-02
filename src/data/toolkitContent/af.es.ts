import type { ToolkitModule } from './types';

/**
 * Kit de Herramientas — sección AFECCIONES NEUROLÓGICAS (español, base).
 * Para personas y familias que conviven con enfermedades del sistema nervioso.
 * Base de referencia: OMS — CIE-11 Cap.08 y el Plan de acción mundial sobre la
 * epilepsia y otros trastornos neurológicos (IGAP). Orientación general y de
 * apoyo; NO reemplaza la indicación de tu equipo médico ni los servicios de
 * emergencia.
 */
export const MODULES: ToolkitModule[] = [
  {
    id: 'A',
    slug: 'entender-la-afeccion',
    icon: 'stethoscope',
    title: 'Entender la afección',
    area: 'Información clara y consulta bien aprovechada',
    summary: 'Palabras sin miedo y preguntas que ordenan el camino.',
    sections: [
      {
        id: 'glosario-af',
        title: 'Glosario sin miedo',
        blocks: [
          { kind: 'lead', text: 'Algunos términos suenan grandes. Aquí los contamos con calma: describen procesos y apoyos, no definen quién eres tú o tu familiar.' },
          {
            kind: 'glossary',
            items: [
              { term: 'Afección neurológica', plain: 'Una condición del sistema nervioso (cerebro, médula o nervios). Muchas se acompañan y mejoran la calidad de vida con apoyos.' },
              { term: 'Neurología', plain: 'La especialidad médica que estudia y trata estas condiciones.' },
              { term: 'Rehabilitación', plain: 'Terapias para recuperar o compensar funciones y ganar autonomía.' },
              { term: 'Crónico', plain: 'Que acompaña por tiempo prolongado; se maneja, se cuida y se convive con ello.' },
              { term: 'Cuidados paliativos', plain: 'Apoyos centrados en el bienestar y en aliviar molestias; suman calidad de vida en cualquier etapa.' },
              { term: 'Adherencia', plain: 'Seguir el plan acordado (medicación, terapias, controles) de forma constante.' },
            ],
          },
        ],
      },
      {
        id: 'consulta',
        title: 'Aprovechar la consulta',
        blocks: [
          { kind: 'p', text: 'El tiempo con el equipo médico es valioso. Llegar con preguntas escritas ayuda a no olvidar lo importante.' },
          { kind: 'list', variant: 'check', items: [
            '¿Qué nombre tiene la afección y qué significa en el día a día?',
            '¿Qué señales debo vigilar y cuáles son urgentes?',
            '¿Para qué sirve cada medicamento y qué efectos esperar?',
            '¿Qué terapias ayudan y con qué frecuencia?',
            '¿A quién llamo ante una duda o una crisis?',
          ] },
          { kind: 'callout', tone: 'tip', title: 'Lleva a alguien', text: 'Cuatro oídos escuchan mejor que dos. Pide resúmenes por escrito y no dudes en preguntar “¿me lo explica con otras palabras?”.' },
        ],
      },
      {
        id: 'organizar',
        title: 'Organizar la información',
        blocks: [
          { kind: 'p', text: 'Una carpeta única —física o digital— con informes, estudios, medicación y contactos evita repetir historias y agiliza cada atención.' },
          { kind: 'resource', file: '/kit/af/es/carpeta-de-salud.pdf', label: 'Carpeta de salud', description: 'Plantilla para reunir diagnósticos, estudios, medicación y contactos clave.' },
        ],
      },
    ],
  },
  {
    id: 'B',
    slug: 'rehabilitacion-y-terapias',
    icon: 'activity',
    title: 'Rehabilitación y terapias',
    area: 'Recuperar y compensar funciones',
    summary: 'Constancia amable, metas realistas y práctica en casa.',
    sections: [
      {
        id: 'tipos',
        title: 'Tipos de rehabilitación',
        blocks: [
          {
            kind: 'table',
            columns: ['Terapia', 'En qué ayuda'],
            rows: [
              ['Fisioterapia / neurorrehabilitación', 'Fuerza, equilibrio, marcha y movilidad.'],
              ['Terapia ocupacional', 'Actividades de la vida diaria y autonomía.'],
              ['Fonoaudiología / logopedia', 'Comunicación, voz y deglución.'],
              ['Neuropsicología', 'Memoria, atención y funciones ejecutivas.'],
              ['Rehabilitación cognitiva', 'Estrategias para pensar y organizarse mejor.'],
            ],
          },
        ],
      },
      {
        id: 'constancia',
        title: 'Metas y constancia',
        blocks: [
          { kind: 'steps', items: [
            'Acuerden con el equipo metas pequeñas y medibles (“caminar 10 metros con apoyo”).',
            'Repartan la práctica en dosis cortas y frecuentes, mejor que sesiones agotadoras.',
            'Registren avances y mesetas: las mesetas son parte del proceso, no un fracaso.',
            'Celebren cada logro y ajusten metas con el equipo.',
          ] },
          { kind: 'callout', tone: 'calm', title: 'Ritmo propio', text: 'La recuperación no es lineal. Días buenos y menos buenos conviven; la constancia amable rinde más que la exigencia.' },
        ],
      },
      {
        id: 'en-casa',
        title: 'Practicar en casa',
        blocks: [
          { kind: 'list', items: [
            'Haz los ejercicios indicados por el equipo, sin improvisar de más.',
            'Integra la práctica en rutinas reales: vestirse, cocinar, caminar al patio.',
            'Cuida la seguridad: espacios despejados y calzado firme.',
          ] },
          { kind: 'resource', file: '/kit/af/es/registro-de-terapias.pdf', label: 'Registro de terapias', description: 'Bitácora semanal de ejercicios, avances y dudas para la próxima sesión.' },
        ],
      },
    ],
  },
  {
    id: 'C',
    slug: 'cuidados-diarios-en-casa',
    icon: 'hearthands',
    title: 'Cuidados diarios en casa',
    area: 'Bienestar y seguridad cotidianos',
    summary: 'Medicación segura, movilidad, alimentación y descanso.',
    sections: [
      {
        id: 'medicacion',
        title: 'Medicación segura',
        blocks: [
          { kind: 'list', variant: 'check', items: [
            'Respeta horarios y dosis; usa alarmas o un pastillero semanal.',
            'No suspendas ni cambies dosis sin consultar: algunos fármacos requieren ajuste gradual.',
            'Anota efectos que notes y coméntalos en la próxima cita.',
            'Guarda una lista actualizada de medicamentos siempre a mano.',
          ] },
          { kind: 'callout', tone: 'care', title: 'Cambios, con el equipo', text: 'Suspender de golpe ciertos medicamentos —por ejemplo, algunos antiepilépticos— puede ser riesgoso. Cualquier cambio, acordado con tu médico.' },
        ],
      },
      {
        id: 'movilidad',
        title: 'Movilidad y prevención de caídas',
        blocks: [
          { kind: 'list', items: [
            'Retira alfombras sueltas y cables; suma buena iluminación.',
            'Barras de apoyo en baño y pasillos si hacen falta.',
            'Usa las ayudas indicadas (bastón, andadera) sin vergüenza: dan libertad.',
            'Cambios de postura frecuentes si se pasa mucho tiempo en cama o silla.',
          ] },
        ],
      },
      {
        id: 'alimentacion-descanso',
        title: 'Alimentación, piel y descanso',
        blocks: [
          { kind: 'p', text: 'Si hay dificultad para tragar (disfagia), sigue las indicaciones sobre texturas y posición al comer, y consulta ante tos o atragantamientos frecuentes.' },
          { kind: 'list', items: [
            'Cuida la hidratación y una alimentación adaptada a las indicaciones.',
            'Revisa la piel en zonas de apoyo para prevenir lesiones.',
            'Protege el sueño: horarios estables y ambiente tranquilo.',
          ] },
          { kind: 'resource', file: '/kit/af/es/plan-de-cuidados.pdf', label: 'Plan de cuidados diario', description: 'Checklist para medicación, movilidad, alimentación y descanso.' },
        ],
      },
    ],
  },
  {
    id: 'D',
    slug: 'senales-de-alarma-y-emergencias',
    icon: 'pulse',
    title: 'Señales de alarma y emergencias',
    area: 'Actuar con calma cuando urge',
    summary: 'Qué vigilar, cómo responder y cuándo pedir ayuda urgente.',
    sections: [
      {
        id: 'cuando-urge',
        title: 'Cuándo buscar ayuda urgente',
        blocks: [
          { kind: 'callout', tone: 'care', title: 'Ante la duda, llama a emergencias', text: 'Esta guía es general y no reemplaza al plan que te dio tu equipo ni a los servicios de emergencia de tu país. Si hay riesgo vital, llama de inmediato al número local de emergencias.' },
          { kind: 'list', items: [
            'Debilidad súbita en cara, brazo o pierna, dificultad para hablar o ver (posible ACV): actúa rápido, cada minuto cuenta.',
            'Crisis (convulsión) que dura más de 5 minutos o se repite sin recuperar la conciencia.',
            'Dolor de cabeza súbito e intensísimo, distinto a lo habitual.',
            'Fiebre alta con rigidez de cuello o confusión.',
            'Dificultad para respirar, atragantamiento o pérdida de conciencia.',
          ] },
        ],
      },
      {
        id: 'crisis',
        title: 'Primeros auxilios en una crisis (convulsión)',
        blocks: [
          { kind: 'steps', items: [
            'Mantén la calma y protege: retira objetos con los que pueda golpearse.',
            'Coloca algo blando bajo la cabeza y afloja lo que apriete el cuello.',
            'No sujetes con fuerza ni metas nada en la boca.',
            'Gíralo de lado (posición de recuperación) para ayudar a respirar.',
            'Cronometra la crisis; si supera 5 minutos o se repite, llama a emergencias.',
            'Acompaña hasta que se recupere y sigue el plan indicado por su médico.',
          ] },
          { kind: 'callout', tone: 'calm', title: 'Después de la crisis', text: 'Es normal la somnolencia o confusión posterior. Habla con voz suave, ofrece seguridad y registra qué pasó para el equipo médico.' },
        ],
      },
      {
        id: 'kit-emergencia',
        title: 'Prepararse con antelación',
        blocks: [
          { kind: 'list', variant: 'check', items: [
            'Un plan de acción escrito por tu equipo (qué hacer y a quién llamar).',
            'Lista de medicamentos y alergias, visible y actualizada.',
            'Contactos de emergencia y del neurólogo a mano.',
            'Documento o brazalete de identificación médica si se recomienda.',
          ] },
          { kind: 'resource', file: '/kit/af/es/plan-de-emergencia.pdf', label: 'Plan de emergencia', description: 'Ficha para completar con tu equipo: señales, pasos y contactos clave.' },
        ],
      },
    ],
  },
  {
    id: 'E',
    slug: 'derechos-tramites-y-apoyos',
    icon: 'scale',
    title: 'Derechos, trámites y apoyos',
    area: 'Discapacidad, apoyos y cuidado del cuidador',
    summary: 'A qué tienes derecho y cómo sostener el cuidado en el tiempo.',
    sections: [
      {
        id: 'derechos-af',
        title: 'Tienes derecho a…',
        blocks: [
          { kind: 'list', variant: 'check', items: [
            'Atención de salud digna, continua y con información clara.',
            'Rehabilitación y a los apoyos que necesites.',
            'Accesibilidad y ajustes razonables en el trabajo y la escuela.',
            'Trato sin discriminación por tu condición.',
          ] },
          { kind: 'callout', tone: 'calm', title: 'Pedir apoyo es un derecho', text: 'Los apoyos por discapacidad no son un favor: existen para igualar oportunidades. Infórmate de los de tu país sin pena.' },
        ],
      },
      {
        id: 'tramites',
        title: 'Trámites frecuentes',
        blocks: [
          { kind: 'steps', items: [
            'Reúne informes médicos actualizados en tu carpeta de salud.',
            'Consulta el reconocimiento o certificado de discapacidad de tu país y sus beneficios.',
            'Pregunta por apoyos de transporte, medicación, terapias o económicos.',
            'Guarda copia de cada trámite y sus fechas de renovación.',
          ] },
        ],
      },
      {
        id: 'cuidar-cuidador',
        title: 'Cuidar a quien cuida',
        blocks: [
          { kind: 'lead', text: 'El bienestar de la persona cuidadora sostiene todo lo demás. Cuidarte no es egoísmo: es parte del cuidado.' },
          { kind: 'list', items: [
            'Reparte tareas y acepta ayuda: nadie puede con todo, siempre.',
            'Reserva momentos de descanso y respiro, aunque sean breves.',
            'Busca grupos de apoyo entre pares (en Neuromundi tienes Neurocamps).',
            'Pide ayuda profesional si aparecen agotamiento, tristeza o ansiedad sostenidos.',
          ] },
          { kind: 'resource', file: '/kit/af/es/red-de-apoyo.pdf', label: 'Mapa de red de apoyo', description: 'Plantilla para organizar quién ayuda con qué y los relevos de cuidado.' },
        ],
      },
    ],
  },
];
