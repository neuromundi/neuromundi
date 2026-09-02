import type { ToolkitModule } from './types';

/** Outils — section AFFECTIONS NEUROLOGIQUES (français). Base : OMS — CIM-11 Ch.08
 *  et IGAP. Orientation générale et de soutien ; ne remplace PAS votre équipe
 *  médicale ni les services d'urgence. */
export const MODULES: ToolkitModule[] = [
  {
    id: 'A', slug: 'comprendre-l-affection', icon: 'stethoscope',
    title: 'Comprendre l\'affection', area: 'Information claire et consultation bien utilisée',
    summary: 'Des mots sans peur et des questions qui ordonnent le chemin.',
    sections: [
      { id: 'glosario-af', title: 'Un glossaire sans peur', blocks: [
        { kind: 'lead', text: 'Certains termes semblent lourds. Ici on les dit avec calme : ils décrivent des processus et des soutiens, ils ne définissent pas qui vous êtes, vous ou votre proche.' },
        { kind: 'glossary', items: [
          { term: 'Affection neurologique', plain: 'Une atteinte du système nerveux (cerveau, moelle ou nerfs). Beaucoup s\'accompagnent et la qualité de vie s\'améliore avec des soutiens.' },
          { term: 'Neurologie', plain: 'La spécialité médicale qui étudie et traite ces affections.' },
          { term: 'Réhabilitation', plain: 'Des thérapies pour récupérer ou compenser des fonctions et gagner en autonomie.' },
          { term: 'Chronique', plain: 'Qui accompagne longtemps ; on le gère, on en prend soin et on vit avec.' },
          { term: 'Soins palliatifs', plain: 'Des soutiens centrés sur le bien-être et le soulagement ; ils ajoutent de la qualité de vie à toute étape.' },
          { term: 'Observance', plain: 'Suivre le plan convenu (médicaments, thérapies, suivis) de façon constante.' },
        ] },
      ] },
      { id: 'consulta', title: 'Tirer parti de la consultation', blocks: [
        { kind: 'p', text: 'Le temps avec l\'équipe médicale est précieux. Arriver avec des questions écrites aide à ne pas oublier l\'essentiel.' },
        { kind: 'list', variant: 'check', items: [
          'Quel est le nom de l\'affection et que signifie-t-il au quotidien ?',
          'Quels signes surveiller, et lesquels sont urgents ?',
          'À quoi sert chaque médicament et quels effets attendre ?',
          'Quelles thérapies aident, et à quelle fréquence ?',
          'Qui appeler en cas de doute ou de crise ?',
        ] },
        { kind: 'callout', tone: 'tip', title: 'Venez accompagné', text: 'Quatre oreilles valent mieux que deux. Demandez des résumés écrits et n\'hésitez pas à dire « pouvez-vous le dire autrement ? ».' },
      ] },
      { id: 'organizar', title: 'Organiser l\'information', blocks: [
        { kind: 'p', text: 'Un dossier unique — papier ou numérique — avec comptes-rendus, examens, médicaments et contacts évite de répéter l\'histoire et accélère chaque prise en charge.' },
        { kind: 'resource', file: '/kit/af/fr/carpeta-de-salud.pdf', label: 'Dossier de santé', description: 'Un modèle pour rassembler diagnostics, examens, médicaments et contacts clés.' },
      ] },
    ],
  },
  {
    id: 'B', slug: 'rehabilitation-et-therapies', icon: 'activity',
    title: 'Réhabilitation et thérapies', area: 'Récupérer et compenser des fonctions',
    summary: 'Une constance bienveillante, des objectifs réalistes et de la pratique à la maison.',
    sections: [
      { id: 'tipos', title: 'Types de réhabilitation', blocks: [
        { kind: 'table', columns: ['Thérapie', 'Ce qu\'elle aide'], rows: [
          ['Kinésithérapie / neuroréhabilitation', 'Force, équilibre, marche et mobilité.'],
          ['Ergothérapie', 'Activités de la vie quotidienne et autonomie.'],
          ['Orthophonie', 'Communication, voix et déglutition.'],
          ['Neuropsychologie', 'Mémoire, attention et fonctions exécutives.'],
          ['Réhabilitation cognitive', 'Stratégies pour mieux penser et s\'organiser.'],
        ] },
      ] },
      { id: 'constancia', title: 'Objectifs et constance', blocks: [
        { kind: 'steps', items: [
          'Convenez avec l\'équipe d\'objectifs petits et mesurables (« marcher 10 mètres avec appui »).',
          'Répartissez la pratique en doses courtes et fréquentes, plutôt que des séances épuisantes.',
          'Notez progrès et plateaux : les plateaux font partie du processus, pas un échec.',
          'Célébrez chaque acquis et ajustez les objectifs avec l\'équipe.',
        ] },
        { kind: 'callout', tone: 'calm', title: 'Votre propre rythme', text: 'La récupération n\'est pas linéaire. Bons jours et jours plus durs coexistent ; la constance bienveillante rend plus que l\'exigence.' },
      ] },
      { id: 'en-casa', title: 'Pratiquer à la maison', blocks: [
        { kind: 'list', items: [
          'Faites les exercices indiqués par l\'équipe, sans improviser davantage.',
          'Intégrez la pratique dans des routines réelles : s\'habiller, cuisiner, marcher jusqu\'au jardin.',
          'Veillez à la sécurité : des espaces dégagés et des chaussures fermes.',
        ] },
        { kind: 'resource', file: '/kit/af/fr/registro-de-terapias.pdf', label: 'Journal des thérapies', description: 'Un journal hebdomadaire d\'exercices, de progrès et de questions pour la prochaine séance.' },
      ] },
    ],
  },
  {
    id: 'C', slug: 'soins-quotidiens-a-la-maison', icon: 'hearthands',
    title: 'Soins quotidiens à la maison', area: 'Bien-être et sécurité au quotidien',
    summary: 'Médicaments en sécurité, mobilité, alimentation et repos.',
    sections: [
      { id: 'medicacion', title: 'Médicaments en sécurité', blocks: [
        { kind: 'list', variant: 'check', items: [
          'Respectez horaires et doses ; utilisez des alarmes ou un pilulier hebdomadaire.',
          'N\'arrêtez ni ne modifiez les doses sans avis : certains traitements exigent un ajustement progressif.',
          'Notez les effets remarqués et parlez-en à la prochaine visite.',
          'Gardez une liste à jour des médicaments toujours à portée de main.',
        ] },
        { kind: 'callout', tone: 'care', title: 'Les changements, avec l\'équipe', text: 'Arrêter brutalement certains médicaments — par exemple des antiépileptiques — peut être risqué. Tout changement, convenu avec votre médecin.' },
      ] },
      { id: 'movilidad', title: 'Mobilité et prévention des chutes', blocks: [
        { kind: 'list', items: [
          'Retirez tapis glissants et câbles ; ajoutez un bon éclairage.',
          'Des barres d\'appui dans la salle de bain et les couloirs si besoin.',
          'Utilisez les aides indiquées (canne, déambulateur) sans gêne : elles donnent de la liberté.',
          'Des changements de position fréquents si l\'on passe beaucoup de temps au lit ou en fauteuil.',
        ] },
      ] },
      { id: 'alimentacion-descanso', title: 'Alimentation, peau et repos', blocks: [
        { kind: 'p', text: 'En cas de difficulté à avaler (dysphagie), suivez les consignes sur les textures et la position à table, et consultez en cas de toux ou de fausses routes fréquentes.' },
        { kind: 'list', items: [
          'Veillez à l\'hydratation et à une alimentation adaptée aux consignes.',
          'Vérifiez la peau aux points d\'appui pour prévenir les lésions.',
          'Protégez le sommeil : horaires stables et environnement calme.',
        ] },
        { kind: 'resource', file: '/kit/af/fr/plan-de-cuidados.pdf', label: 'Plan de soins quotidien', description: 'Une checklist pour médicaments, mobilité, alimentation et repos.' },
      ] },
    ],
  },
  {
    id: 'D', slug: 'signes-d-alerte-et-urgences', icon: 'pulse',
    title: 'Signes d\'alerte et urgences', area: 'Agir avec calme quand c\'est urgent',
    summary: 'Quoi surveiller, comment réagir et quand demander de l\'aide urgente.',
    sections: [
      { id: 'cuando-urge', title: 'Quand chercher de l\'aide urgente', blocks: [
        { kind: 'callout', tone: 'care', title: 'En cas de doute, appelez les urgences', text: 'Ce guide est général et ne remplace ni le plan donné par votre équipe ni les services d\'urgence de votre pays. En cas de danger vital, appelez immédiatement le numéro d\'urgence local.' },
        { kind: 'list', items: [
          'Faiblesse soudaine du visage, d\'un bras ou d\'une jambe, difficulté à parler ou à voir (AVC possible) : agissez vite, chaque minute compte.',
          'Une crise (convulsion) de plus de 5 minutes ou qui se répète sans reprise de conscience.',
          'Un mal de tête soudain et extrêmement intense, inhabituel.',
          'Une forte fièvre avec raideur de la nuque ou confusion.',
          'Une difficulté à respirer, un étouffement ou une perte de conscience.',
        ] },
      ] },
      { id: 'crisis', title: 'Premiers secours pendant une crise (convulsion)', blocks: [
        { kind: 'steps', items: [
          'Restez calme et protégez : écartez les objets qui pourraient blesser.',
          'Placez quelque chose de mou sous la tête et desserrez ce qui serre le cou.',
          'Ne retenez pas de force et ne mettez rien dans la bouche.',
          'Tournez la personne sur le côté (position de récupération) pour aider à respirer.',
          'Chronométrez la crise ; si elle dépasse 5 minutes ou se répète, appelez les urgences.',
          'Restez auprès d\'elle jusqu\'au rétablissement et suivez le plan de son médecin.',
        ] },
        { kind: 'callout', tone: 'calm', title: 'Après la crise', text: 'Somnolence ou confusion sont normales ensuite. Parlez d\'une voix douce, rassurez et notez ce qui s\'est passé pour l\'équipe médicale.' },
      ] },
      { id: 'kit-emergencia', title: 'Se préparer à l\'avance', blocks: [
        { kind: 'list', variant: 'check', items: [
          'Un plan d\'action écrit par votre équipe (quoi faire et qui appeler).',
          'Une liste des médicaments et allergies, visible et à jour.',
          'Les contacts d\'urgence et du neurologue à portée de main.',
          'Un document ou un bracelet d\'identification médicale si recommandé.',
        ] },
        { kind: 'resource', file: '/kit/af/fr/plan-de-emergencia.pdf', label: 'Plan d\'urgence', description: 'Une fiche à remplir avec votre équipe : signes, étapes et contacts clés.' },
      ] },
    ],
  },
  {
    id: 'E', slug: 'droits-demarches-et-soutiens', icon: 'scale',
    title: 'Droits, démarches et soutiens', area: 'Handicap, soutiens et prendre soin de l\'aidant',
    summary: 'À quoi vous avez droit et comment tenir le soin dans la durée.',
    sections: [
      { id: 'derechos-af', title: 'Vous avez le droit à…', blocks: [
        { kind: 'list', variant: 'check', items: [
          'Des soins dignes, continus et une information claire.',
          'La réhabilitation et les soutiens dont vous avez besoin.',
          'L\'accessibilité et des aménagements raisonnables au travail et à l\'école.',
          'Un traitement sans discrimination liée à votre affection.',
        ] },
        { kind: 'callout', tone: 'calm', title: 'Demander de l\'aide est un droit', text: 'Les soutiens liés au handicap ne sont pas une faveur : ils existent pour égaliser les chances. Renseignez-vous sur ceux de votre pays sans gêne.' },
      ] },
      { id: 'tramites', title: 'Démarches fréquentes', blocks: [
        { kind: 'steps', items: [
          'Rassemblez des comptes-rendus médicaux à jour dans votre dossier de santé.',
          'Consultez la reconnaissance ou la carte de handicap de votre pays et ses avantages.',
          'Renseignez-vous sur les aides au transport, aux médicaments, aux thérapies ou financières.',
          'Gardez une copie de chaque démarche et ses dates de renouvellement.',
        ] },
      ] },
      { id: 'cuidar-cuidador', title: 'Prendre soin de celui qui prend soin', blocks: [
        { kind: 'lead', text: 'Le bien-être de l\'aidant soutient tout le reste. Prendre soin de vous n\'est pas de l\'égoïsme : cela fait partie du soin.' },
        { kind: 'list', items: [
          'Répartissez les tâches et acceptez de l\'aide : personne ne peut tout, toujours.',
          'Réservez des moments de repos et de répit, même brefs.',
          'Cherchez des groupes de pairs (dans Neuromundi, il y a les Neurocamps).',
          'Demandez une aide professionnelle si épuisement, tristesse ou anxiété persistent.',
        ] },
        { kind: 'resource', file: '/kit/af/fr/red-de-apoyo.pdf', label: 'Carte du réseau de soutien', description: 'Un modèle pour organiser qui aide à quoi et les relais de soin.' },
      ] },
    ],
  },
];
