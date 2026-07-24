/**
 * milestonesGuide — guía ORIENTATIVA de hitos del neurodesarrollo por edad.
 *
 * Es material de referencia para que la familia sepa qué observar; NO es una
 * herramienta de diagnóstico ni una lista de "obligaciones". Cada niña o niño
 * tiene su propio ritmo. Los rangos son aproximados y de uso general.
 *
 * El texto de los hitos vive aquí como DATOS (no como claves i18n), igual que el
 * contenido legal o del blog, y está en ESPAÑOL e INGLÉS. La UI elige el idioma:
 * español si la app está en español, inglés en cualquier otro caso. Ampliar a
 * más idiomas es una mejora futura; no afecta la paridad de claves i18n.
 */

export type MilestoneArea = 'motor' | 'lenguaje' | 'social' | 'cognitivo';
export type MilestoneLang = 'es' | 'en';

export interface MilestoneBand {
  /** Identificador estable de la franja. */
  id: string;
  /** Rango en MESES [desde, hasta] para formatear la etiqueta traducida. */
  from: number;
  to: number;
  /** Hitos por área, en español e inglés. */
  items: Record<MilestoneArea, Record<MilestoneLang, string[]>>;
}

export const MILESTONE_AREAS: MilestoneArea[] = ['motor', 'lenguaje', 'social', 'cognitivo'];

/** Idioma del catálogo a partir del idioma de la app (es → es; resto → en). */
export function milestoneLang(appLang: string | undefined): MilestoneLang {
  return (appLang ?? '').toLowerCase().startsWith('es') ? 'es' : 'en';
}

export const MILESTONE_BANDS: MilestoneBand[] = [
  {
    id: '0-6m',
    from: 0,
    to: 6,
    items: {
      motor: {
        es: ['Sostiene la cabeza al estar boca abajo', 'Sigue objetos con la mirada', 'Lleva las manos a la boca'],
        en: ['Holds head up during tummy time', 'Follows objects with the eyes', 'Brings hands to the mouth'],
      },
      lenguaje: {
        es: ['Reacciona a sonidos y voces', 'Emite sonidos (arrullos, gorjeos)', 'Sonríe en respuesta a otras personas'],
        en: ['Reacts to sounds and voices', 'Makes sounds (cooing, gurgling)', 'Smiles back at people'],
      },
      social: {
        es: ['Busca el contacto visual', 'Se calma con la voz de un cuidador', 'Muestra interés por los rostros'],
        en: ['Seeks eye contact', 'Calms to a caregiver’s voice', 'Shows interest in faces'],
      },
      cognitivo: {
        es: ['Se lleva objetos a la boca para explorarlos', 'Muestra curiosidad por lo que le rodea'],
        en: ['Explores objects by mouthing them', 'Shows curiosity about surroundings'],
      },
    },
  },
  {
    id: '6-12m',
    from: 6,
    to: 12,
    items: {
      motor: {
        es: ['Se sienta sin apoyo', 'Pasa objetos de una mano a otra', 'Gatea o se desplaza', 'Se pone de pie con apoyo'],
        en: ['Sits without support', 'Passes objects hand to hand', 'Crawls or moves around', 'Pulls up to stand with support'],
      },
      lenguaje: {
        es: ['Balbucea con sílabas (ba-ba, da-da)', 'Responde a su nombre', 'Entiende un "no" sencillo'],
        en: ['Babbles with syllables (ba-ba, da-da)', 'Responds to their name', 'Understands a simple "no"'],
      },
      social: {
        es: ['Juega a esconderse y aparecer', 'Muestra apego a cuidadores', 'Imita gestos simples'],
        en: ['Plays peekaboo', 'Shows attachment to caregivers', 'Imitates simple gestures'],
      },
      cognitivo: {
        es: ['Busca un objeto que se esconde', 'Explora objetos golpeándolos o sacudiéndolos'],
        en: ['Looks for a hidden object', 'Explores objects by banging or shaking them'],
      },
    },
  },
  {
    id: '12-24m',
    from: 12,
    to: 24,
    items: {
      motor: {
        es: ['Camina sin ayuda', 'Sube escalones con apoyo', 'Hace torres con cubos', 'Garabatea'],
        en: ['Walks without help', 'Climbs stairs with support', 'Stacks blocks', 'Scribbles'],
      },
      lenguaje: {
        es: ['Dice varias palabras sueltas', 'Señala lo que quiere', 'Sigue instrucciones simples', 'Combina dos palabras'],
        en: ['Says several single words', 'Points to what they want', 'Follows simple instructions', 'Combines two words'],
      },
      social: {
        es: ['Imita tareas de la casa', 'Juega cerca de otros niños', 'Muestra afecto'],
        en: ['Imitates household tasks', 'Plays near other children', 'Shows affection'],
      },
      cognitivo: {
        es: ['Reconoce objetos y personas familiares', 'Empieza el juego simbólico (dar de comer a un muñeco)'],
        en: ['Recognizes familiar objects and people', 'Begins pretend play (feeding a doll)'],
      },
    },
  },
  {
    id: '2-3a',
    from: 24,
    to: 36,
    items: {
      motor: {
        es: ['Corre y salta', 'Patea una pelota', 'Come solo con cuchara', 'Ayuda a vestirse'],
        en: ['Runs and jumps', 'Kicks a ball', 'Eats with a spoon on their own', 'Helps with dressing'],
      },
      lenguaje: {
        es: ['Forma frases de 2-3 palabras', 'Se le entiende buena parte de lo que dice', 'Nombra objetos comunes'],
        en: ['Forms 2–3 word phrases', 'Is understood much of the time', 'Names common objects'],
      },
      social: {
        es: ['Juega junto a otros niños', 'Expresa emociones básicas', 'Empieza a esperar turnos'],
        en: ['Plays alongside other children', 'Expresses basic emotions', 'Begins to take turns'],
      },
      cognitivo: {
        es: ['Ordena por forma o color', 'Completa juegos sencillos', 'Sigue instrucciones de dos pasos'],
        en: ['Sorts by shape or color', 'Completes simple puzzles', 'Follows two-step instructions'],
      },
    },
  },
  {
    id: '3-4a',
    from: 36,
    to: 48,
    items: {
      motor: {
        es: ['Sube y baja escaleras alternando pies', 'Dibuja círculos', 'Usa tijeras con supervisión'],
        en: ['Goes up and down stairs alternating feet', 'Draws circles', 'Uses scissors with supervision'],
      },
      lenguaje: {
        es: ['Cuenta lo que hizo', 'Hace preguntas ("¿por qué?")', 'Se le entiende casi todo'],
        en: ['Tells what they did', 'Asks questions ("why?")', 'Is understood almost all the time'],
      },
      social: {
        es: ['Juega en cooperación con otros', 'Comparte por momentos', 'Sigue reglas de juegos simples'],
        en: ['Plays cooperatively with others', 'Shares at times', 'Follows rules of simple games'],
      },
      cognitivo: {
        es: ['Entiende conceptos de cantidad ("más", "menos")', 'Nombra algunos colores', 'Arma rompecabezas sencillos'],
        en: ['Understands quantity concepts ("more", "less")', 'Names some colors', 'Assembles simple puzzles'],
      },
    },
  },
  {
    id: '4-6a',
    from: 48,
    to: 72,
    items: {
      motor: {
        es: ['Salta en un pie', 'Se viste solo', 'Dibuja figuras reconocibles', 'Maneja bien lápiz y tijeras'],
        en: ['Hops on one foot', 'Dresses independently', 'Draws recognizable figures', 'Handles pencil and scissors well'],
      },
      lenguaje: {
        es: ['Cuenta historias', 'Usa frases completas y bien formadas', 'Reconoce algunas letras o números'],
        en: ['Tells stories', 'Uses complete, well-formed sentences', 'Recognizes some letters or numbers'],
      },
      social: {
        es: ['Hace amistades', 'Comprende reglas y turnos', 'Expresa y nombra emociones'],
        en: ['Makes friends', 'Understands rules and turns', 'Expresses and names emotions'],
      },
      cognitivo: {
        es: ['Cuenta objetos', 'Comprende el tiempo (antes/después)', 'Resuelve problemas simples'],
        en: ['Counts objects', 'Understands time (before/after)', 'Solves simple problems'],
      },
    },
  },
];
