import type { ToolkitModule } from './types';

/**
 * Kit de Herramientas — sección NEURODESARROLLO (español, base).
 * Enfocado en familias que acompañan el desarrollo temprano de niñas y niños.
 * Orientación general, cálida y NO diagnóstica. La referencia de hitos sigue el
 * criterio de vigilancia del desarrollo (OMS/CDC) sin sustituir la valoración
 * profesional.
 */
export const MODULES: ToolkitModule[] = [
  {
    id: 'A',
    slug: 'hitos-del-desarrollo',
    icon: 'sprout',
    title: 'Hitos del desarrollo',
    area: 'Vigilancia del desarrollo temprano',
    summary: 'Qué observar por edades, con calma y sin comparar.',
    sections: [
      {
        id: 'que-son',
        title: 'Qué son los hitos (y qué no)',
        blocks: [
          { kind: 'lead', text: 'Los hitos son señales aproximadas de cómo un niño o niña se mueve, comunica, juega y se relaciona. Son una guía para acompañar, no una carrera ni un examen.' },
          { kind: 'p', text: 'Cada peque tiene su propio ritmo. Los rangos de edad son promedios: llegar un poco antes o después suele estar dentro de lo esperable. Lo valioso es observar la trayectoria a lo largo del tiempo, no un solo día.' },
          { kind: 'callout', tone: 'calm', title: 'Una brújula, no una regla', text: 'Si algo te inquieta, tu observación cuenta. Pedir orientación temprana no “etiqueta” a nadie: abre puertas a apoyos que hacen la vida más fácil.' },
        ],
      },
      {
        id: 'por-edad',
        title: 'Qué observar por área',
        blocks: [
          { kind: 'p', text: 'Cuatro áreas se acompañan a la vez. Esta tabla ofrece ejemplos de lo que suele aparecer y cuándo conviene conversar con un profesional de confianza.' },
          {
            kind: 'table',
            columns: ['Área', 'Qué suele aparecer', 'Conviene consultar si…'],
            rows: [
              ['Motor', 'Sostiene la cabeza, se sienta, gatea, camina, manipula objetos.', 'A los 12 meses no se desplaza de ninguna forma o el cuerpo se ve muy rígido o muy flojo.'],
              ['Comunicación', 'Balbucea, señala, dice primeras palabras, une dos palabras.', 'A los 18 meses no dice palabras con intención o no señala para pedir o mostrar.'],
              ['Social y afectiva', 'Sonríe, busca miradas, comparte atención, imita gestos.', 'No responde a su nombre, evita el contacto o pierde habilidades que ya tenía.'],
              ['Cognitiva y juego', 'Explora, busca objetos escondidos, juega a “como si”, resuelve pequeños retos.', 'No hay juego de imitación hacia los 2 años o el interés por explorar es muy limitado.'],
            ],
            caption: 'Ejemplos orientativos; los rangos varían entre fuentes y entre niñas y niños.',
          },
          { kind: 'callout', tone: 'care', title: 'Señal para no esperar', text: 'La pérdida de habilidades ya logradas (dejar de hablar, de mirar o de jugar como antes) merece una consulta pronta, sin alarmarse.' },
        ],
      },
      {
        id: 'glosario-nd',
        title: 'Palabras que ayudan',
        blocks: [
          {
            kind: 'glossary',
            items: [
              { term: 'Vigilancia del desarrollo', plain: 'Observar con cariño y de forma continua cómo crece y aprende, en cada control de salud.' },
              { term: 'Atención temprana', plain: 'Conjunto de apoyos en los primeros años que potencian el desarrollo y el vínculo.' },
              { term: 'Trayectoria', plain: 'La dirección de los avances en el tiempo; importa más que un dato aislado.' },
              { term: 'Estimulación', plain: 'Ofrecer experiencias cotidianas y juego que invitan a explorar, sin presionar.' },
            ],
          },
          { kind: 'resource', file: '/kit/nd/es/hitos-por-edad.pdf', label: 'Guía de hitos por edad', description: 'Tabla imprimible por áreas y edades para tu bitácora, con espacio para notas.' },
        ],
      },
    ],
  },
  {
    id: 'B',
    slug: 'estimulacion-y-juego',
    icon: 'blocks',
    title: 'Estimulación y juego',
    area: 'Aprender jugando en la vida diaria',
    summary: 'El juego es el motor: ideas simples, sin sobreestimular.',
    sections: [
      {
        id: 'juego-motor',
        title: 'El juego, el mejor maestro',
        blocks: [
          { kind: 'lead', text: 'No hacen falta juguetes caros ni pantallas. El vínculo, la voz y los objetos de casa son suficientes para aprender.' },
          { kind: 'list', variant: 'check', items: [
            'Sigue el interés del peque: si mira algo, nómbralo y juega con eso.',
            'Menos es más: pocos objetos, turnos cortos y muchas repeticiones.',
            'Nombra lo que hacen ambos: “subes la torre”, “cae”, “otra vez”.',
            'Espera y observa: deja pausas para que responda a su ritmo.',
          ] },
        ],
      },
      {
        id: 'ideas-edad',
        title: 'Ideas por etapa',
        blocks: [
          {
            kind: 'table',
            columns: ['Etapa', 'Juego sencillo', 'Qué fortalece'],
            rows: [
              ['0–12 meses', 'Cucú-tras, canciones con gestos, mirarse al espejo.', 'Atención compartida, vínculo, anticipación.'],
              ['1–2 años', 'Meter y sacar objetos, torres, señalar en cuentos.', 'Motricidad, primeras palabras, causa-efecto.'],
              ['2–3 años', 'Juego de “como si” (dar de comer al muñeco), encajes.', 'Lenguaje, imaginación, resolución de problemas.'],
              ['3–5 años', 'Roles (tienda, doctor), clasificar por color o tamaño.', 'Habilidades sociales, funciones ejecutivas.'],
            ],
          },
          { kind: 'callout', tone: 'tip', title: 'Rutinas que enseñan', text: 'El baño, la comida y vestirse son oro: narra los pasos y ofrece pequeñas elecciones (“¿la roja o la azul?”).' },
        ],
      },
      {
        id: 'sin-sobreestimular',
        title: 'Estimular sin saturar',
        blocks: [
          { kind: 'steps', items: [
            'Observa señales de cansancio: gira la cara, se inquieta, se frota los ojos.',
            'Baja el ritmo: menos estímulos, voz suave, un solo juego.',
            'Ofrece calma antes de dormir: luz baja, sin pantallas, rutina previsible.',
          ] },
          { kind: 'resource', file: '/kit/nd/es/ideas-de-juego.pdf', label: 'Ideas de juego por edad', description: 'Fichas breves con propuestas caseras y de bajo costo.' },
        ],
      },
    ],
  },
  {
    id: 'C',
    slug: 'crianza-respetuosa-y-vinculo',
    icon: 'hearthands',
    title: 'Crianza respetuosa y vínculo',
    area: 'Acompañamiento afectivo del desarrollo',
    summary: 'El vínculo seguro es la base sobre la que todo se construye.',
    sections: [
      {
        id: 'apego',
        title: 'Un vínculo que da seguridad',
        blocks: [
          { kind: 'lead', text: 'Cuando un peque siente que hay alguien disponible y previsible, se atreve a explorar. El afecto no “malcría”: sostiene.' },
          { kind: 'p', text: 'Responder a su llanto, nombrar lo que siente y volver a la calma juntos son la manera en que aprende, poco a poco, a regularse por dentro.' },
        ],
      },
      {
        id: 'regular-calma',
        title: 'Acompañar el berrinche con calma',
        blocks: [
          { kind: 'steps', items: [
            'Primero tu calma: respira; tu tranquilidad es contagiosa.',
            'Pon en palabras: “estás muy enojado porque se acabó el juego”.',
            'Ofrece cercanía, no sermón: a veces basta estar al lado.',
            'Cuando pase la ola, repara y vuelve a la rutina sin castigos ni etiquetas.',
          ] },
          { kind: 'callout', tone: 'calm', title: 'No es contra ti', text: 'El berrinche suele ser un cerebro pequeño desbordado, no una manipulación. Madurar la regulación lleva años.' },
        ],
      },
      {
        id: 'sin-comparar',
        title: 'Cuidar la mirada',
        blocks: [
          { kind: 'list', items: [
            'Evita comparar con hermanos o con otros niños: cada quien tiene su calendario.',
            'Celebra el esfuerzo, no solo el logro: “lo intentaste muchas veces”.',
            'Cuídate tú también: un cuidador descansado acompaña mejor.',
          ] },
          { kind: 'resource', file: '/kit/nd/es/rutinas-visuales.pdf', label: 'Rutinas visuales para casa', description: 'Tarjetas de apoyo para anticipar el día y reducir conflictos.' },
        ],
      },
    ],
  },
  {
    id: 'D',
    slug: 'entrada-al-mundo-escolar',
    icon: 'graduation',
    title: 'Entrada al mundo escolar',
    area: 'Guardería, preescolar y primeras adaptaciones',
    summary: 'Elegir un entorno amable y construir alianza con la escuela.',
    sections: [
      {
        id: 'elegir-entorno',
        title: 'Qué mirar al elegir',
        blocks: [
          { kind: 'list', variant: 'check', items: [
            'Trato cálido y respetuoso con los peques y con las familias.',
            'Grupos no saturados y adultos suficientes para acompañar.',
            'Apertura a adaptaciones y a la comunicación frecuente.',
            'Rutinas previsibles y espacios que no sobreestimulen.',
          ] },
        ],
      },
      {
        id: 'alianza-escuela',
        title: 'Alianza escuela–familia',
        blocks: [
          { kind: 'steps', items: [
            'Comparte lo que funciona en casa: intereses, calmantes, señales de cansancio.',
            'Acuerden un canal simple de comunicación (libreta, mensajes breves).',
            'Fijen una reunión de seguimiento a las pocas semanas.',
          ] },
          { kind: 'resource', file: '/kit/nd/es/carta-inicio-escolar.pdf', label: 'Carta de inicio escolar', description: 'Modelo para presentar a tu hijo o hija y los apoyos que le ayudan.' },
        ],
      },
      {
        id: 'adaptaciones-tempranas',
        title: 'Adaptaciones sencillas',
        blocks: [
          { kind: 'list', items: [
            'Anticipar cambios con imágenes o avisos cortos.',
            'Un rincón de calma para autorregularse.',
            'Consignas breves y una cosa a la vez.',
            'Periodo de adaptación flexible al inicio.',
          ] },
        ],
      },
    ],
  },
  {
    id: 'E',
    slug: 'derechos-y-primeros-apoyos',
    icon: 'scale',
    title: 'Derechos y primeros apoyos',
    area: 'Rutas de atención temprana y derechos',
    summary: 'A qué tienes derecho y cómo iniciar los apoyos.',
    sections: [
      {
        id: 'derechos-nd',
        title: 'Tienes derecho a…',
        blocks: [
          { kind: 'list', variant: 'check', items: [
            'Una vigilancia del desarrollo en cada control de salud.',
            'Información clara, sin tecnicismos, y a una segunda opinión.',
            'Servicios de atención temprana cuando se necesiten.',
            'Inclusión educativa desde los primeros años.',
          ] },
          { kind: 'callout', tone: 'calm', title: 'Sin culpas', text: 'Buscar apoyo temprano es un acto de cuidado, no una señal de fracaso. Cuanto antes, más sencillo suele ser acompañar.' },
        ],
      },
      {
        id: 'rutas',
        title: 'Cómo empezar',
        blocks: [
          { kind: 'steps', items: [
            'Anota tus observaciones y dudas antes de la consulta (usa la bitácora).',
            'Habla con pediatría o el centro de salud sobre la vigilancia del desarrollo.',
            'Pide, si corresponde, una valoración de atención temprana.',
            'Reúne el directorio de apoyos de tu zona y guarda cada informe.',
          ] },
          { kind: 'glossary', items: [
            { term: 'Atención temprana', plain: 'Programa de apoyos en los primeros años, idealmente en entornos naturales (casa, escuela).' },
            { term: 'Informe', plain: 'Documento que resume observaciones y recomendaciones; guárdalo, sirve para trámites.' },
            { term: 'Inclusión', plain: 'Que el entorno se adapte al niño o niña, no al revés.' },
          ] },
          { kind: 'resource', file: '/kit/nd/es/directorio-apoyos.pdf', label: 'Directorio de primeros apoyos', description: 'Plantilla para organizar contactos, citas e informes en un solo lugar.' },
        ],
      },
    ],
  },
];
