import type { ToolkitModule } from './types';

/**
 * Tools — NEURODEVELOPMENT section (English).
 * For families accompanying a young child's early development. Warm, general,
 * NON-diagnostic guidance. Milestone references follow developmental-surveillance
 * criteria (WHO/CDC) and do not replace professional assessment.
 */
export const MODULES: ToolkitModule[] = [
  {
    id: 'A',
    slug: 'developmental-milestones',
    icon: 'sprout',
    title: 'Developmental milestones',
    area: 'Early developmental surveillance',
    summary: 'What to notice by age — calmly and without comparing.',
    sections: [
      {
        id: 'que-son',
        title: 'What milestones are (and are not)',
        blocks: [
          { kind: 'lead', text: 'Milestones are approximate signs of how a child moves, communicates, plays and relates. They are a guide for accompanying — not a race or a test.' },
          { kind: 'p', text: 'Every child has their own pace. Age ranges are averages: arriving a little earlier or later is usually within what is expected. What matters is the trajectory over time, not a single day.' },
          { kind: 'callout', tone: 'calm', title: 'A compass, not a ruler', text: 'If something worries you, your observation counts. Asking for guidance early does not "label" anyone: it opens doors to supports that make life easier.' },
        ],
      },
      {
        id: 'por-edad',
        title: 'What to notice, by area',
        blocks: [
          { kind: 'p', text: 'Four areas grow together. This table gives examples of what usually appears and when it helps to talk with a trusted professional.' },
          {
            kind: 'table',
            columns: ['Area', 'What usually appears', 'Worth consulting if…'],
            rows: [
              ['Motor', 'Holds head up, sits, crawls, walks, handles objects.', 'By 12 months they do not move about in any way, or the body seems very stiff or very floppy.'],
              ['Communication', 'Babbles, points, first words, joins two words.', 'By 18 months no words used with intent, or no pointing to request or show.'],
              ['Social & emotional', 'Smiles, seeks eye contact, shares attention, imitates gestures.', 'Does not respond to their name, avoids contact, or loses skills they already had.'],
              ['Cognitive & play', 'Explores, looks for hidden objects, plays pretend, solves small challenges.', 'No pretend play by around age 2, or very limited interest in exploring.'],
            ],
            caption: 'Orientation examples; ranges vary between sources and between children.',
          },
          { kind: 'callout', tone: 'care', title: 'A signal not to wait on', text: 'Losing skills already gained (stopping talking, looking or playing as before) deserves a prompt consultation — without alarm.' },
        ],
      },
      {
        id: 'glosario-nd',
        title: 'Words that help',
        blocks: [
          {
            kind: 'glossary',
            items: [
              { term: 'Developmental surveillance', plain: 'Watching lovingly and continuously how a child grows and learns, at every health check-up.' },
              { term: 'Early intervention', plain: 'A set of supports in the first years that boost development and bonding.' },
              { term: 'Trajectory', plain: 'The direction of progress over time; it matters more than an isolated data point.' },
              { term: 'Stimulation', plain: 'Offering everyday experiences and play that invite exploration, without pressure.' },
            ],
          },
          { kind: 'resource', file: '/kit/nd/en/hitos-por-edad.pdf', label: 'Milestones by age', description: 'Printable table by area and age for your log, with space for notes.' },
        ],
      },
    ],
  },
  {
    id: 'B',
    slug: 'play-and-stimulation',
    icon: 'blocks',
    title: 'Play and stimulation',
    area: 'Learning through play in daily life',
    summary: 'Play is the engine: simple ideas, without over-stimulating.',
    sections: [
      {
        id: 'juego-motor',
        title: 'Play, the best teacher',
        blocks: [
          { kind: 'lead', text: 'No expensive toys or screens needed. Bonding, your voice and household objects are enough to learn.' },
          { kind: 'list', variant: 'check', items: [
            'Follow the child\'s interest: if they look at something, name it and play with that.',
            'Less is more: few objects, short turns and lots of repetition.',
            'Narrate what you both do: "you build the tower", "it falls", "again".',
            'Wait and watch: leave pauses so they respond at their own pace.',
          ] },
        ],
      },
      {
        id: 'ideas-edad',
        title: 'Ideas by stage',
        blocks: [
          {
            kind: 'table',
            columns: ['Stage', 'Simple play', 'What it builds'],
            rows: [
              ['0–12 months', 'Peekaboo, songs with gestures, looking in the mirror.', 'Shared attention, bonding, anticipation.'],
              ['1–2 years', 'Putting objects in and out, stacking, pointing in books.', 'Motor skills, first words, cause-and-effect.'],
              ['2–3 years', 'Pretend play (feeding the doll), shape sorters.', 'Language, imagination, problem-solving.'],
              ['3–5 years', 'Roles (shop, doctor), sorting by color or size.', 'Social skills, executive functions.'],
            ],
          },
          { kind: 'callout', tone: 'tip', title: 'Routines that teach', text: 'Bath, meals and dressing are gold: narrate the steps and offer small choices ("the red one or the blue one?").' },
        ],
      },
      {
        id: 'sin-sobreestimular',
        title: 'Stimulate without overwhelming',
        blocks: [
          { kind: 'steps', items: [
            'Watch for signs of tiredness: turning the face away, fidgeting, rubbing the eyes.',
            'Slow down: fewer stimuli, soft voice, one single game.',
            'Offer calm before sleep: low light, no screens, a predictable routine.',
          ] },
          { kind: 'resource', file: '/kit/nd/en/ideas-de-juego.pdf', label: 'Play ideas by age', description: 'Short cards with home-made, low-cost suggestions.' },
        ],
      },
    ],
  },
  {
    id: 'C',
    slug: 'respectful-parenting-and-bonding',
    icon: 'hearthands',
    title: 'Respectful parenting and bonding',
    area: 'The affective side of development',
    summary: 'A secure bond is the foundation everything is built on.',
    sections: [
      {
        id: 'apego',
        title: 'A bond that gives security',
        blocks: [
          { kind: 'lead', text: 'When a child feels there is someone available and predictable, they dare to explore. Affection does not "spoil": it holds.' },
          { kind: 'p', text: 'Responding to their crying, naming what they feel and returning to calm together are how they learn, little by little, to regulate from within.' },
        ],
      },
      {
        id: 'regular-calma',
        title: 'Meeting the meltdown with calm',
        blocks: [
          { kind: 'steps', items: [
            'Your calm first: breathe; your steadiness is contagious.',
            'Put it into words: "you\'re very angry because the game ended".',
            'Offer closeness, not a lecture: sometimes being nearby is enough.',
            'When the wave passes, repair and return to routine — no punishments or labels.',
          ] },
          { kind: 'callout', tone: 'calm', title: 'It is not against you', text: 'A meltdown is usually a small brain overwhelmed, not manipulation. Maturing self-regulation takes years.' },
        ],
      },
      {
        id: 'sin-comparar',
        title: 'Caring for the way we look at them',
        blocks: [
          { kind: 'list', items: [
            'Avoid comparing with siblings or other children: each has their own calendar.',
            'Celebrate effort, not just achievement: "you tried many times".',
            'Take care of yourself too: a rested caregiver accompanies better.',
          ] },
          { kind: 'resource', file: '/kit/nd/en/rutinas-visuales.pdf', label: 'Visual routines for home', description: 'Support cards to preview the day and reduce conflict.' },
        ],
      },
    ],
  },
  {
    id: 'D',
    slug: 'starting-school',
    icon: 'graduation',
    title: 'Starting school',
    area: 'Daycare, preschool and first adaptations',
    summary: 'Choosing a kind setting and building an alliance with the school.',
    sections: [
      {
        id: 'elegir-entorno',
        title: 'What to look for when choosing',
        blocks: [
          { kind: 'list', variant: 'check', items: [
            'Warm, respectful treatment of children and families.',
            'Groups that are not overcrowded and enough adults to accompany.',
            'Openness to adaptations and to frequent communication.',
            'Predictable routines and spaces that do not over-stimulate.',
          ] },
        ],
      },
      {
        id: 'alianza-escuela',
        title: 'School–family alliance',
        blocks: [
          { kind: 'steps', items: [
            'Share what works at home: interests, soothers, signs of tiredness.',
            'Agree on a simple communication channel (notebook, short messages).',
            'Set a follow-up meeting a few weeks in.',
          ] },
          { kind: 'resource', file: '/kit/nd/en/carta-inicio-escolar.pdf', label: 'School-start letter', description: 'A template to introduce your child and the supports that help them.' },
        ],
      },
      {
        id: 'adaptaciones-tempranas',
        title: 'Simple adaptations',
        blocks: [
          { kind: 'list', items: [
            'Preview changes with pictures or short notices.',
            'A calm-down corner for self-regulation.',
            'Short instructions and one thing at a time.',
            'A flexible settling-in period at the start.',
          ] },
        ],
      },
    ],
  },
  {
    id: 'E',
    slug: 'rights-and-first-supports',
    icon: 'scale',
    title: 'Rights and first supports',
    area: 'Early-intervention routes and rights',
    summary: 'What you are entitled to and how to start supports.',
    sections: [
      {
        id: 'derechos-nd',
        title: 'You have the right to…',
        blocks: [
          { kind: 'list', variant: 'check', items: [
            'Developmental surveillance at every health check-up.',
            'Clear information, free of jargon, and a second opinion.',
            'Early-intervention services when needed.',
            'Educational inclusion from the earliest years.',
          ] },
          { kind: 'callout', tone: 'calm', title: 'No blame', text: 'Seeking support early is an act of care, not a sign of failure. The sooner, the easier it usually is to accompany.' },
        ],
      },
      {
        id: 'rutas',
        title: 'How to start',
        blocks: [
          { kind: 'steps', items: [
            'Write down your observations and questions before the visit (use the log).',
            'Talk with your pediatrician or health center about developmental surveillance.',
            'Ask, if appropriate, for an early-intervention assessment.',
            'Gather the directory of supports in your area and keep every report.',
          ] },
          { kind: 'glossary', items: [
            { term: 'Early intervention', plain: 'A program of supports in the first years, ideally in natural settings (home, school).' },
            { term: 'Report', plain: 'A document summarizing observations and recommendations; keep it — it helps with paperwork.' },
            { term: 'Inclusion', plain: 'The setting adapting to the child, not the other way around.' },
          ] },
          { kind: 'resource', file: '/kit/nd/en/directorio-apoyos.pdf', label: 'First-supports directory', description: 'A template to organize contacts, appointments and reports in one place.' },
        ],
      },
    ],
  },
];
