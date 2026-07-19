import type { ToolkitModule } from './types';

export const MODULES: ToolkitModule[] = [
  {
    "id": "A",
    "slug": "gestion-clinico-medica",
    "icon": "stethoscope",
    "title": "Gestion clinique et médicale",
    "area": "Spécialistes du développement et de la santé",
    "summary": "Comprendre les mots, observer avec calme et savoir vers qui se tourner.",
    "sections": [
      {
        "id": "glosario",
        "title": "Glossaire démystifié",
        "blocks": [
          {
            "kind": "lead",
            "text": "Certains mots peuvent sembler grands ou froids. Ici, on les explique avec calme : ils décrivent des processus et des soutiens, jamais qui est votre enfant."
          },
          {
            "kind": "glossary",
            "items": [
              {
                "term": "Évaluation",
                "plain": "Une série de rencontres pour comprendre comment la personne apprend, communique et interagit. Ce n’est pas un examen qu’on réussit ou rate."
              },
              {
                "term": "Diagnostic",
                "plain": "Un nom qui aide à orienter les soutiens. Il décrit une façon de fonctionner ; il ne réduit pas la personne."
              },
              {
                "term": "Neurodivergence",
                "plain": "Une façon différente — non inférieure — de percevoir, penser et ressentir."
              },
              {
                "term": "Intégration sensorielle",
                "plain": "Un accompagnement pour que les sens travaillent plus sereinement et que le quotidien soit plus confortable."
              },
              {
                "term": "Orientation ou renvoi",
                "plain": "Quand un professionnel propose d’ajouter un autre spécialiste à l’équipe."
              },
              {
                "term": "Ligne de base",
                "plain": "Une photo du point de départ pour observer les progrès dans le temps."
              },
              {
                "term": "Diplôme professionnel",
                "plain": "L’enregistrement qui confirme qu’un professionnel est accrédité."
              },
              {
                "term": "Tests standardisés",
                "plain": "Des outils d’appui : une partie de l’histoire, jamais toute."
              }
            ]
          },
          {
            "kind": "callout",
            "tone": "calm",
            "title": "À retenir",
            "text": "Vous pouvez demander qu’on vous explique n’importe quel terme autant de fois que nécessaire. Une bonne équipe le fera volontiers."
          }
        ]
      },
      {
        "id": "bitacora-abc",
        "title": "Guide du journal ABC",
        "blocks": [
          {
            "kind": "lead",
            "text": "Le journal ABC est une manière simple d’observer sans juger. Il aide à repérer des schémas et à mieux vous accompagner."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "A — Antécédent : ce qui se passait juste avant (lieu, personnes, activité, changements).",
              "B — Comportement : ce que vous avez observé, en mots neutres et concrets, sans étiquettes.",
              "C — Conséquence : ce qui s’est passé après et comment la situation s’est apaisée."
            ]
          },
          {
            "kind": "steps",
            "items": [
              "Notez peu et vite : quelques lignes sur le moment valent mieux qu’un texte parfait plus tard.",
              "Décrivez ce que vous verriez dans une vidéo, pas ce que vous imaginez qu’il a ressenti.",
              "Après plusieurs notes, cherchez des schémas : horaires, contextes ou déclencheurs récurrents.",
              "Apportez le journal aux rendez-vous : c’est un cadeau d’informations pour l’équipe."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "Sans culpabilité",
            "text": "Le journal ne vise pas à « bien se comporter ». Il vise à comprendre les besoins pour répondre avec plus de calme et de soin."
          },
          {
            "kind": "resource",
            "file": "/kit/fr/bitacora-abc.pdf",
            "label": "Journal d’observation (ABC)",
            "description": "Modèle imprimable pour noter antécédents, comportement et conséquences."
          }
        ]
      },
      {
        "id": "matriz",
        "title": "Matrice des spécialités",
        "blocks": [
          {
            "kind": "p",
            "text": "Chaque besoin a souvent un type de professionnel qui l’accompagne le mieux. Cette matrice est une boussole, pas une règle : le soutien se fait souvent en équipe."
          },
          {
            "kind": "table",
            "columns": [
              "Ce que vous observez",
              "Qui accompagne souvent",
              "En quoi cela aide"
            ],
            "rows": [
              [
                "Langage et communication",
                "Orthophonie",
                "Parole, compréhension et communication alternative."
              ],
              [
                "Autonomie et quotidien",
                "Ergothérapie",
                "S’habiller, manger, écrire et régulation sensorielle."
              ],
              [
                "Mouvement et posture",
                "Kinésithérapie",
                "Force, équilibre et coordination."
              ],
              [
                "Émotions et lien",
                "Psychologie",
                "Régulation émotionnelle et stratégies pour la maison."
              ],
              [
                "Apprentissages scolaires",
                "Pédagogie / Éducation spécialisée",
                "Stratégies d’étude et aménagements."
              ],
              [
                "Sommeil, alimentation et santé",
                "Pédiatrie / Neuropédiatrie",
                "Suivi médical et du développement."
              ]
            ],
            "caption": "Orientation générale pour savoir par où commencer."
          },
          {
            "kind": "resource",
            "file": "/kit/fr/matriz-especialidades.pdf",
            "label": "Matrice des spécialités",
            "description": "Tableau pour identifier quel professionnel accompagne chaque besoin."
          },
          {
            "kind": "resource",
            "file": "/kit/fr/glosario.pdf",
            "label": "Glossaire démystifié",
            "description": "Les termes les plus courants, expliqués simplement."
          }
        ]
      }
    ]
  },
  {
    "id": "B",
    "slug": "adaptacion-educativa",
    "icon": "graduation",
    "title": "Adaptation scolaire",
    "area": "Écoles et centres inclusifs",
    "summary": "Créer des ponts avec l’école et connaître les aménagements d’accès.",
    "sections": [
      {
        "id": "carta",
        "title": "Communication École–Famille",
        "blocks": [
          {
            "kind": "lead",
            "text": "L’école et la famille forment une même équipe avec un but commun : que votre enfant apprenne et se sente bien. Une communication claire et bienveillante ouvre des portes."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Commencez par reconnaître ce qui marche déjà ; il est plus facile d’avancer.",
              "Partagez ce qui aide à la maison : des pistes concrètes font gagner du temps.",
              "Demandez et donnez des exemples observables, pas des étiquettes.",
              "Convenez d’un canal et d’une fréquence de contact tenables.",
              "Terminez chaque accord par qui fait quoi et pour quand."
            ]
          },
          {
            "kind": "callout",
            "tone": "calm",
            "title": "Votre voix compte",
            "text": "Personne ne connaît votre enfant comme vous. Votre regard est une information précieuse pour l’équipe enseignante."
          },
          {
            "kind": "resource",
            "file": "/kit/fr/carta-escuela-familia.pdf",
            "label": "Modèle de lettre École–Famille",
            "description": "Modèle modifiable pour présenter besoins et soutiens avec clarté et cordialité."
          }
        ]
      },
      {
        "id": "adecuaciones",
        "title": "Aménagements d’accès courants",
        "blocks": [
          {
            "kind": "p",
            "text": "Les aménagements d’accès lèvent des obstacles pour que la personne montre ce qu’elle sait. Ils n’abaissent pas les attentes : ils égalisent le terrain."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Temps supplémentaire pour répondre ou terminer.",
              "Consignes courtes, une à la fois, avec appui visuel.",
              "Un endroit avec moins de distractions ou l’usage d’un casque.",
              "Des pauses mouvement convenues, vécues sans punition.",
              "Des options pour montrer les acquis (oral, dessin, projet).",
              "Anticiper les changements de routine avec préavis et appuis visuels."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "Commencez petit",
            "text": "Choisissez un ou deux aménagements, essayez quelques semaines et ajustez. Les petits changements durables font la différence."
          },
          {
            "kind": "resource",
            "file": "/kit/fr/adecuaciones-acceso.pdf",
            "label": "Liste des aménagements d’accès",
            "description": "Liste pour examiner et convenir des soutiens avec l’école."
          }
        ]
      }
    ]
  },
  {
    "id": "C",
    "slug": "regulacion-sensorial-entorno",
    "icon": "waves",
    "title": "Régulation sensorielle et environnement",
    "area": "Ergothérapie et environnements apaisants",
    "summary": "Lire les besoins sensoriels et créer des espaces prévisibles.",
    "sections": [
      {
        "id": "necesidades",
        "title": "Reconnaître les besoins sensoriels",
        "blocks": [
          {
            "kind": "lead",
            "text": "Chaque personne vit les sons, lumières, textures ou mouvements à sa façon. Reconnaître ces besoins est le premier geste de soin."
          },
          {
            "kind": "p",
            "text": "Certaines reçoivent trop d’un sens (hyperréactivité), d’autres en ont besoin de plus (hyporéactivité). Les deux sont valables."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "Se bouche les oreilles, plisse les yeux ou évite certaines textures ou aliments.",
              "Recherche mouvement, pression ou balancement pour se calmer.",
              "Se sent débordé dans les lieux bruyants, bondés ou très éclairés.",
              "A du mal à « revenir au calme » après une surcharge."
            ]
          },
          {
            "kind": "callout",
            "tone": "care",
            "title": "Pas des caprices",
            "text": "Se boucher les oreilles ou avoir besoin de bouger n’est pas mal se comporter : c’est le corps qui demande à se réguler. Accompagner vaut mieux que corriger."
          }
        ]
      },
      {
        "id": "entorno",
        "title": "Adapter l’environnement",
        "blocks": [
          {
            "kind": "p",
            "text": "Il ne s’agit pas d’un foyer parfait, mais d’un environnement prévisible et bienveillant. De petits ajustements réduisent le stress de tous."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Lumière chaude et réglable ; évitez scintillements et reflets forts.",
              "Réduisez le bruit de fond ; gardez un casque ou des bouchons si utiles.",
              "Proposez des textures et vêtements confortables ; respectez ce qui est intolérable.",
              "Anticipez la journée avec routines et appuis visuels.",
              "Gardez des objets de régulation (peluche lestée, balle, mâchouilleur)."
            ]
          },
          {
            "kind": "p",
            "text": "Un « coin calme » est un petit espace douillet où venir ralentir, sans que ce soit une punition."
          },
          {
            "kind": "steps",
            "items": [
              "Choisissez un coin tranquille, peu éclairé et peu bruyant.",
              "Ajoutez des textures douces, un coussin et un objet de régulation préféré.",
              "Présentez-le comme un lieu bienveillant, disponible au besoin.",
              "Accompagnez sans exiger de parler : parfois, être proche suffit."
            ]
          },
          {
            "kind": "resource",
            "file": "/kit/fr/perfil-sensorial.pdf",
            "label": "Profil sensoriel et plan d’environnement",
            "description": "Guide pour noter les préférences sensorielles et planifier des ajustements à la maison."
          }
        ]
      }
    ]
  },
  {
    "id": "D",
    "slug": "soporte-emocional",
    "icon": "hearthands",
    "title": "Soutien émotionnel",
    "area": "Accompagnement des aidants et familles",
    "summary": "Prendre soin de l’aidant et accompagner aussi la fratrie.",
    "sections": [
      {
        "id": "contencion",
        "title": "Soutien aux aidants",
        "blocks": [
          {
            "kind": "lead",
            "text": "Vous accompagnez avec tout votre amour, et cela fatigue aussi. Prendre soin de vous n’est pas égoïste : cela soutient le soin de votre famille."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "Une fatigue qui ne part pas avec le repos.",
              "Irritabilité, larmes faciles ou impression d’être en « pilote automatique ».",
              "Mettre de côté vos besoins, liens ou pauses.",
              "Culpabilité de se reposer ou de ressentir ce que vous ressentez."
            ]
          },
          {
            "kind": "steps",
            "items": [
              "Réservez de petites pauses réelles, même de dix minutes.",
              "Appuyez-vous sur votre réseau : partager le soin, c’est aussi prendre soin.",
              "Parlez de ce que vous ressentez à une personne de confiance ou un professionnel.",
              "Célébrez les petits progrès, les vôtres et ceux de votre enfant."
            ]
          },
          {
            "kind": "callout",
            "tone": "care",
            "title": "Demander de l’aide, c’est prendre soin",
            "text": "Vous n’avez pas à tout gérer seul·e. Chercher du soutien est une force, pas un échec."
          },
          {
            "kind": "resource",
            "file": "/kit/fr/contencion-cuidadores.pdf",
            "label": "Guide de soutien aux aidants",
            "description": "Signes d’épuisement et stratégies douces d’auto-soin et de réseau."
          }
        ]
      },
      {
        "id": "hermanos",
        "title": "Expliquer à la fratrie",
        "blocks": [
          {
            "kind": "lead",
            "text": "La fratrie ressent aussi, pose des questions et a besoin d’une place. Expliquer avec honnêteté et tendresse renforce les liens de toute la famille."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "Employez des mots simples et adaptés à l’âge ; répondez à leurs questions.",
              "Validez leurs émotions : amour, jalousie ou colère, c’est normal.",
              "Expliquez que l’équité, ce n’est pas donner pareil, mais ce dont chacun a besoin.",
              "Invitez-les à participer sans leur confier des responsabilités d’adulte.",
              "Offrez-leur des moments seuls avec vous : ils ont aussi besoin d’être vus."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "Une conversation, pas un discours",
            "text": "Pas besoin de tout expliquer d’un coup. C’est un dialogue qui grandit avec le temps et leurs questions."
          },
          {
            "kind": "resource",
            "file": "/kit/fr/explicar-hermanos.pdf",
            "label": "Guide pour expliquer à la fratrie",
            "description": "Idées par âge et phrases d’appui pour discuter en famille."
          }
        ]
      }
    ]
  },
  {
    "id": "E",
    "slug": "derechos-y-tramites",
    "icon": "scale",
    "title": "Droits et démarches",
    "area": "Orientation sur droits et aides",
    "summary": "Connaître vos droits et les aides disponibles, en langage clair.",
    "sections": [
      {
        "id": "derechos",
        "title": "Vos droits, clairement",
        "blocks": [
          {
            "kind": "lead",
            "text": "Connaître les droits apporte sérénité et fermeté pour accompagner. En voici, en langage simple, qui s’appliquent souvent."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Éducation inclusive : apprendre avec ses pairs, avec les soutiens nécessaires.",
              "Non-discrimination : nul ne peut être exclu pour sa façon d’être ou de fonctionner.",
              "Aménagements raisonnables : adaptations pour participer à égalité.",
              "Participation : être écouté et pris en compte dans les décisions qui le concernent.",
              "Information accessible : recevoir des explications claires et compréhensibles."
            ]
          },
          {
            "kind": "callout",
            "tone": "calm",
            "title": "Orientation générale",
            "text": "Les noms et conditions varient selon le pays ou la région. Vérifiez toujours auprès de l’autorité ou d’une association locale de confiance."
          }
        ]
      },
      {
        "id": "tramites",
        "title": "Démarches et aides courantes",
        "blocks": [
          {
            "kind": "p",
            "text": "Chaque endroit a ses procédures, mais beaucoup d’aides se ressemblent. Ce guide aide à savoir par où commencer."
          },
          {
            "kind": "table",
            "columns": [
              "Aide",
              "Sert souvent à",
              "Où le faire"
            ],
            "rows": [
              [
                "Certificat de handicap",
                "Accéder aux aides et aménagements",
                "Santé publique ou autorité locale"
              ],
              [
                "Bilan psychopédagogique",
                "Demander des aménagements scolaires",
                "École ou professionnel accrédité"
              ],
              [
                "Bourses ou aides financières",
                "Thérapies, matériel ou transport",
                "Programmes sociaux ou éducatifs"
              ],
              [
                "Orientation juridique",
                "Clarifier des questions de droits",
                "Associations ou services juridiques"
              ]
            ]
          },
          {
            "kind": "steps",
            "items": [
              "Rassemblez les documents de base : pièce d’identité, bilans et évaluations.",
              "Demandez les conditions à jour avant d’y aller ; cela évite des trajets.",
              "Conservez des copies de tout ce que vous remettez et recevez.",
              "Appuyez-vous sur les associations locales : elles connaissent le chemin."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "Pas un conseil juridique",
            "text": "Cette section est informative et d’accompagnement. Pour votre cas précis, cherchez un conseil professionnel local."
          },
          {
            "kind": "resource",
            "file": "/kit/fr/tramites-apoyos.pdf",
            "label": "Liste des démarches et aides",
            "description": "Étapes et documents pour organiser vos démarches sereinement."
          }
        ]
      }
    ]
  }
];
