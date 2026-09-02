import type { ToolkitModule } from './types';

/** Outils — section NEURODÉVELOPPEMENT (français). Orientation générale, bienveillante
 *  et NON diagnostique pour les familles qui accompagnent le développement de l'enfant. */
export const MODULES: ToolkitModule[] = [
  {
    id: 'A', slug: 'jalons-du-developpement', icon: 'sprout',
    title: 'Jalons du développement', area: 'Surveillance du développement précoce',
    summary: 'Quoi observer selon l\'âge, avec calme et sans comparer.',
    sections: [
      { id: 'que-son', title: 'Ce que sont les jalons (et ce qu\'ils ne sont pas)', blocks: [
        { kind: 'lead', text: 'Les jalons sont des repères approximatifs de la façon dont un enfant bouge, communique, joue et entre en relation. Un guide pour accompagner, pas une course ni un examen.' },
        { kind: 'p', text: 'Chaque enfant a son propre rythme. Les tranches d\'âge sont des moyennes : arriver un peu avant ou après est souvent attendu. Ce qui compte, c\'est la trajectoire dans le temps, pas un seul jour.' },
        { kind: 'callout', tone: 'calm', title: 'Une boussole, pas une règle', text: 'Si quelque chose vous inquiète, votre observation compte. Demander un avis tôt n\'« étiquette » personne : cela ouvre des portes vers des soutiens qui facilitent la vie.' },
      ] },
      { id: 'por-edad', title: 'Quoi observer, par domaine', blocks: [
        { kind: 'p', text: 'Quatre domaines grandissent ensemble. Ce tableau donne des exemples de ce qui apparaît souvent et quand il est utile d\'en parler à un professionnel de confiance.' },
        { kind: 'table', columns: ['Domaine', 'Ce qui apparaît souvent', 'À consulter si…'], rows: [
          ['Moteur', 'Tient sa tête, s\'assoit, rampe, marche, manipule des objets.', 'À 12 mois, ne se déplace d\'aucune manière, ou le corps semble très raide ou très mou.'],
          ['Communication', 'Babille, pointe, premiers mots, associe deux mots.', 'À 18 mois, pas de mots avec intention ou pas de pointage pour demander ou montrer.'],
          ['Social et affectif', 'Sourit, cherche le regard, partage l\'attention, imite des gestes.', 'Ne répond pas à son prénom, évite le contact ou perd des acquis.'],
          ['Cognitif et jeu', 'Explore, cherche des objets cachés, joue à faire semblant, résout de petits défis.', 'Pas de jeu de faire-semblant vers 2 ans, ou intérêt très limité à explorer.'],
        ], caption: 'Exemples indicatifs ; les tranches varient selon les sources et les enfants.' },
        { kind: 'callout', tone: 'care', title: 'Un signe à ne pas laisser passer', text: 'Perdre des acquis (cesser de parler, de regarder ou de jouer comme avant) mérite une consultation rapide, sans s\'alarmer.' },
      ] },
      { id: 'glosario-nd', title: 'Des mots qui aident', blocks: [
        { kind: 'glossary', items: [
          { term: 'Surveillance du développement', plain: 'Observer avec tendresse et en continu comment l\'enfant grandit et apprend, à chaque visite de santé.' },
          { term: 'Intervention précoce', plain: 'Ensemble de soutiens des premières années qui renforcent le développement et le lien.' },
          { term: 'Trajectoire', plain: 'La direction des progrès dans le temps ; elle compte plus qu\'une donnée isolée.' },
          { term: 'Stimulation', plain: 'Offrir des expériences du quotidien et du jeu qui invitent à explorer, sans pression.' },
        ] },
        { kind: 'resource', file: '/kit/nd/fr/hitos-por-edad.pdf', label: 'Jalons par âge', description: 'Tableau imprimable par domaines et âges pour votre carnet, avec un espace pour les notes.' },
      ] },
    ],
  },
  {
    id: 'B', slug: 'jeu-et-stimulation', icon: 'blocks',
    title: 'Jeu et stimulation', area: 'Apprendre en jouant au quotidien',
    summary: 'Le jeu est le moteur : des idées simples, sans surstimuler.',
    sections: [
      { id: 'juego-motor', title: 'Le jeu, le meilleur maître', blocks: [
        { kind: 'lead', text: 'Pas besoin de jouets coûteux ni d\'écrans. Le lien, la voix et les objets de la maison suffisent pour apprendre.' },
        { kind: 'list', variant: 'check', items: [
          'Suivez l\'intérêt de l\'enfant : s\'il regarde quelque chose, nommez-le et jouez avec.',
          'Moins, c\'est mieux : peu d\'objets, des tours courts et beaucoup de répétitions.',
          'Nommez ce que vous faites tous les deux : « tu montes la tour », « ça tombe », « encore ».',
          'Attendez et observez : laissez des pauses pour qu\'il réponde à son rythme.',
        ] },
      ] },
      { id: 'ideas-edad', title: 'Idées par étape', blocks: [
        { kind: 'table', columns: ['Étape', 'Jeu simple', 'Ce que cela renforce'], rows: [
          ['0–12 mois', 'Coucou, chansons avec gestes, se regarder dans le miroir.', 'Attention partagée, lien, anticipation.'],
          ['1–2 ans', 'Mettre et sortir des objets, tours, pointer dans les livres.', 'Motricité, premiers mots, cause-effet.'],
          ['2–3 ans', 'Jeu de faire-semblant (nourrir la poupée), encastrements.', 'Langage, imagination, résolution de problèmes.'],
          ['3–5 ans', 'Rôles (magasin, docteur), trier par couleur ou taille.', 'Habiletés sociales, fonctions exécutives.'],
        ] },
        { kind: 'callout', tone: 'tip', title: 'Des routines qui enseignent', text: 'Le bain, les repas et l\'habillage sont précieux : racontez les étapes et offrez de petits choix (« la rouge ou la bleue ? »).' },
      ] },
      { id: 'sin-sobreestimular', title: 'Stimuler sans saturer', blocks: [
        { kind: 'steps', items: [
          'Repérez les signes de fatigue : détourne le visage, s\'agite, se frotte les yeux.',
          'Ralentissez : moins de stimuli, voix douce, un seul jeu.',
          'Offrez du calme avant le sommeil : lumière tamisée, sans écrans, routine prévisible.',
        ] },
        { kind: 'resource', file: '/kit/nd/fr/ideas-de-juego.pdf', label: 'Idées de jeu par âge', description: 'Fiches brèves avec des propositions maison et peu coûteuses.' },
      ] },
    ],
  },
  {
    id: 'C', slug: 'parentalite-respectueuse-et-lien', icon: 'hearthands',
    title: 'Parentalité respectueuse et lien', area: 'Le versant affectif du développement',
    summary: 'Un lien sécurisant est la base sur laquelle tout se construit.',
    sections: [
      { id: 'apego', title: 'Un lien qui rassure', blocks: [
        { kind: 'lead', text: 'Quand un enfant sent qu\'il y a quelqu\'un de disponible et de prévisible, il ose explorer. L\'affection ne « gâte » pas : elle soutient.' },
        { kind: 'p', text: 'Répondre à ses pleurs, nommer ce qu\'il ressent et revenir au calme ensemble : c\'est ainsi qu\'il apprend, peu à peu, à se réguler de l\'intérieur.' },
      ] },
      { id: 'regular-calma', title: 'Accompagner la crise avec calme', blocks: [
        { kind: 'steps', items: [
          'Votre calme d\'abord : respirez ; votre sérénité est contagieuse.',
          'Mettez des mots : « tu es très en colère parce que le jeu est fini ».',
          'Offrez de la proximité, pas un sermon : parfois être à côté suffit.',
          'Quand la vague passe, réparez et revenez à la routine, sans punitions ni étiquettes.',
        ] },
        { kind: 'callout', tone: 'calm', title: 'Ce n\'est pas contre vous', text: 'La crise est souvent un petit cerveau débordé, pas une manipulation. Mûrir l\'autorégulation prend des années.' },
      ] },
      { id: 'sin-comparar', title: 'Prendre soin du regard', blocks: [
        { kind: 'list', items: [
          'Évitez de comparer avec les frères et sœurs ou d\'autres enfants : chacun a son calendrier.',
          'Célébrez l\'effort, pas seulement la réussite : « tu as essayé plusieurs fois ».',
          'Prenez soin de vous aussi : un parent reposé accompagne mieux.',
        ] },
        { kind: 'resource', file: '/kit/nd/fr/rutinas-visuales.pdf', label: 'Routines visuelles pour la maison', description: 'Cartes d\'appui pour anticiper la journée et réduire les conflits.' },
      ] },
    ],
  },
  {
    id: 'D', slug: 'entree-a-l-ecole', icon: 'graduation',
    title: 'Entrée dans le monde scolaire', area: 'Crèche, maternelle et premières adaptations',
    summary: 'Choisir un cadre bienveillant et bâtir une alliance avec l\'école.',
    sections: [
      { id: 'elegir-entorno', title: 'Quoi regarder au moment de choisir', blocks: [
        { kind: 'list', variant: 'check', items: [
          'Un accueil chaleureux et respectueux des enfants et des familles.',
          'Des groupes non surchargés et assez d\'adultes pour accompagner.',
          'Une ouverture aux adaptations et à une communication fréquente.',
          'Des routines prévisibles et des espaces qui ne surstimulent pas.',
        ] },
      ] },
      { id: 'alianza-escuela', title: 'Alliance école–famille', blocks: [
        { kind: 'steps', items: [
          'Partagez ce qui fonctionne à la maison : intérêts, apaisants, signes de fatigue.',
          'Convenez d\'un canal simple de communication (cahier, messages courts).',
          'Fixez une réunion de suivi après quelques semaines.',
        ] },
        { kind: 'resource', file: '/kit/nd/fr/carta-inicio-escolar.pdf', label: 'Lettre de rentrée', description: 'Un modèle pour présenter votre enfant et les soutiens qui l\'aident.' },
      ] },
      { id: 'adaptaciones-tempranas', title: 'Adaptations simples', blocks: [
        { kind: 'list', items: [
          'Anticiper les changements avec des images ou de courts avis.',
          'Un coin calme pour s\'autoréguler.',
          'Des consignes brèves et une chose à la fois.',
          'Une période d\'adaptation souple au début.',
        ] },
      ] },
    ],
  },
  {
    id: 'E', slug: 'droits-et-premiers-soutiens', icon: 'scale',
    title: 'Droits et premiers soutiens', area: 'Parcours d\'intervention précoce et droits',
    summary: 'À quoi vous avez droit et comment démarrer les soutiens.',
    sections: [
      { id: 'derechos-nd', title: 'Vous avez le droit à…', blocks: [
        { kind: 'list', variant: 'check', items: [
          'Une surveillance du développement à chaque visite de santé.',
          'Une information claire, sans jargon, et à un second avis.',
          'Des services d\'intervention précoce en cas de besoin.',
          'Une inclusion éducative dès les premières années.',
        ] },
        { kind: 'callout', tone: 'calm', title: 'Sans culpabilité', text: 'Chercher un soutien tôt est un acte de soin, pas un échec. Plus tôt, plus il est souvent simple d\'accompagner.' },
      ] },
      { id: 'rutas', title: 'Comment commencer', blocks: [
        { kind: 'steps', items: [
          'Notez vos observations et questions avant la consultation (utilisez le carnet).',
          'Parlez avec la pédiatrie ou le centre de santé de la surveillance du développement.',
          'Demandez, le cas échéant, une évaluation d\'intervention précoce.',
          'Rassemblez l\'annuaire des soutiens de votre région et gardez chaque compte-rendu.',
        ] },
        { kind: 'glossary', items: [
          { term: 'Intervention précoce', plain: 'Programme de soutiens des premières années, idéalement dans les milieux naturels (maison, école).' },
          { term: 'Compte-rendu', plain: 'Document qui résume observations et recommandations ; gardez-le, il sert aux démarches.' },
          { term: 'Inclusion', plain: 'Que le milieu s\'adapte à l\'enfant, et non l\'inverse.' },
        ] },
        { kind: 'resource', file: '/kit/nd/fr/directorio-apoyos.pdf', label: 'Annuaire des premiers soutiens', description: 'Un modèle pour organiser contacts, rendez-vous et comptes-rendus au même endroit.' },
      ] },
    ],
  },
];
