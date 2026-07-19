import type { ToolkitModule } from './types';

export const MODULES: ToolkitModule[] = [
  {
    "id": "A",
    "slug": "gestion-clinico-medica",
    "icon": "stethoscope",
    "title": "Clinical & medical management",
    "area": "Development & health specialists",
    "summary": "Understand terms, observe calmly and know who to turn to.",
    "sections": [
      {
        "id": "glosario",
        "title": "Plain-language glossary",
        "blocks": [
          {
            "kind": "lead",
            "text": "Some words can sound big or cold. Here we explain them calmly: they describe processes and supports, never who your child is."
          },
          {
            "kind": "glossary",
            "items": [
              {
                "term": "Assessment",
                "plain": "A series of meetings to learn how someone learns, communicates and relates. It is not a test you pass or fail."
              },
              {
                "term": "Diagnosis",
                "plain": "A name that helps guide supports. It describes a way of functioning; it does not reduce the person."
              },
              {
                "term": "Neurodivergence",
                "plain": "A different —not lesser— way of perceiving, thinking and feeling."
              },
              {
                "term": "Sensory integration",
                "plain": "Support so the senses work more calmly and daily life feels more comfortable."
              },
              {
                "term": "Referral",
                "plain": "When a professional suggests adding another specialist to the team."
              },
              {
                "term": "Baseline",
                "plain": "A snapshot of the starting point to notice progress over time."
              },
              {
                "term": "Professional license",
                "plain": "The record confirming a professional is credentialed."
              },
              {
                "term": "Standardized tests",
                "plain": "Support tools: one part of the story, never the whole."
              }
            ]
          },
          {
            "kind": "callout",
            "tone": "calm",
            "title": "Remember",
            "text": "You can ask to have any term explained as many times as you need. A good team will gladly do so."
          }
        ]
      },
      {
        "id": "bitacora-abc",
        "title": "ABC observation log",
        "blocks": [
          {
            "kind": "lead",
            "text": "The ABC log is a simple way to observe without judging. It helps find patterns and lets the team support you better."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "A — Antecedent: what was happening just before (place, people, activity, changes).",
              "B — Behavior: what you observed, in neutral, concrete words, without labels.",
              "C — Consequence: what happened afterward and how the situation calmed down."
            ]
          },
          {
            "kind": "steps",
            "items": [
              "Note little and soon: a few lines in the moment beat a perfect text later.",
              "Describe what you would see in a video, not what you imagine they felt.",
              "After several entries, look for patterns: recurring times, settings or triggers.",
              "Bring the log to appointments: it is a gift of information for the team."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "No blame",
            "text": "The log is not about “behaving well”. It is about understanding needs to respond with more calm and care."
          },
          {
            "kind": "resource",
            "file": "/kit/en/bitacora-abc.pdf",
            "label": "Observation log (ABC)",
            "description": "Printable template to record antecedents, behavior and consequences."
          }
        ]
      },
      {
        "id": "matriz",
        "title": "Specialties matrix",
        "blocks": [
          {
            "kind": "p",
            "text": "Each need usually has a type of professional who supports it best. This matrix is a compass, not a rule: support often works as a team."
          },
          {
            "kind": "table",
            "columns": [
              "What you observe",
              "Who usually supports",
              "How it helps"
            ],
            "rows": [
              [
                "Language & communication",
                "Speech therapy",
                "Speech, comprehension and alternative communication."
              ],
              [
                "Autonomy & daily life",
                "Occupational therapy",
                "Dressing, eating, writing and sensory regulation."
              ],
              [
                "Movement & posture",
                "Physiotherapy",
                "Strength, balance and coordination."
              ],
              [
                "Emotions & bonding",
                "Psychology",
                "Emotional regulation and strategies for home."
              ],
              [
                "School learning",
                "Learning support / Special ed.",
                "Study strategies and accommodations."
              ],
              [
                "Sleep, feeding & health",
                "Pediatrics / Neuropediatrics",
                "Medical and developmental follow-up."
              ]
            ],
            "caption": "General guidance on where to start."
          },
          {
            "kind": "resource",
            "file": "/kit/en/matriz-especialidades.pdf",
            "label": "Specialties matrix",
            "description": "Table to identify which professional supports each need."
          },
          {
            "kind": "resource",
            "file": "/kit/en/glosario.pdf",
            "label": "Plain-language glossary",
            "description": "The most common terms, explained in plain words."
          }
        ]
      }
    ]
  },
  {
    "id": "B",
    "slug": "adaptacion-educativa",
    "icon": "graduation",
    "title": "Educational adaptation",
    "area": "Inclusive schools & centers",
    "summary": "Build bridges with school and learn about access supports.",
    "sections": [
      {
        "id": "carta",
        "title": "School–Family communication",
        "blocks": [
          {
            "kind": "lead",
            "text": "School and family are one team with a shared goal: that your child learns and feels at ease. Clear, kind communication opens doors."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Start by acknowledging what already works; it’s easier to build from there.",
              "Share what helps at home: concrete tips save everyone time.",
              "Ask for and give observable examples, not labels.",
              "Agree on a channel and contact frequency that are sustainable.",
              "Close each agreement with who does what and by when."
            ]
          },
          {
            "kind": "callout",
            "tone": "calm",
            "title": "Your voice matters",
            "text": "No one knows your child like you. Your view is valuable information for the teaching team."
          },
          {
            "kind": "resource",
            "file": "/kit/en/carta-escuela-familia.pdf",
            "label": "School–Family letter template",
            "description": "Editable model to present needs and supports clearly and warmly."
          }
        ]
      },
      {
        "id": "adecuaciones",
        "title": "Common access accommodations",
        "blocks": [
          {
            "kind": "p",
            "text": "Access accommodations remove barriers so a person can show what they know. They don’t lower expectations: they level the ground."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Extra time to respond or finish tasks.",
              "Short instructions, one at a time, with visual support.",
              "A place with fewer distractions or the use of headphones.",
              "Agreed movement breaks, not experienced as punishment.",
              "Options to show learning (oral, drawing, project).",
              "Anticipate routine changes with notice and visual supports."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "Start small",
            "text": "Pick one or two accommodations, try for a few weeks and adjust. Small, steady changes make the difference."
          },
          {
            "kind": "resource",
            "file": "/kit/en/adecuaciones-acceso.pdf",
            "label": "Access accommodations checklist",
            "description": "List to review and agree on supports with the school."
          }
        ]
      }
    ]
  },
  {
    "id": "C",
    "slug": "regulacion-sensorial-entorno",
    "icon": "waves",
    "title": "Sensory regulation & environment",
    "area": "Occupational therapy & gentle spaces",
    "summary": "Read sensory needs and create predictable spaces.",
    "sections": [
      {
        "id": "necesidades",
        "title": "Recognizing sensory needs",
        "blocks": [
          {
            "kind": "lead",
            "text": "Everyone experiences sounds, lights, textures or movement in their own way. Recognizing those needs is the first act of care."
          },
          {
            "kind": "p",
            "text": "Some receive too much from a sense (hyper-reactivity) and others need more to feel present (hypo-reactivity). Both are valid."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "Covers ears, squints or avoids certain textures or foods.",
              "Seeks movement, pressure or rocking to calm down.",
              "Gets overwhelmed in loud, crowded or brightly lit places.",
              "Finds it hard to “return to calm” after overload."
            ]
          },
          {
            "kind": "callout",
            "tone": "care",
            "title": "Not tantrums",
            "text": "Covering ears or needing to move isn’t misbehaving: it’s the body asking to regulate. Accompanying is worth more than correcting."
          }
        ]
      },
      {
        "id": "entorno",
        "title": "Adapting the environment",
        "blocks": [
          {
            "kind": "p",
            "text": "It’s not about a perfect home, but a predictable, kind environment. Small tweaks reduce everyone’s stress."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Warm, dimmable light; avoid flicker and harsh glare.",
              "Lower background noise; keep headphones or earplugs handy if they help.",
              "Offer comfortable textures and clothes; respect those they can’t tolerate.",
              "Preview the day with routines and visual supports.",
              "Keep regulation objects handy (weighted toy, ball, chewy)."
            ]
          },
          {
            "kind": "p",
            "text": "A “calm corner” is a small, cozy space to go to and slow down, without it being a punishment."
          },
          {
            "kind": "steps",
            "items": [
              "Choose a quiet corner with low light and noise.",
              "Add soft textures, a cushion and a favorite regulation object.",
              "Present it as a kind place, available whenever needed.",
              "Be present without demanding talk: sometimes just being near is enough."
            ]
          },
          {
            "kind": "resource",
            "file": "/kit/en/perfil-sensorial.pdf",
            "label": "Sensory profile & environment plan",
            "description": "Guide to record sensory preferences and plan home adjustments."
          }
        ]
      }
    ]
  },
  {
    "id": "D",
    "slug": "soporte-emocional",
    "icon": "hearthands",
    "title": "Emotional support",
    "area": "Support for caregivers & families",
    "summary": "Care for the caregiver and support siblings too.",
    "sections": [
      {
        "id": "contencion",
        "title": "Support for caregivers",
        "blocks": [
          {
            "kind": "lead",
            "text": "You accompany with all your love, and that tires you too. Caring for yourself isn’t selfish: it sustains the care of your family."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "Tiredness that doesn’t lift with rest.",
              "Irritability, easy tears or feeling on “autopilot”.",
              "Setting aside your own needs, bonds or breaks.",
              "Guilt for resting or for feeling what you feel."
            ]
          },
          {
            "kind": "steps",
            "items": [
              "Set aside small, real breaks, even ten minutes.",
              "Lean on your network: sharing care is also caring.",
              "Talk about your feelings with someone you trust or a professional.",
              "Celebrate small wins, yours and your child’s."
            ]
          },
          {
            "kind": "callout",
            "tone": "care",
            "title": "Asking for help is caring",
            "text": "You don’t have to manage everything alone. Seeking support is a form of strength, not failure."
          },
          {
            "kind": "resource",
            "file": "/kit/en/contencion-cuidadores.pdf",
            "label": "Caregiver support guide",
            "description": "Signs of burnout and gentle self-care and support-network strategies."
          }
        ]
      },
      {
        "id": "hermanos",
        "title": "Explaining to siblings",
        "blocks": [
          {
            "kind": "lead",
            "text": "Siblings also feel, ask and need a place. Explaining honestly and tenderly strengthens the whole family’s bonds."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "Use simple, age-appropriate words; answer what they ask.",
              "Validate their emotions: they may feel love, jealousy or anger, and that’s okay.",
              "Explain that fairness isn’t giving the same, but what each one needs.",
              "Invite them to take part without adult responsibilities.",
              "Give them one-on-one time with you: they need to feel seen too."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "A conversation, not a speech",
            "text": "You don’t need to explain everything at once. It’s a dialogue that grows over time and with their questions."
          },
          {
            "kind": "resource",
            "file": "/kit/en/explicar-hermanos.pdf",
            "label": "Guide for explaining to siblings",
            "description": "Age-by-age ideas and supportive phrases for family talks."
          }
        ]
      }
    ]
  },
  {
    "id": "E",
    "slug": "derechos-y-tramites",
    "icon": "scale",
    "title": "Rights & procedures",
    "area": "Guidance on rights & supports",
    "summary": "Know your rights and available supports, in plain language.",
    "sections": [
      {
        "id": "derechos",
        "title": "Your rights, in plain terms",
        "blocks": [
          {
            "kind": "lead",
            "text": "Knowing rights brings calm and firmness to support. Here are some, in plain language, that usually apply."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Inclusive education: learning with peers, with needed supports.",
              "Non-discrimination: no one may be excluded for how they are or function.",
              "Reasonable adjustments: adaptations to take part on equal terms.",
              "Participation: being heard and considered in decisions that affect them.",
              "Accessible information: receiving clear, understandable explanations."
            ]
          },
          {
            "kind": "callout",
            "tone": "calm",
            "title": "General guidance",
            "text": "Names and requirements vary by country or region. Always confirm with the authority or a trusted local association."
          }
        ]
      },
      {
        "id": "tramites",
        "title": "Common procedures & supports",
        "blocks": [
          {
            "kind": "p",
            "text": "Each place has its processes, but many supports are alike. This guide helps you know where to start."
          },
          {
            "kind": "table",
            "columns": [
              "Support",
              "Usually helps with",
              "Usually handled at"
            ],
            "rows": [
              [
                "Disability certificate",
                "Access supports and adjustments",
                "Public health or local authority"
              ],
              [
                "Educational assessment report",
                "Request school accommodations",
                "School or credentialed professional"
              ],
              [
                "Grants or financial aid",
                "Therapies, materials or transport",
                "Social or educational programs"
              ],
              [
                "Legal guidance",
                "Clarify questions about rights",
                "Associations or legal services"
              ]
            ]
          },
          {
            "kind": "steps",
            "items": [
              "Gather basic documents: ID, reports and assessments.",
              "Ask for up-to-date requirements before going; it saves trips.",
              "Keep copies of everything you submit and receive.",
              "Lean on local associations: they know the way and support you."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "Not legal advice",
            "text": "This section is informational and supportive. For your specific case, seek professional guidance locally."
          },
          {
            "kind": "resource",
            "file": "/kit/en/tramites-apoyos.pdf",
            "label": "Procedures & supports checklist",
            "description": "Steps and documents to organize your paperwork calmly."
          }
        ]
      }
    ]
  }
];
