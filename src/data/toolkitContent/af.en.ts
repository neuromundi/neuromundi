import type { ToolkitModule } from './types';

/**
 * Tools — NEUROLOGICAL CONDITIONS section (English).
 * For people and families living with diseases of the nervous system. Reference
 * base: WHO — ICD-11 Ch.08 and the Intersectoral Global Action Plan on epilepsy
 * and other neurological disorders (IGAP). General, supportive guidance; it does
 * NOT replace your medical team's instructions or emergency services.
 */
export const MODULES: ToolkitModule[] = [
  {
    id: 'A',
    slug: 'understanding-the-condition',
    icon: 'stethoscope',
    title: 'Understanding the condition',
    area: 'Clear information and a well-used consultation',
    summary: 'Words without fear and questions that order the path.',
    sections: [
      {
        id: 'glosario-af',
        title: 'A glossary without fear',
        blocks: [
          { kind: 'lead', text: 'Some terms sound big. Here we tell them calmly: they describe processes and supports, they do not define who you or your relative are.' },
          {
            kind: 'glossary',
            items: [
              { term: 'Neurological condition', plain: 'A condition of the nervous system (brain, spinal cord or nerves). Many are accompanied and quality of life improves with support.' },
              { term: 'Neurology', plain: 'The medical specialty that studies and treats these conditions.' },
              { term: 'Rehabilitation', plain: 'Therapies to recover or compensate functions and gain autonomy.' },
              { term: 'Chronic', plain: 'Something that stays for a long time; it is managed, cared for and lived with.' },
              { term: 'Palliative care', plain: 'Support focused on well-being and easing discomfort; it adds quality of life at any stage.' },
              { term: 'Adherence', plain: 'Following the agreed plan (medication, therapies, check-ups) consistently.' },
            ],
          },
        ],
      },
      {
        id: 'consulta',
        title: 'Making the most of the visit',
        blocks: [
          { kind: 'p', text: 'Time with the medical team is precious. Arriving with written questions helps you not forget what matters.' },
          { kind: 'list', variant: 'check', items: [
            'What is the condition called and what does it mean day to day?',
            'What signs should I watch for, and which are urgent?',
            'What is each medication for and what effects should I expect?',
            'Which therapies help, and how often?',
            'Who do I call with a question or during a crisis?',
          ] },
          { kind: 'callout', tone: 'tip', title: 'Bring someone', text: 'Four ears hear better than two. Ask for written summaries and don\'t hesitate to say "could you put it another way?".' },
        ],
      },
      {
        id: 'organizar',
        title: 'Organizing the information',
        blocks: [
          { kind: 'p', text: 'A single folder — physical or digital — with reports, tests, medication and contacts avoids repeating your story and speeds up every visit.' },
          { kind: 'resource', file: '/kit/af/en/carpeta-de-salud.pdf', label: 'Health folder', description: 'A template to gather diagnoses, tests, medication and key contacts.' },
        ],
      },
    ],
  },
  {
    id: 'B',
    slug: 'rehabilitation-and-therapies',
    icon: 'activity',
    title: 'Rehabilitation and therapies',
    area: 'Recovering and compensating functions',
    summary: 'Kind consistency, realistic goals and practice at home.',
    sections: [
      {
        id: 'tipos',
        title: 'Types of rehabilitation',
        blocks: [
          {
            kind: 'table',
            columns: ['Therapy', 'What it helps with'],
            rows: [
              ['Physiotherapy / neurorehabilitation', 'Strength, balance, gait and mobility.'],
              ['Occupational therapy', 'Activities of daily living and autonomy.'],
              ['Speech and language therapy', 'Communication, voice and swallowing.'],
              ['Neuropsychology', 'Memory, attention and executive functions.'],
              ['Cognitive rehabilitation', 'Strategies to think and organize better.'],
            ],
          },
        ],
      },
      {
        id: 'constancia',
        title: 'Goals and consistency',
        blocks: [
          { kind: 'steps', items: [
            'Agree small, measurable goals with the team ("walk 10 meters with support").',
            'Spread practice into short, frequent doses rather than exhausting sessions.',
            'Record progress and plateaus: plateaus are part of the process, not a failure.',
            'Celebrate each achievement and adjust goals with the team.',
          ] },
          { kind: 'callout', tone: 'calm', title: 'Your own pace', text: 'Recovery is not linear. Good days and harder days coexist; kind consistency yields more than pressure.' },
        ],
      },
      {
        id: 'en-casa',
        title: 'Practicing at home',
        blocks: [
          { kind: 'list', items: [
            'Do the exercises indicated by the team, without improvising extra ones.',
            'Weave practice into real routines: dressing, cooking, walking to the yard.',
            'Mind safety: clear spaces and firm footwear.',
          ] },
          { kind: 'resource', file: '/kit/af/en/registro-de-terapias.pdf', label: 'Therapy log', description: 'A weekly log of exercises, progress and questions for the next session.' },
        ],
      },
    ],
  },
  {
    id: 'C',
    slug: 'daily-care-at-home',
    icon: 'hearthands',
    title: 'Daily care at home',
    area: 'Everyday well-being and safety',
    summary: 'Safe medication, mobility, nutrition and rest.',
    sections: [
      {
        id: 'medicacion',
        title: 'Safe medication',
        blocks: [
          { kind: 'list', variant: 'check', items: [
            'Respect times and doses; use alarms or a weekly pill organizer.',
            'Do not stop or change doses without consulting: some drugs need gradual adjustment.',
            'Note any effects you notice and mention them at the next visit.',
            'Keep an up-to-date medication list always at hand.',
          ] },
          { kind: 'callout', tone: 'care', title: 'Changes, with the team', text: 'Stopping certain medications abruptly — for example, some antiseizure drugs — can be risky. Any change should be agreed with your doctor.' },
        ],
      },
      {
        id: 'movilidad',
        title: 'Mobility and fall prevention',
        blocks: [
          { kind: 'list', items: [
            'Remove loose rugs and cables; add good lighting.',
            'Support rails in the bathroom and hallways if needed.',
            'Use the indicated aids (cane, walker) without shame: they give freedom.',
            'Frequent position changes if a lot of time is spent in bed or a chair.',
          ] },
        ],
      },
      {
        id: 'alimentacion-descanso',
        title: 'Nutrition, skin and rest',
        blocks: [
          { kind: 'p', text: 'If there is difficulty swallowing (dysphagia), follow the guidance on textures and position while eating, and consult if there is frequent coughing or choking.' },
          { kind: 'list', items: [
            'Mind hydration and a diet adapted to the guidance.',
            'Check the skin at pressure areas to prevent sores.',
            'Protect sleep: stable schedules and a calm environment.',
          ] },
          { kind: 'resource', file: '/kit/af/en/plan-de-cuidados.pdf', label: 'Daily care plan', description: 'A checklist for medication, mobility, nutrition and rest.' },
        ],
      },
    ],
  },
  {
    id: 'D',
    slug: 'warning-signs-and-emergencies',
    icon: 'pulse',
    title: 'Warning signs and emergencies',
    area: 'Acting calmly when it is urgent',
    summary: 'What to watch, how to respond and when to seek urgent help.',
    sections: [
      {
        id: 'cuando-urge',
        title: 'When to seek urgent help',
        blocks: [
          { kind: 'callout', tone: 'care', title: 'When in doubt, call emergency services', text: 'This guide is general and does not replace the plan your team gave you or your country\'s emergency services. If there is a threat to life, call your local emergency number immediately.' },
          { kind: 'list', items: [
            'Sudden weakness in the face, arm or leg, trouble speaking or seeing (possible stroke): act fast, every minute counts.',
            'A seizure lasting more than 5 minutes, or repeated seizures without regaining consciousness.',
            'A sudden, extremely severe headache, unlike the usual.',
            'High fever with a stiff neck or confusion.',
            'Difficulty breathing, choking or loss of consciousness.',
          ] },
        ],
      },
      {
        id: 'crisis',
        title: 'First aid during a seizure',
        blocks: [
          { kind: 'steps', items: [
            'Stay calm and protect: move away objects they could hit.',
            'Place something soft under the head and loosen anything tight around the neck.',
            'Do not restrain them and do not put anything in the mouth.',
            'Turn them onto their side (recovery position) to help breathing.',
            'Time the seizure; if it passes 5 minutes or repeats, call emergency services.',
            'Stay with them until they recover and follow the plan given by their doctor.',
          ] },
          { kind: 'callout', tone: 'calm', title: 'After the seizure', text: 'Drowsiness or confusion afterward is normal. Speak softly, offer reassurance and record what happened for the medical team.' },
        ],
      },
      {
        id: 'kit-emergencia',
        title: 'Preparing in advance',
        blocks: [
          { kind: 'list', variant: 'check', items: [
            'A written action plan from your team (what to do and who to call).',
            'A list of medications and allergies, visible and up to date.',
            'Emergency contacts and the neurologist within reach.',
            'A medical ID document or bracelet if recommended.',
          ] },
          { kind: 'resource', file: '/kit/af/en/plan-de-emergencia.pdf', label: 'Emergency plan', description: 'A card to complete with your team: signs, steps and key contacts.' },
        ],
      },
    ],
  },
  {
    id: 'E',
    slug: 'rights-paperwork-and-supports',
    icon: 'scale',
    title: 'Rights, paperwork and supports',
    area: 'Disability, supports and caring for the caregiver',
    summary: 'What you are entitled to and how to sustain care over time.',
    sections: [
      {
        id: 'derechos-af',
        title: 'You have the right to…',
        blocks: [
          { kind: 'list', variant: 'check', items: [
            'Dignified, continuous health care with clear information.',
            'Rehabilitation and the supports you need.',
            'Accessibility and reasonable adjustments at work and school.',
            'Treatment free from discrimination because of your condition.',
          ] },
          { kind: 'callout', tone: 'calm', title: 'Asking for support is a right', text: 'Disability supports are not a favor: they exist to level opportunities. Learn about those in your country without shame.' },
        ],
      },
      {
        id: 'tramites',
        title: 'Common paperwork',
        blocks: [
          { kind: 'steps', items: [
            'Gather up-to-date medical reports in your health folder.',
            'Check your country\'s disability recognition or certificate and its benefits.',
            'Ask about supports for transport, medication, therapies or income.',
            'Keep a copy of each procedure and its renewal dates.',
          ] },
        ],
      },
      {
        id: 'cuidar-cuidador',
        title: 'Caring for the one who cares',
        blocks: [
          { kind: 'lead', text: 'The well-being of the caregiver holds up everything else. Caring for yourself is not selfishness: it is part of the care.' },
          { kind: 'list', items: [
            'Share tasks and accept help: no one can do it all, always.',
            'Reserve moments of rest and respite, even brief ones.',
            'Look for peer support groups (in Neuromundi you have Neurocamps).',
            'Seek professional help if exhaustion, sadness or anxiety persist.',
          ] },
          { kind: 'resource', file: '/kit/af/en/red-de-apoyo.pdf', label: 'Support-network map', description: 'A template to organize who helps with what and the care hand-offs.' },
        ],
      },
    ],
  },
];
