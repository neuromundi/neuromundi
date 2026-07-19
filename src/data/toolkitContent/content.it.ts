import type { ToolkitModule } from './types';

export const MODULES: ToolkitModule[] = [
  {
    "id": "A",
    "slug": "gestion-clinico-medica",
    "icon": "stethoscope",
    "title": "Gestione clinico-medica",
    "area": "Specialisti dello sviluppo e della salute",
    "summary": "Capire le parole, osservare con calma e sapere a chi rivolgersi.",
    "sections": [
      {
        "id": "glosario",
        "title": "Glossario senza misteri",
        "blocks": [
          {
            "kind": "lead",
            "text": "Alcune parole possono sembrare grandi o fredde. Qui le spieghiamo con calma: descrivono processi e sostegni, mai chi è tuo figlio o tua figlia."
          },
          {
            "kind": "glossary",
            "items": [
              {
                "term": "Valutazione",
                "plain": "Una serie di incontri per capire come una persona apprende, comunica e si relaziona. Non è un esame che si supera o si boccia."
              },
              {
                "term": "Diagnosi",
                "plain": "Un nome che aiuta a orientare i sostegni. Descrive un modo di funzionare; non riduce la persona."
              },
              {
                "term": "Neurodivergenza",
                "plain": "Un modo diverso —non inferiore— di percepire, pensare e sentire."
              },
              {
                "term": "Integrazione sensoriale",
                "plain": "Accompagnamento perché i sensi lavorino con più calma e la quotidianità sia più comoda."
              },
              {
                "term": "Invio o consulto",
                "plain": "Quando un professionista propone di aggiungere un altro specialista all’équipe."
              },
              {
                "term": "Linea di base",
                "plain": "Una foto del punto di partenza per notare i progressi nel tempo."
              },
              {
                "term": "Abilitazione professionale",
                "plain": "La registrazione che conferma che un professionista è abilitato."
              },
              {
                "term": "Test standardizzati",
                "plain": "Strumenti di supporto: una parte della storia, mai tutta."
              }
            ]
          },
          {
            "kind": "callout",
            "tone": "calm",
            "title": "Ricorda",
            "text": "Puoi chiedere che ti spieghino qualsiasi termine tutte le volte che serve. Una buona équipe lo farà con piacere."
          }
        ]
      },
      {
        "id": "bitacora-abc",
        "title": "Guida al diario ABC",
        "blocks": [
          {
            "kind": "lead",
            "text": "Il diario ABC è un modo semplice di osservare senza giudicare. Aiuta a trovare schemi e a farti accompagnare meglio."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "A — Antecedente: cosa accadeva poco prima (luogo, persone, attività, cambiamenti).",
              "B — Comportamento: cosa hai osservato, con parole neutre e concrete, senza etichette.",
              "C — Conseguenza: cosa è successo dopo e come si è calmata la situazione."
            ]
          },
          {
            "kind": "steps",
            "items": [
              "Annota poco e subito: poche righe sul momento valgono più di un testo perfetto dopo.",
              "Descrivi ciò che vedresti in un video, non ciò che immagini abbia provato.",
              "Dopo vari appunti, cerca schemi: orari, contesti o inneschi ricorrenti.",
              "Porta il diario agli appuntamenti: è un dono di informazioni per l’équipe."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "Senza colpe",
            "text": "Il diario non punta a “comportarsi bene”. Punta a capire i bisogni per rispondere con più calma e cura."
          },
          {
            "kind": "resource",
            "file": "/kit/it/bitacora-abc.pdf",
            "label": "Diario di osservazione (ABC)",
            "description": "Modello stampabile per annotare antecedenti, comportamento e conseguenze."
          }
        ]
      },
      {
        "id": "matriz",
        "title": "Matrice delle specialità",
        "blocks": [
          {
            "kind": "p",
            "text": "Ogni bisogno ha di solito un tipo di professionista che lo accompagna meglio. Questa matrice è una bussola, non una regola: il supporto è spesso di squadra."
          },
          {
            "kind": "table",
            "columns": [
              "Cosa osservi",
              "Chi accompagna di solito",
              "In cosa aiuta"
            ],
            "rows": [
              [
                "Linguaggio e comunicazione",
                "Logopedia",
                "Parola, comprensione e comunicazione alternativa."
              ],
              [
                "Autonomia e quotidianità",
                "Terapia occupazionale",
                "Vestirsi, mangiare, scrivere e regolazione sensoriale."
              ],
              [
                "Movimento e postura",
                "Fisioterapia",
                "Forza, equilibrio e coordinazione."
              ],
              [
                "Emozioni e legame",
                "Psicologia",
                "Regolazione emotiva e strategie per casa."
              ],
              [
                "Apprendimento scolastico",
                "Pedagogia / Ed. speciale",
                "Strategie di studio e adattamenti."
              ],
              [
                "Sonno, alimentazione e salute",
                "Pediatria / Neuropediatria",
                "Follow-up medico e dello sviluppo."
              ]
            ],
            "caption": "Orientamento generale su da dove iniziare."
          },
          {
            "kind": "resource",
            "file": "/kit/it/matriz-especialidades.pdf",
            "label": "Matrice delle specialità",
            "description": "Tabella per capire quale professionista accompagna ogni bisogno."
          },
          {
            "kind": "resource",
            "file": "/kit/it/glosario.pdf",
            "label": "Glossario senza misteri",
            "description": "I termini più comuni, spiegati con parole semplici."
          }
        ]
      }
    ]
  },
  {
    "id": "B",
    "slug": "adaptacion-educativa",
    "icon": "graduation",
    "title": "Adattamento educativo",
    "area": "Scuole e centri inclusivi",
    "summary": "Costruire ponti con la scuola e conoscere i supporti di accesso.",
    "sections": [
      {
        "id": "carta",
        "title": "Comunicazione Scuola–Famiglia",
        "blocks": [
          {
            "kind": "lead",
            "text": "Scuola e famiglia sono un’unica squadra con un obiettivo comune: che tuo figlio impari e stia bene. Una comunicazione chiara e gentile apre le porte."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Inizia riconoscendo ciò che già funziona; da lì è più facile costruire.",
              "Condividi ciò che aiuta a casa: indicazioni concrete fanno risparmiare tempo.",
              "Chiedi e offri esempi osservabili, non etichette.",
              "Concordate un canale e una frequenza di contatto sostenibili.",
              "Chiudi ogni accordo con chi fa cosa ed entro quando."
            ]
          },
          {
            "kind": "callout",
            "tone": "calm",
            "title": "La tua voce conta",
            "text": "Nessuno conosce tuo figlio come te. Il tuo sguardo è un’informazione preziosa per il team docente."
          },
          {
            "kind": "resource",
            "file": "/kit/it/carta-escuela-familia.pdf",
            "label": "Modello di lettera Scuola–Famiglia",
            "description": "Modello modificabile per presentare bisogni e sostegni con chiarezza e cordialità."
          }
        ]
      },
      {
        "id": "adecuaciones",
        "title": "Adattamenti di accesso comuni",
        "blocks": [
          {
            "kind": "p",
            "text": "Gli adattamenti di accesso rimuovono barriere perché la persona mostri ciò che sa. Non abbassano le aspettative: livellano il terreno."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Tempo aggiuntivo per rispondere o finire i compiti.",
              "Istruzioni brevi, una alla volta, con supporto visivo.",
              "Un posto con meno distrazioni o l’uso di cuffie.",
              "Pause di movimento concordate, non vissute come punizione.",
              "Opzioni per mostrare ciò che si è appreso (orale, disegno, progetto).",
              "Anticipare i cambi di routine con avvisi e supporti visivi."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "Inizia da poco",
            "text": "Scegliete uno o due adattamenti, provate qualche settimana e regolate. I piccoli cambiamenti costanti fanno la differenza."
          },
          {
            "kind": "resource",
            "file": "/kit/it/adecuaciones-acceso.pdf",
            "label": "Checklist adattamenti di accesso",
            "description": "Elenco per rivedere e concordare i supporti con la scuola."
          }
        ]
      }
    ]
  },
  {
    "id": "C",
    "slug": "regulacion-sensorial-entorno",
    "icon": "waves",
    "title": "Regolazione sensoriale e ambiente",
    "area": "Terapia occupazionale e ambienti gentili",
    "summary": "Leggere i bisogni sensoriali e creare spazi prevedibili.",
    "sections": [
      {
        "id": "necesidades",
        "title": "Riconoscere i bisogni sensoriali",
        "blocks": [
          {
            "kind": "lead",
            "text": "Ogni persona vive suoni, luci, consistenze o movimento a modo suo. Riconoscere questi bisogni è il primo gesto di cura."
          },
          {
            "kind": "p",
            "text": "Alcuni ricevono troppo da un senso (iperreattività), altri hanno bisogno di più (iporeattività). Entrambe sono valide."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "Si copre le orecchie, socchiude gli occhi o evita certe consistenze o cibi.",
              "Cerca movimento, pressione o dondolio per calmarsi.",
              "Si sovraccarica in luoghi rumorosi, affollati o molto illuminati.",
              "Fatica a “tornare alla calma” dopo un sovraccarico."
            ]
          },
          {
            "kind": "callout",
            "tone": "care",
            "title": "Non sono capricci",
            "text": "Coprirsi le orecchie o aver bisogno di muoversi non è comportarsi male: è il corpo che chiede di regolarsi. Accompagnare vale più che correggere."
          }
        ]
      },
      {
        "id": "entorno",
        "title": "Adattare l’ambiente",
        "blocks": [
          {
            "kind": "p",
            "text": "Non serve una casa perfetta, ma un ambiente prevedibile e gentile. Piccoli aggiustamenti riducono lo stress di tutti."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Luce calda e regolabile; evita sfarfallii e riflessi forti.",
              "Riduci il rumore di fondo; tieni cuffie o tappi a portata di mano.",
              "Offri tessuti e abiti comodi; rispetta ciò che non tollerano.",
              "Anticipa la giornata con routine e supporti visivi.",
              "Tieni oggetti di regolazione (peluche pesato, pallina, masticabile)."
            ]
          },
          {
            "kind": "p",
            "text": "Un “angolo della calma” è un piccolo spazio accogliente dove rallentare, senza che sia una punizione."
          },
          {
            "kind": "steps",
            "items": [
              "Scegli un angolo tranquillo, con poca luce e rumore.",
              "Aggiungi tessuti morbidi, un cuscino e un oggetto di regolazione preferito.",
              "Presentalo come un luogo gentile, disponibile quando serve.",
              "Accompagna senza pretendere di parlare: a volte basta stare vicino."
            ]
          },
          {
            "kind": "resource",
            "file": "/kit/it/perfil-sensorial.pdf",
            "label": "Profilo sensoriale e piano ambientale",
            "description": "Guida per annotare le preferenze sensoriali e pianificare gli aggiustamenti in casa."
          }
        ]
      }
    ]
  },
  {
    "id": "D",
    "slug": "soporte-emocional",
    "icon": "hearthands",
    "title": "Supporto emotivo",
    "area": "Accompagnamento per chi cura e famiglie",
    "summary": "Prendersi cura di chi cura e accompagnare anche i fratelli.",
    "sections": [
      {
        "id": "contencion",
        "title": "Sostegno per chi cura",
        "blocks": [
          {
            "kind": "lead",
            "text": "Accompagni con tutto il tuo amore, e anche questo stanca. Prenderti cura di te non è egoismo: sostiene la cura della tua famiglia."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "Stanchezza che non passa con il riposo.",
              "Irritabilità, pianto facile o sensazione di “pilota automatico”.",
              "Mettere da parte i tuoi bisogni, legami o pause.",
              "Senso di colpa per riposare o per ciò che senti."
            ]
          },
          {
            "kind": "steps",
            "items": [
              "Ritaglia pause piccole e reali, anche di dieci minuti.",
              "Appoggiati alla tua rete: condividere la cura è anche curare.",
              "Parla di ciò che senti con una persona di fiducia o un professionista.",
              "Festeggia i piccoli progressi, i tuoi e di tuo figlio."
            ]
          },
          {
            "kind": "callout",
            "tone": "care",
            "title": "Chiedere aiuto è prendersi cura",
            "text": "Non devi farcela da solo/a con tutto. Cercare sostegno è forza, non un fallimento."
          },
          {
            "kind": "resource",
            "file": "/kit/it/contencion-cuidadores.pdf",
            "label": "Guida di sostegno per chi cura",
            "description": "Segni di esaurimento e strategie gentili di cura di sé e di rete."
          }
        ]
      },
      {
        "id": "hermanos",
        "title": "Spiegare ai fratelli",
        "blocks": [
          {
            "kind": "lead",
            "text": "Anche i fratelli sentono, chiedono e hanno bisogno di un posto. Spiegare con onestà e tenerezza rafforza i legami di tutta la famiglia."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "Usa parole semplici e adatte all’età; rispondi a ciò che chiedono.",
              "Convalida le loro emozioni: affetto, gelosia o rabbia, va bene.",
              "Spiega che equità non è dare lo stesso, ma ciò che ognuno ha bisogno.",
              "Invitali a partecipare senza responsabilità da adulti.",
              "Regala loro momenti da soli con te: anche loro hanno bisogno di sentirsi visti."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "Una conversazione, non un discorso",
            "text": "Non serve spiegare tutto in una volta. È un dialogo che cresce nel tempo e con le loro domande."
          },
          {
            "kind": "resource",
            "file": "/kit/it/explicar-hermanos.pdf",
            "label": "Guida per spiegare ai fratelli",
            "description": "Idee per età e frasi di supporto per parlare in famiglia."
          }
        ]
      }
    ]
  },
  {
    "id": "E",
    "slug": "derechos-y-tramites",
    "icon": "scale",
    "title": "Diritti e pratiche",
    "area": "Orientamento su diritti e sostegni",
    "summary": "Conoscere i tuoi diritti e i sostegni disponibili, in linguaggio chiaro.",
    "sections": [
      {
        "id": "derechos",
        "title": "I tuoi diritti, in chiaro",
        "blocks": [
          {
            "kind": "lead",
            "text": "Conoscere i diritti dà serenità e fermezza nell’accompagnare. Eccone alcuni, in parole semplici, che di solito si applicano."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Educazione inclusiva: imparare con i pari, con i supporti necessari.",
              "Non discriminazione: nessuno può essere escluso per come è o funziona.",
              "Accomodamenti ragionevoli: adattamenti per partecipare alla pari.",
              "Partecipazione: essere ascoltato e considerato nelle decisioni che lo riguardano.",
              "Informazione accessibile: ricevere spiegazioni chiare e comprensibili."
            ]
          },
          {
            "kind": "callout",
            "tone": "calm",
            "title": "Orientamento generale",
            "text": "Nomi e requisiti cambiano per Paese o regione. Verifica sempre con l’autorità o un’associazione locale di fiducia."
          }
        ]
      },
      {
        "id": "tramites",
        "title": "Pratiche e sostegni frequenti",
        "blocks": [
          {
            "kind": "p",
            "text": "Ogni luogo ha i suoi processi, ma molti sostegni si somigliano. Questa guida aiuta a capire da dove iniziare."
          },
          {
            "kind": "table",
            "columns": [
              "Sostegno",
              "Di solito serve per",
              "Dove si richiede"
            ],
            "rows": [
              [
                "Certificato di disabilità",
                "Accedere a sostegni e adattamenti",
                "Sanità pubblica o autorità locale"
              ],
              [
                "Relazione psicopedagogica",
                "Richiedere adattamenti scolastici",
                "Scuola o professionista abilitato"
              ],
              [
                "Borse o aiuti economici",
                "Terapie, materiali o trasporto",
                "Programmi sociali o educativi"
              ],
              [
                "Orientamento giuridico",
                "Chiarire dubbi sui diritti",
                "Associazioni o servizi legali"
              ]
            ]
          },
          {
            "kind": "steps",
            "items": [
              "Raccogli i documenti di base: documento, referti e valutazioni.",
              "Chiedi i requisiti aggiornati prima di andare; risparmi viaggi.",
              "Conserva copie di tutto ciò che consegni e ricevi.",
              "Appoggiati alle associazioni locali: conoscono la strada e accompagnano."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "Non è consulenza legale",
            "text": "Questa sezione è informativa e di accompagnamento. Per il tuo caso, cerca orientamento professionale locale."
          },
          {
            "kind": "resource",
            "file": "/kit/it/tramites-apoyos.pdf",
            "label": "Checklist pratiche e sostegni",
            "description": "Passi e documenti per organizzare le pratiche con calma."
          }
        ]
      }
    ]
  }
];
