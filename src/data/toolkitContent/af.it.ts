import type { ToolkitModule } from './types';

/** Strumenti — sezione PATOLOGIE NEUROLOGICHE (italiano). Base: OMS — ICD-11 Cap.08
 *  e IGAP. Orientamento generale e di supporto; NON sostituisce la tua équipe medica
 *  né i servizi di emergenza. */
export const MODULES: ToolkitModule[] = [
  {
    id: 'A', slug: 'capire-la-patologia', icon: 'stethoscope',
    title: 'Capire la patologia', area: 'Informazione chiara e visita ben sfruttata',
    summary: 'Parole senza paura e domande che ordinano il percorso.',
    sections: [
      { id: 'glosario-af', title: 'Glossario senza paura', blocks: [
        { kind: 'lead', text: 'Alcuni termini suonano grandi. Qui li raccontiamo con calma: descrivono processi e sostegni, non definiscono chi sei tu o il tuo familiare.' },
        { kind: 'glossary', items: [
          { term: 'Patologia neurologica', plain: 'Una condizione del sistema nervoso (cervello, midollo o nervi). Molte si accompagnano e la qualità di vita migliora con i sostegni.' },
          { term: 'Neurologia', plain: 'La specialità medica che studia e cura queste condizioni.' },
          { term: 'Riabilitazione', plain: 'Terapie per recuperare o compensare funzioni e guadagnare autonomia.' },
          { term: 'Cronico', plain: 'Che accompagna a lungo; si gestisce, si cura e ci si convive.' },
          { term: 'Cure palliative', plain: 'Sostegni centrati sul benessere e sul sollievo; aggiungono qualità di vita in ogni fase.' },
          { term: 'Aderenza', plain: 'Seguire il piano concordato (farmaci, terapie, controlli) con costanza.' },
        ] },
      ] },
      { id: 'consulta', title: 'Sfruttare la visita', blocks: [
        { kind: 'p', text: 'Il tempo con l\'équipe medica è prezioso. Arrivare con domande scritte aiuta a non dimenticare l\'essenziale.' },
        { kind: 'list', variant: 'check', items: [
          'Come si chiama la patologia e cosa significa nella vita di ogni giorno?',
          'Quali segnali devo sorvegliare e quali sono urgenti?',
          'A cosa serve ogni farmaco e quali effetti aspettarmi?',
          'Quali terapie aiutano e con quale frequenza?',
          'Chi chiamo in caso di dubbio o di crisi?',
        ] },
        { kind: 'callout', tone: 'tip', title: 'Porta qualcuno', text: 'Quattro orecchie ascoltano meglio di due. Chiedi riassunti scritti e non esitare a dire "può spiegarlo con altre parole?".' },
      ] },
      { id: 'organizar', title: 'Organizzare le informazioni', blocks: [
        { kind: 'p', text: 'Una cartella unica — cartacea o digitale — con referti, esami, farmaci e contatti evita di ripetere la storia e velocizza ogni assistenza.' },
        { kind: 'resource', file: '/kit/af/it/carpeta-de-salud.pdf', label: 'Cartella della salute', description: 'Un modello per raccogliere diagnosi, esami, farmaci e contatti chiave.' },
      ] },
    ],
  },
  {
    id: 'B', slug: 'riabilitazione-e-terapie', icon: 'activity',
    title: 'Riabilitazione e terapie', area: 'Recuperare e compensare funzioni',
    summary: 'Costanza gentile, obiettivi realistici e pratica a casa.',
    sections: [
      { id: 'tipos', title: 'Tipi di riabilitazione', blocks: [
        { kind: 'table', columns: ['Terapia', 'In cosa aiuta'], rows: [
          ['Fisioterapia / neuroriabilitazione', 'Forza, equilibrio, cammino e mobilità.'],
          ['Terapia occupazionale', 'Attività della vita quotidiana e autonomia.'],
          ['Logopedia', 'Comunicazione, voce e deglutizione.'],
          ['Neuropsicologia', 'Memoria, attenzione e funzioni esecutive.'],
          ['Riabilitazione cognitiva', 'Strategie per pensare e organizzarsi meglio.'],
        ] },
      ] },
      { id: 'constancia', title: 'Obiettivi e costanza', blocks: [
        { kind: 'steps', items: [
          'Concordate con l\'équipe obiettivi piccoli e misurabili ("camminare 10 metri con appoggio").',
          'Distribuite la pratica in dosi brevi e frequenti, meglio di sedute estenuanti.',
          'Registrate progressi e plateau: i plateau fanno parte del percorso, non un fallimento.',
          'Celebrate ogni traguardo e adeguate gli obiettivi con l\'équipe.',
        ] },
        { kind: 'callout', tone: 'calm', title: 'Il proprio ritmo', text: 'Il recupero non è lineare. Giorni buoni e più difficili convivono; la costanza gentile rende più della pretesa.' },
      ] },
      { id: 'en-casa', title: 'Praticare a casa', blocks: [
        { kind: 'list', items: [
          'Fai gli esercizi indicati dall\'équipe, senza improvvisarne altri.',
          'Integra la pratica in routine reali: vestirsi, cucinare, camminare in cortile.',
          'Cura la sicurezza: spazi liberi e calzature stabili.',
        ] },
        { kind: 'resource', file: '/kit/af/it/registro-de-terapias.pdf', label: 'Diario delle terapie', description: 'Un diario settimanale di esercizi, progressi e domande per la prossima seduta.' },
      ] },
    ],
  },
  {
    id: 'C', slug: 'cure-quotidiane-a-casa', icon: 'hearthands',
    title: 'Cure quotidiane a casa', area: 'Benessere e sicurezza di ogni giorno',
    summary: 'Farmaci in sicurezza, mobilità, alimentazione e riposo.',
    sections: [
      { id: 'medicacion', title: 'Farmaci in sicurezza', blocks: [
        { kind: 'list', variant: 'check', items: [
          'Rispetta orari e dosi; usa sveglie o un portapillole settimanale.',
          'Non sospendere né cambiare le dosi senza consultare: alcuni farmaci richiedono aggiustamenti graduali.',
          'Annota gli effetti che noti e riferiscili alla prossima visita.',
          'Tieni sempre a portata una lista aggiornata dei farmaci.',
        ] },
        { kind: 'callout', tone: 'care', title: 'I cambiamenti, con l\'équipe', text: 'Sospendere di colpo alcuni farmaci — per esempio certi antiepilettici — può essere rischioso. Ogni cambiamento va concordato col medico.' },
      ] },
      { id: 'movilidad', title: 'Mobilità e prevenzione delle cadute', blocks: [
        { kind: 'list', items: [
          'Togli tappeti scivolosi e cavi; aggiungi una buona illuminazione.',
          'Maniglioni di appoggio in bagno e nei corridoi se serve.',
          'Usa gli ausili indicati (bastone, deambulatore) senza vergogna: danno libertà.',
          'Cambi di posizione frequenti se si passa molto tempo a letto o in sedia.',
        ] },
      ] },
      { id: 'alimentacion-descanso', title: 'Alimentazione, pelle e riposo', blocks: [
        { kind: 'p', text: 'In caso di difficoltà a deglutire (disfagia), segui le indicazioni su consistenze e postura durante i pasti, e consulta in caso di tosse o soffocamenti frequenti.' },
        { kind: 'list', items: [
          'Cura l\'idratazione e un\'alimentazione adeguata alle indicazioni.',
          'Controlla la pelle nei punti d\'appoggio per prevenire lesioni.',
          'Proteggi il sonno: orari stabili e ambiente tranquillo.',
        ] },
        { kind: 'resource', file: '/kit/af/it/plan-de-cuidados.pdf', label: 'Piano di cura quotidiano', description: 'Una checklist per farmaci, mobilità, alimentazione e riposo.' },
      ] },
    ],
  },
  {
    id: 'D', slug: 'segnali-d-allarme-ed-emergenze', icon: 'pulse',
    title: 'Segnali d\'allarme ed emergenze', area: 'Agire con calma quando è urgente',
    summary: 'Cosa sorvegliare, come rispondere e quando chiedere aiuto urgente.',
    sections: [
      { id: 'cuando-urge', title: 'Quando cercare aiuto urgente', blocks: [
        { kind: 'callout', tone: 'care', title: 'Nel dubbio, chiama l\'emergenza', text: 'Questa guida è generale e non sostituisce il piano dato dalla tua équipe né i servizi di emergenza del tuo Paese. Se c\'è pericolo di vita, chiama subito il numero di emergenza locale.' },
        { kind: 'list', items: [
          'Debolezza improvvisa di viso, braccio o gamba, difficoltà a parlare o a vedere (possibile ictus): agisci in fretta, ogni minuto conta.',
          'Una crisi (convulsione) che dura più di 5 minuti o si ripete senza riprendere coscienza.',
          'Un mal di testa improvviso e fortissimo, diverso dal solito.',
          'Febbre alta con rigidità del collo o confusione.',
          'Difficoltà a respirare, soffocamento o perdita di coscienza.',
        ] },
      ] },
      { id: 'crisis', title: 'Primo soccorso durante una crisi (convulsione)', blocks: [
        { kind: 'steps', items: [
          'Mantieni la calma e proteggi: allontana gli oggetti con cui potrebbe farsi male.',
          'Metti qualcosa di morbido sotto la testa e allenta ciò che stringe il collo.',
          'Non trattenere con forza e non mettere nulla in bocca.',
          'Girala su un fianco (posizione di sicurezza) per aiutare la respirazione.',
          'Cronometra la crisi; se supera i 5 minuti o si ripete, chiama l\'emergenza.',
          'Resta accanto fino al recupero e segui il piano indicato dal medico.',
        ] },
        { kind: 'callout', tone: 'calm', title: 'Dopo la crisi', text: 'Sonnolenza o confusione successiva sono normali. Parla con voce dolce, offri sicurezza e registra cosa è successo per l\'équipe medica.' },
      ] },
      { id: 'kit-emergencia', title: 'Prepararsi in anticipo', blocks: [
        { kind: 'list', variant: 'check', items: [
          'Un piano d\'azione scritto dalla tua équipe (cosa fare e chi chiamare).',
          'Una lista di farmaci e allergie, visibile e aggiornata.',
          'Contatti d\'emergenza e del neurologo a portata di mano.',
          'Un documento o braccialetto di identificazione medica se consigliato.',
        ] },
        { kind: 'resource', file: '/kit/af/it/plan-de-emergencia.pdf', label: 'Piano di emergenza', description: 'Una scheda da compilare con la tua équipe: segnali, passi e contatti chiave.' },
      ] },
    ],
  },
  {
    id: 'E', slug: 'diritti-pratiche-e-sostegni', icon: 'scale',
    title: 'Diritti, pratiche e sostegni', area: 'Disabilità, sostegni e cura di chi cura',
    summary: 'A cosa hai diritto e come sostenere la cura nel tempo.',
    sections: [
      { id: 'derechos-af', title: 'Hai diritto a…', blocks: [
        { kind: 'list', variant: 'check', items: [
          'Assistenza sanitaria dignitosa, continua e con informazioni chiare.',
          'Riabilitazione e ai sostegni di cui hai bisogno.',
          'Accessibilità e accomodamenti ragionevoli al lavoro e a scuola.',
          'Un trattamento senza discriminazioni per la tua condizione.',
        ] },
        { kind: 'callout', tone: 'calm', title: 'Chiedere sostegno è un diritto', text: 'I sostegni per la disabilità non sono un favore: esistono per pareggiare le opportunità. Informati su quelli del tuo Paese senza imbarazzo.' },
      ] },
      { id: 'tramites', title: 'Pratiche frequenti', blocks: [
        { kind: 'steps', items: [
          'Raccogli referti medici aggiornati nella tua cartella della salute.',
          'Consulta il riconoscimento o il certificato di disabilità del tuo Paese e i relativi benefici.',
          'Chiedi dei sostegni per trasporto, farmaci, terapie o economici.',
          'Conserva copia di ogni pratica e le date di rinnovo.',
        ] },
      ] },
      { id: 'cuidar-cuidador', title: 'Prendersi cura di chi cura', blocks: [
        { kind: 'lead', text: 'Il benessere di chi assiste sostiene tutto il resto. Prendersi cura di sé non è egoismo: fa parte della cura.' },
        { kind: 'list', items: [
          'Distribuisci i compiti e accetta aiuto: nessuno può fare tutto, sempre.',
          'Riserva momenti di riposo e di sollievo, anche brevi.',
          'Cerca gruppi di supporto tra pari (in Neuromundi ci sono i Neurocamps).',
          'Chiedi aiuto professionale se compaiono esaurimento, tristezza o ansia persistenti.',
        ] },
        { kind: 'resource', file: '/kit/af/it/red-de-apoyo.pdf', label: 'Mappa della rete di supporto', description: 'Un modello per organizzare chi aiuta con cosa e i cambi nella cura.' },
      ] },
    ],
  },
];
