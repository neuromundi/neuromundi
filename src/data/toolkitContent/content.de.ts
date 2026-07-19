import type { ToolkitModule } from './types';

export const MODULES: ToolkitModule[] = [
  {
    "id": "A",
    "slug": "gestion-clinico-medica",
    "icon": "stethoscope",
    "title": "Klinisch-medizinische Begleitung",
    "area": "Fachleute für Entwicklung und Gesundheit",
    "summary": "Begriffe verstehen, ruhig beobachten und wissen, an wen man sich wendet.",
    "sections": [
      {
        "id": "glosario",
        "title": "Glossar in einfacher Sprache",
        "blocks": [
          {
            "kind": "lead",
            "text": "Manche Wörter klingen groß oder kühl. Hier erklären wir sie in Ruhe: Sie beschreiben Abläufe und Hilfen, niemals, wer Ihr Kind ist."
          },
          {
            "kind": "glossary",
            "items": [
              {
                "term": "Diagnostik",
                "plain": "Mehrere Treffen, um zu verstehen, wie jemand lernt, kommuniziert und in Beziehung tritt. Keine Prüfung mit Bestehen oder Durchfallen."
              },
              {
                "term": "Diagnose",
                "plain": "Ein Name, der bei der Auswahl der Hilfen hilft. Er beschreibt eine Art zu funktionieren; er reduziert die Person nicht."
              },
              {
                "term": "Neurodivergenz",
                "plain": "Eine andere — nicht geringere — Art wahrzunehmen, zu denken und zu fühlen."
              },
              {
                "term": "Sensorische Integration",
                "plain": "Begleitung, damit die Sinne ruhiger arbeiten und der Alltag angenehmer wird."
              },
              {
                "term": "Überweisung",
                "plain": "Wenn eine Fachperson vorschlägt, eine weitere Fachkraft ins Team zu holen."
              },
              {
                "term": "Ausgangswert",
                "plain": "Eine Momentaufnahme des Ausgangspunkts, um Fortschritte zu erkennen."
              },
              {
                "term": "Berufszulassung",
                "plain": "Der Nachweis, dass eine Fachperson zugelassen ist."
              },
              {
                "term": "Standardisierte Tests",
                "plain": "Hilfsmittel: ein Teil der Geschichte, nie das Ganze."
              }
            ]
          },
          {
            "kind": "callout",
            "tone": "calm",
            "title": "Denk daran",
            "text": "Sie dürfen jeden Begriff so oft erklären lassen, wie Sie möchten. Ein gutes Team tut das gern."
          }
        ]
      },
      {
        "id": "bitacora-abc",
        "title": "Leitfaden ABC-Beobachtung",
        "blocks": [
          {
            "kind": "lead",
            "text": "Das ABC-Protokoll ist eine einfache Art, ohne Wertung zu beobachten. Es hilft, Muster zu erkennen und besser zu begleiten."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "A — Auslöser: was kurz davor geschah (Ort, Personen, Aktivität, Änderungen).",
              "B — Verhalten: was Sie beobachtet haben, neutral und konkret, ohne Etiketten.",
              "C — Konsequenz: was danach geschah und wie sich die Lage beruhigte."
            ]
          },
          {
            "kind": "steps",
            "items": [
              "Notieren Sie wenig und bald: ein paar Zeilen im Moment sind mehr wert als ein perfekter Text später.",
              "Beschreiben Sie, was Sie in einem Video sehen würden, nicht, was Sie vermuten.",
              "Nach mehreren Einträgen suchen Sie Muster: wiederkehrende Zeiten, Orte oder Auslöser.",
              "Bringen Sie das Protokoll zu Terminen mit: ein Geschenk an Informationen fürs Team."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "Ohne Schuld",
            "text": "Beim Protokoll geht es nicht um „braves Verhalten“, sondern darum, Bedürfnisse zu verstehen und ruhiger zu reagieren."
          },
          {
            "kind": "resource",
            "file": "/kit/de/bitacora-abc.pdf",
            "label": "Beobachtungsprotokoll (ABC)",
            "description": "Druckbare Vorlage für Auslöser, Verhalten und Konsequenzen."
          }
        ]
      },
      {
        "id": "matriz",
        "title": "Fachrichtungs-Matrix",
        "blocks": [
          {
            "kind": "p",
            "text": "Für jedes Bedürfnis gibt es meist eine Fachrichtung, die am besten begleitet. Diese Matrix ist ein Kompass, keine Regel: Unterstützung ist oft Teamarbeit."
          },
          {
            "kind": "table",
            "columns": [
              "Was Sie beobachten",
              "Wer meist begleitet",
              "Wobei es hilft"
            ],
            "rows": [
              [
                "Sprache & Kommunikation",
                "Logopädie",
                "Sprechen, Verstehen und alternative Kommunikation."
              ],
              [
                "Selbstständigkeit & Alltag",
                "Ergotherapie",
                "Anziehen, Essen, Schreiben und sensorische Regulation."
              ],
              [
                "Bewegung & Haltung",
                "Physiotherapie",
                "Kraft, Gleichgewicht und Koordination."
              ],
              [
                "Emotionen & Bindung",
                "Psychologie",
                "Emotionsregulation und Strategien für zu Hause."
              ],
              [
                "Schulisches Lernen",
                "Lernförderung / Sonderpädagogik",
                "Lernstrategien und Anpassungen."
              ],
              [
                "Schlaf, Ernährung & Gesundheit",
                "Pädiatrie / Neuropädiatrie",
                "Medizinische und Entwicklungs-Begleitung."
              ]
            ],
            "caption": "Allgemeine Orientierung für den Anfang."
          },
          {
            "kind": "resource",
            "file": "/kit/de/matriz-especialidades.pdf",
            "label": "Fachrichtungs-Matrix",
            "description": "Tabelle, welche Fachkraft welches Bedürfnis begleitet."
          },
          {
            "kind": "resource",
            "file": "/kit/de/glosario.pdf",
            "label": "Glossar in einfacher Sprache",
            "description": "Die häufigsten Begriffe, einfach erklärt."
          }
        ]
      }
    ]
  },
  {
    "id": "B",
    "slug": "adaptacion-educativa",
    "icon": "graduation",
    "title": "Bildungsanpassung",
    "area": "Inklusive Schulen & Zentren",
    "summary": "Brücken zur Schule bauen und Zugangshilfen kennenlernen.",
    "sections": [
      {
        "id": "carta",
        "title": "Kommunikation Schule–Familie",
        "blocks": [
          {
            "kind": "lead",
            "text": "Schule und Familie sind ein Team mit einem gemeinsamen Ziel: dass Ihr Kind lernt und sich wohlfühlt. Klare, freundliche Kommunikation öffnet Türen."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Beginnen Sie mit dem, was schon klappt; darauf lässt sich leichter aufbauen.",
              "Teilen Sie, was zu Hause hilft: konkrete Hinweise sparen allen Weg.",
              "Bitten Sie um beobachtbare Beispiele und geben Sie sie – keine Etiketten.",
              "Vereinbaren Sie einen Kanal und eine Kontakthäufigkeit, die tragbar sind.",
              "Schließen Sie jede Absprache mit Wer-macht-was-bis-wann ab."
            ]
          },
          {
            "kind": "callout",
            "tone": "calm",
            "title": "Ihre Stimme zählt",
            "text": "Niemand kennt Ihr Kind wie Sie. Ihr Blick ist wertvolle Information für das Lehrteam."
          },
          {
            "kind": "resource",
            "file": "/kit/de/carta-escuela-familia.pdf",
            "label": "Vorlage Brief Schule–Familie",
            "description": "Bearbeitbare Vorlage, um Bedürfnisse und Hilfen klar und herzlich zu benennen."
          }
        ]
      },
      {
        "id": "adecuaciones",
        "title": "Häufige Zugangshilfen",
        "blocks": [
          {
            "kind": "p",
            "text": "Zugangshilfen beseitigen Hürden, damit jemand zeigen kann, was er kann. Sie senken nicht die Erwartungen, sie schaffen faire Bedingungen."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Mehr Zeit zum Antworten oder Fertigstellen.",
              "Kurze Anweisungen, einzeln, mit visueller Unterstützung.",
              "Ein Ort mit weniger Ablenkung oder Kopfhörer.",
              "Vereinbarte Bewegungspausen, nicht als Strafe empfunden.",
              "Optionen, Gelerntes zu zeigen (mündlich, Zeichnung, Projekt).",
              "Routineänderungen mit Ankündigung und visuellen Hilfen vorbereiten."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "Klein anfangen",
            "text": "Wählen Sie ein bis zwei Hilfen, testen Sie ein paar Wochen und passen Sie an. Kleine, stetige Änderungen wirken."
          },
          {
            "kind": "resource",
            "file": "/kit/de/adecuaciones-acceso.pdf",
            "label": "Checkliste Zugangshilfen",
            "description": "Liste, um Hilfen mit der Schule zu prüfen und zu vereinbaren."
          }
        ]
      }
    ]
  },
  {
    "id": "C",
    "slug": "regulacion-sensorial-entorno",
    "icon": "waves",
    "title": "Sensorische Regulation & Umfeld",
    "area": "Ergotherapie & reizarme Räume",
    "summary": "Sensorische Bedürfnisse lesen und vorhersehbare Räume schaffen.",
    "sections": [
      {
        "id": "necesidades",
        "title": "Sensorische Bedürfnisse erkennen",
        "blocks": [
          {
            "kind": "lead",
            "text": "Jeder erlebt Geräusche, Licht, Texturen oder Bewegung auf eigene Weise. Diese Bedürfnisse zu erkennen ist die erste Fürsorge."
          },
          {
            "kind": "p",
            "text": "Manche nehmen von einem Sinn zu viel wahr (Überempfindlichkeit), andere brauchen mehr (Unterempfindlichkeit). Beides ist gültig."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "Hält sich die Ohren zu, kneift die Augen zusammen oder meidet Texturen/Speisen.",
              "Sucht Bewegung, Druck oder Schaukeln zur Beruhigung.",
              "Wird an lauten, vollen oder hell beleuchteten Orten überfordert.",
              "Kommt nach Überlastung schwer „zur Ruhe zurück“."
            ]
          },
          {
            "kind": "callout",
            "tone": "care",
            "title": "Keine Launen",
            "text": "Ohren zuhalten oder Bewegung brauchen ist kein Fehlverhalten: Der Körper bittet um Regulation. Begleiten ist mehr wert als Korrigieren."
          }
        ]
      },
      {
        "id": "entorno",
        "title": "Das Umfeld anpassen",
        "blocks": [
          {
            "kind": "p",
            "text": "Es geht nicht um ein perfektes Zuhause, sondern um ein vorhersehbares, freundliches Umfeld. Kleine Anpassungen senken den Stress für alle."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Warmes, dimmbares Licht; Flackern und grelles Blenden vermeiden.",
              "Hintergrundgeräusche senken; Kopfhörer/Ohrstöpsel bereithalten.",
              "Bequeme Texturen und Kleidung anbieten; Unverträgliches respektieren.",
              "Den Tag mit Routinen und visuellen Hilfen vorbereiten.",
              "Regulationsobjekte bereithalten (Gewichtstier, Ball, Kauhilfe)."
            ]
          },
          {
            "kind": "p",
            "text": "Eine „Ruheecke“ ist ein kleiner, gemütlicher Ort zum Runterkommen – keine Strafe."
          },
          {
            "kind": "steps",
            "items": [
              "Wählen Sie eine ruhige Ecke mit wenig Licht und Lärm.",
              "Weiche Texturen, ein Kissen und ein Lieblings-Regulationsobjekt dazugeben.",
              "Als freundlichen Ort vorstellen, jederzeit verfügbar.",
              "Begleiten, ohne Reden zu verlangen: manchmal reicht Nähe."
            ]
          },
          {
            "kind": "resource",
            "file": "/kit/de/perfil-sensorial.pdf",
            "label": "Sensorisches Profil & Umfeldplan",
            "description": "Leitfaden zum Erfassen sensorischer Vorlieben und Planen von Anpassungen."
          }
        ]
      }
    ]
  },
  {
    "id": "D",
    "slug": "soporte-emocional",
    "icon": "hearthands",
    "title": "Emotionale Unterstützung",
    "area": "Begleitung für Betreuende & Familien",
    "summary": "Für die Betreuenden sorgen und auch Geschwister begleiten.",
    "sections": [
      {
        "id": "contencion",
        "title": "Halt für Betreuende",
        "blocks": [
          {
            "kind": "lead",
            "text": "Sie begleiten mit all Ihrer Liebe, und das ermüdet auch. Für sich zu sorgen ist nicht egoistisch: Es trägt die Fürsorge für Ihre Familie."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "Müdigkeit, die trotz Ruhe bleibt.",
              "Reizbarkeit, schnelle Tränen oder Gefühl vom „Autopiloten“.",
              "Eigene Bedürfnisse, Beziehungen oder Pausen hintanstellen.",
              "Schuldgefühle beim Ausruhen oder für Ihre Gefühle."
            ]
          },
          {
            "kind": "steps",
            "items": [
              "Planen Sie kleine, echte Pausen ein, auch nur zehn Minuten.",
              "Stützen Sie sich auf Ihr Netz: Fürsorge zu teilen ist auch Fürsorge.",
              "Sprechen Sie über Ihre Gefühle mit Vertrauten oder Fachleuten.",
              "Feiern Sie kleine Fortschritte, Ihre und die Ihres Kindes."
            ]
          },
          {
            "kind": "callout",
            "tone": "care",
            "title": "Um Hilfe bitten ist Fürsorge",
            "text": "Sie müssen nicht alles allein schaffen. Hilfe zu suchen ist Stärke, kein Versagen."
          },
          {
            "kind": "resource",
            "file": "/kit/de/contencion-cuidadores.pdf",
            "label": "Leitfaden für Betreuende",
            "description": "Anzeichen von Erschöpfung sowie sanfte Selbstfürsorge- und Netzwerkstrategien."
          }
        ]
      },
      {
        "id": "hermanos",
        "title": "Geschwistern erklären",
        "blocks": [
          {
            "kind": "lead",
            "text": "Geschwister fühlen, fragen und brauchen auch einen Platz. Ehrlich und liebevoll zu erklären stärkt die Bindungen der ganzen Familie."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "Einfache, altersgerechte Worte; beantworten Sie, was sie fragen.",
              "Gefühle anerkennen: Liebe, Eifersucht oder Wut sind in Ordnung.",
              "Erklären Sie: Fairness heißt nicht Gleiches, sondern was jeder braucht.",
              "Laden Sie sie zum Mitmachen ein, ohne Erwachsenenpflichten.",
              "Schenken Sie ihnen Zeit allein mit Ihnen: Auch sie wollen gesehen werden."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "Ein Gespräch, keine Rede",
            "text": "Sie müssen nicht alles auf einmal erklären. Es ist ein Dialog, der mit der Zeit und ihren Fragen wächst."
          },
          {
            "kind": "resource",
            "file": "/kit/de/explicar-hermanos.pdf",
            "label": "Leitfaden für Geschwister",
            "description": "Ideen nach Alter und unterstützende Sätze für Familiengespräche."
          }
        ]
      }
    ]
  },
  {
    "id": "E",
    "slug": "derechos-y-tramites",
    "icon": "scale",
    "title": "Rechte & Anträge",
    "area": "Orientierung zu Rechten & Hilfen",
    "summary": "Ihre Rechte und verfügbare Hilfen in klarer Sprache kennen.",
    "sections": [
      {
        "id": "derechos",
        "title": "Ihre Rechte, klar erklärt",
        "blocks": [
          {
            "kind": "lead",
            "text": "Rechte zu kennen gibt Ruhe und Halt beim Begleiten. Hier einige, die meist gelten, einfach erklärt."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Inklusive Bildung: mit Gleichaltrigen lernen, mit nötigen Hilfen.",
              "Nichtdiskriminierung: Niemand darf wegen seiner Art ausgeschlossen werden.",
              "Angemessene Vorkehrungen: Anpassungen für gleichberechtigte Teilhabe.",
              "Teilhabe: gehört und berücksichtigt werden bei sie betreffenden Entscheidungen.",
              "Zugängliche Information: klare, verständliche Erklärungen erhalten."
            ]
          },
          {
            "kind": "callout",
            "tone": "calm",
            "title": "Allgemeine Orientierung",
            "text": "Namen und Voraussetzungen variieren je nach Land oder Region. Bestätigen Sie stets bei der Behörde oder einem vertrauenswürdigen Verein."
          }
        ]
      },
      {
        "id": "tramites",
        "title": "Häufige Anträge & Hilfen",
        "blocks": [
          {
            "kind": "p",
            "text": "Jeder Ort hat eigene Abläufe, doch viele Hilfen ähneln sich. Dieser Leitfaden zeigt, wo man anfängt."
          },
          {
            "kind": "table",
            "columns": [
              "Hilfe",
              "Hilft meist bei",
              "Wo beantragen"
            ],
            "rows": [
              [
                "Behinderungsnachweis",
                "Zugang zu Hilfen und Anpassungen",
                "Öffentliche Gesundheit oder Behörde"
              ],
              [
                "Psychopädagogischer Bericht",
                "Schulische Anpassungen beantragen",
                "Schule oder zugelassene Fachkraft"
              ],
              [
                "Zuschüsse oder finanzielle Hilfen",
                "Therapien, Material oder Transport",
                "Sozial- oder Bildungsprogramme"
              ],
              [
                "Rechtsberatung",
                "Fragen zu Rechten klären",
                "Vereine oder Rechtsdienste"
              ]
            ]
          },
          {
            "kind": "steps",
            "items": [
              "Grunddokumente sammeln: Ausweis, Berichte und Gutachten.",
              "Aktuelle Anforderungen vorab erfragen; das spart Wege.",
              "Bewahren Sie Kopien von allem auf, was Sie ein- und erhalten.",
              "Stützen Sie sich auf lokale Vereine: Sie kennen den Weg und begleiten."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "Keine Rechtsberatung",
            "text": "Dieser Abschnitt ist informativ und begleitend. Für Ihren Fall suchen Sie lokale fachliche Beratung."
          },
          {
            "kind": "resource",
            "file": "/kit/de/tramites-apoyos.pdf",
            "label": "Checkliste Anträge & Hilfen",
            "description": "Schritte und Dokumente, um Ihre Anträge in Ruhe zu ordnen."
          }
        ]
      }
    ]
  }
];
