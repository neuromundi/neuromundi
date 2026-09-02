import type { ToolkitModule } from './types';

/** Strumenti — sezione NEUROSVILUPPO (italiano). Orientamento generale, caloroso e
 *  NON diagnostico per le famiglie che accompagnano lo sviluppo del bambino. */
export const MODULES: ToolkitModule[] = [
  {
    id: 'A', slug: 'tappe-dello-sviluppo', icon: 'sprout',
    title: 'Tappe dello sviluppo', area: 'Sorveglianza dello sviluppo precoce',
    summary: 'Cosa osservare per età, con calma e senza confrontare.',
    sections: [
      { id: 'que-son', title: 'Cosa sono le tappe (e cosa non sono)', blocks: [
        { kind: 'lead', text: 'Le tappe sono segnali approssimativi di come un bambino si muove, comunica, gioca e si relaziona. Una guida per accompagnare, non una gara né un esame.' },
        { kind: 'p', text: 'Ogni bambino ha il proprio ritmo. Le fasce d\'età sono medie: arrivare un po\' prima o dopo di solito rientra nell\'atteso. Conta la traiettoria nel tempo, non un singolo giorno.' },
        { kind: 'callout', tone: 'calm', title: 'Una bussola, non un righello', text: 'Se qualcosa ti preoccupa, la tua osservazione conta. Chiedere un parere presto non "etichetta" nessuno: apre porte a sostegni che semplificano la vita.' },
      ] },
      { id: 'por-edad', title: 'Cosa osservare, per area', blocks: [
        { kind: 'p', text: 'Quattro aree crescono insieme. Questa tabella dà esempi di ciò che di solito compare e quando conviene parlarne con un professionista di fiducia.' },
        { kind: 'table', columns: ['Area', 'Cosa di solito compare', 'Conviene consultare se…'], rows: [
          ['Motoria', 'Regge la testa, si siede, gattona, cammina, manipola oggetti.', 'A 12 mesi non si sposta in alcun modo, o il corpo appare molto rigido o molto flaccido.'],
          ['Comunicazione', 'Lallazione, indica, prime parole, unisce due parole.', 'A 18 mesi nessuna parola con intenzione o nessun indicare per chiedere o mostrare.'],
          ['Sociale e affettiva', 'Sorride, cerca lo sguardo, condivide l\'attenzione, imita gesti.', 'Non risponde al nome, evita il contatto o perde abilità già acquisite.'],
          ['Cognitiva e gioco', 'Esplora, cerca oggetti nascosti, gioca al "far finta", risolve piccole sfide.', 'Nessun gioco simbolico verso i 2 anni, o interesse molto limitato a esplorare.'],
        ], caption: 'Esempi orientativi; le fasce variano tra fonti e tra bambini.' },
        { kind: 'callout', tone: 'care', title: 'Un segnale da non rimandare', text: 'Perdere abilità già acquisite (smettere di parlare, di guardare o di giocare come prima) merita una visita tempestiva, senza allarmarsi.' },
      ] },
      { id: 'glosario-nd', title: 'Parole che aiutano', blocks: [
        { kind: 'glossary', items: [
          { term: 'Sorveglianza dello sviluppo', plain: 'Osservare con affetto e in continuità come cresce e impara, a ogni controllo di salute.' },
          { term: 'Intervento precoce', plain: 'Insieme di sostegni dei primi anni che potenziano lo sviluppo e il legame.' },
          { term: 'Traiettoria', plain: 'La direzione dei progressi nel tempo; conta più di un dato isolato.' },
          { term: 'Stimolazione', plain: 'Offrire esperienze quotidiane e gioco che invitano a esplorare, senza pressione.' },
        ] },
        { kind: 'resource', file: '/kit/nd/it/hitos-por-edad.pdf', label: 'Tappe per età', description: 'Tabella stampabile per aree ed età per il tuo diario, con spazio per le note.' },
      ] },
    ],
  },
  {
    id: 'B', slug: 'gioco-e-stimolazione', icon: 'blocks',
    title: 'Gioco e stimolazione', area: 'Imparare giocando nella vita quotidiana',
    summary: 'Il gioco è il motore: idee semplici, senza sovrastimolare.',
    sections: [
      { id: 'juego-motor', title: 'Il gioco, il miglior maestro', blocks: [
        { kind: 'lead', text: 'Non servono giochi costosi né schermi. Il legame, la voce e gli oggetti di casa bastano per imparare.' },
        { kind: 'list', variant: 'check', items: [
          'Segui l\'interesse del bambino: se guarda qualcosa, nominalo e giocaci.',
          'Meno è meglio: pochi oggetti, turni brevi e molte ripetizioni.',
          'Nomina ciò che fate insieme: "costruisci la torre", "cade", "ancora".',
          'Aspetta e osserva: lascia pause perché risponda al suo ritmo.',
        ] },
      ] },
      { id: 'ideas-edad', title: 'Idee per fase', blocks: [
        { kind: 'table', columns: ['Fase', 'Gioco semplice', 'Cosa rafforza'], rows: [
          ['0–12 mesi', 'Bubu-settete, canzoni con gesti, guardarsi allo specchio.', 'Attenzione condivisa, legame, anticipazione.'],
          ['1–2 anni', 'Mettere e togliere oggetti, torri, indicare nei libri.', 'Motricità, prime parole, causa-effetto.'],
          ['2–3 anni', 'Gioco del "far finta" (dar da mangiare alla bambola), incastri.', 'Linguaggio, immaginazione, problem solving.'],
          ['3–5 anni', 'Ruoli (negozio, dottore), classificare per colore o dimensione.', 'Abilità sociali, funzioni esecutive.'],
        ] },
        { kind: 'callout', tone: 'tip', title: 'Routine che insegnano', text: 'Il bagno, i pasti e il vestirsi sono oro: racconta i passaggi e offri piccole scelte ("la rossa o la blu?").' },
      ] },
      { id: 'sin-sobreestimular', title: 'Stimolare senza saturare', blocks: [
        { kind: 'steps', items: [
          'Osserva i segnali di stanchezza: gira il viso, si agita, si strofina gli occhi.',
          'Rallenta: meno stimoli, voce dolce, un solo gioco.',
          'Offri calma prima del sonno: luce bassa, niente schermi, routine prevedibile.',
        ] },
        { kind: 'resource', file: '/kit/nd/it/ideas-de-juego.pdf', label: 'Idee di gioco per età', description: 'Schede brevi con proposte casalinghe e a basso costo.' },
      ] },
    ],
  },
  {
    id: 'C', slug: 'genitorialita-rispettosa-e-legame', icon: 'hearthands',
    title: 'Genitorialità rispettosa e legame', area: 'Il lato affettivo dello sviluppo',
    summary: 'Un legame sicuro è la base su cui si costruisce tutto.',
    sections: [
      { id: 'apego', title: 'Un legame che dà sicurezza', blocks: [
        { kind: 'lead', text: 'Quando un bambino sente che c\'è qualcuno di disponibile e prevedibile, osa esplorare. L\'affetto non "vizia": sostiene.' },
        { kind: 'p', text: 'Rispondere al pianto, nominare ciò che sente e tornare alla calma insieme sono il modo in cui impara, poco a poco, a regolarsi dentro.' },
      ] },
      { id: 'regular-calma', title: 'Accompagnare il capriccio con calma', blocks: [
        { kind: 'steps', items: [
          'Prima la tua calma: respira; la tua tranquillità è contagiosa.',
          'Metti in parole: "sei molto arrabbiato perché il gioco è finito".',
          'Offri vicinanza, non una predica: a volte basta stare accanto.',
          'Quando l\'onda passa, ripara e torna alla routine, senza punizioni né etichette.',
        ] },
        { kind: 'callout', tone: 'calm', title: 'Non è contro di te', text: 'Il capriccio è spesso un piccolo cervello sopraffatto, non manipolazione. Maturare l\'autoregolazione richiede anni.' },
      ] },
      { id: 'sin-comparar', title: 'Curare lo sguardo', blocks: [
        { kind: 'list', items: [
          'Evita confronti con fratelli o altri bambini: ognuno ha il suo calendario.',
          'Celebra lo sforzo, non solo il risultato: "ci hai provato tante volte".',
          'Prenditi cura anche di te: chi accompagna riposato accompagna meglio.',
        ] },
        { kind: 'resource', file: '/kit/nd/it/rutinas-visuales.pdf', label: 'Routine visive per casa', description: 'Carte di supporto per anticipare la giornata e ridurre i conflitti.' },
      ] },
    ],
  },
  {
    id: 'D', slug: 'ingresso-a-scuola', icon: 'graduation',
    title: 'Ingresso nel mondo scolastico', area: 'Nido, scuola dell\'infanzia e primi adattamenti',
    summary: 'Scegliere un ambiente accogliente e costruire alleanza con la scuola.',
    sections: [
      { id: 'elegir-entorno', title: 'Cosa guardare nella scelta', blocks: [
        { kind: 'list', variant: 'check', items: [
          'Trattamento caloroso e rispettoso verso bambini e famiglie.',
          'Gruppi non sovraffollati e adulti sufficienti ad accompagnare.',
          'Apertura agli adattamenti e a una comunicazione frequente.',
          'Routine prevedibili e spazi che non sovrastimolano.',
        ] },
      ] },
      { id: 'alianza-escuela', title: 'Alleanza scuola–famiglia', blocks: [
        { kind: 'steps', items: [
          'Condividi ciò che funziona a casa: interessi, calmanti, segnali di stanchezza.',
          'Concordate un canale semplice di comunicazione (quaderno, messaggi brevi).',
          'Fissate un incontro di verifica dopo poche settimane.',
        ] },
        { kind: 'resource', file: '/kit/nd/it/carta-inicio-escolar.pdf', label: 'Lettera di inizio scuola', description: 'Un modello per presentare tuo figlio o tua figlia e i sostegni che aiutano.' },
      ] },
      { id: 'adaptaciones-tempranas', title: 'Adattamenti semplici', blocks: [
        { kind: 'list', items: [
          'Anticipare i cambiamenti con immagini o brevi avvisi.',
          'Un angolo della calma per autoregolarsi.',
          'Consegne brevi e una cosa alla volta.',
          'Un periodo di ambientamento flessibile all\'inizio.',
        ] },
      ] },
    ],
  },
  {
    id: 'E', slug: 'diritti-e-primi-sostegni', icon: 'scale',
    title: 'Diritti e primi sostegni', area: 'Percorsi di intervento precoce e diritti',
    summary: 'A cosa hai diritto e come avviare i sostegni.',
    sections: [
      { id: 'derechos-nd', title: 'Hai diritto a…', blocks: [
        { kind: 'list', variant: 'check', items: [
          'Una sorveglianza dello sviluppo a ogni controllo di salute.',
          'Informazioni chiare, senza gergo, e a un secondo parere.',
          'Servizi di intervento precoce quando servono.',
          'Inclusione educativa fin dai primi anni.',
        ] },
        { kind: 'callout', tone: 'calm', title: 'Senza sensi di colpa', text: 'Cercare sostegno presto è un atto di cura, non un fallimento. Prima si fa, più semplice di solito è accompagnare.' },
      ] },
      { id: 'rutas', title: 'Come iniziare', blocks: [
        { kind: 'steps', items: [
          'Annota osservazioni e dubbi prima della visita (usa il diario).',
          'Parla con la pediatria o il centro di salute della sorveglianza dello sviluppo.',
          'Chiedi, se opportuno, una valutazione di intervento precoce.',
          'Raccogli l\'elenco dei sostegni della tua zona e conserva ogni referto.',
        ] },
        { kind: 'glossary', items: [
          { term: 'Intervento precoce', plain: 'Programma di sostegni dei primi anni, idealmente in ambienti naturali (casa, scuola).' },
          { term: 'Referto', plain: 'Documento che riassume osservazioni e raccomandazioni; conservalo, serve per le pratiche.' },
          { term: 'Inclusione', plain: 'Che l\'ambiente si adatti al bambino, non il contrario.' },
        ] },
        { kind: 'resource', file: '/kit/nd/it/directorio-apoyos.pdf', label: 'Elenco dei primi sostegni', description: 'Un modello per organizzare contatti, appuntamenti e referti in un unico posto.' },
      ] },
    ],
  },
];
