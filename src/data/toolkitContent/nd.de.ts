import type { ToolkitModule } from './types';

/** Werkzeuge — Bereich NEUROENTWICKLUNG (Deutsch). Allgemeine, herzliche und NICHT
 *  diagnostische Orientierung für Familien, die die kindliche Entwicklung begleiten. */
export const MODULES: ToolkitModule[] = [
  {
    id: 'A', slug: 'entwicklungsmeilensteine', icon: 'sprout',
    title: 'Entwicklungsmeilensteine', area: 'Früherkennung der Entwicklung',
    summary: 'Was man je nach Alter beobachtet — ruhig und ohne zu vergleichen.',
    sections: [
      { id: 'que-son', title: 'Was Meilensteine sind (und was nicht)', blocks: [
        { kind: 'lead', text: 'Meilensteine sind ungefähre Hinweise darauf, wie ein Kind sich bewegt, kommuniziert, spielt und in Beziehung tritt. Ein Wegweiser zum Begleiten, kein Wettlauf und keine Prüfung.' },
        { kind: 'p', text: 'Jedes Kind hat sein eigenes Tempo. Altersspannen sind Durchschnittswerte: etwas früher oder später zu sein liegt meist im Erwartbaren. Wichtig ist der Verlauf über die Zeit, nicht ein einzelner Tag.' },
        { kind: 'callout', tone: 'calm', title: 'Ein Kompass, kein Lineal', text: 'Wenn dich etwas beunruhigt, zählt deine Beobachtung. Früh um Rat zu fragen „etikettiert" niemanden: Es öffnet Türen zu Unterstützungen, die das Leben leichter machen.' },
      ] },
      { id: 'por-edad', title: 'Was man beobachtet, nach Bereich', blocks: [
        { kind: 'p', text: 'Vier Bereiche wachsen zusammen. Diese Tabelle zeigt Beispiele, was meist auftritt und wann es hilft, mit einer vertrauten Fachperson zu sprechen.' },
        { kind: 'table', columns: ['Bereich', 'Was meist auftritt', 'Beratung sinnvoll, wenn…'], rows: [
          ['Motorik', 'Hält den Kopf, sitzt, krabbelt, läuft, hantiert mit Objekten.', 'Mit 12 Monaten keinerlei Fortbewegung, oder der Körper wirkt sehr steif oder sehr schlaff.'],
          ['Kommunikation', 'Brabbelt, zeigt, erste Wörter, verbindet zwei Wörter.', 'Mit 18 Monaten keine Wörter mit Absicht oder kein Zeigen zum Bitten oder Zeigen.'],
          ['Sozial-emotional', 'Lächelt, sucht Blickkontakt, teilt Aufmerksamkeit, ahmt Gesten nach.', 'Reagiert nicht auf den Namen, meidet Kontakt oder verliert bereits Gekonntes.'],
          ['Kognition und Spiel', 'Erkundet, sucht versteckte Objekte, spielt „so tun als ob", löst kleine Aufgaben.', 'Kein Als-ob-Spiel um das 2. Jahr, oder sehr geringes Interesse am Erkunden.'],
        ], caption: 'Orientierende Beispiele; die Spannen variieren zwischen Quellen und Kindern.' },
        { kind: 'callout', tone: 'care', title: 'Ein Zeichen, das nicht warten sollte', text: 'Bereits Gekonntes zu verlieren (aufhören zu sprechen, zu blicken oder wie zuvor zu spielen) verdient eine baldige Abklärung — ohne Alarm.' },
      ] },
      { id: 'glosario-nd', title: 'Worte, die helfen', blocks: [
        { kind: 'glossary', items: [
          { term: 'Entwicklungsüberwachung', plain: 'Liebevoll und fortlaufend beobachten, wie das Kind wächst und lernt, bei jeder Vorsorge.' },
          { term: 'Frühförderung', plain: 'Unterstützungen der ersten Jahre, die Entwicklung und Bindung stärken.' },
          { term: 'Verlauf', plain: 'Die Richtung der Fortschritte über die Zeit; wichtiger als ein Einzelwert.' },
          { term: 'Anregung', plain: 'Alltagserfahrungen und Spiel anbieten, die zum Erkunden einladen, ohne Druck.' },
        ] },
        { kind: 'resource', file: '/kit/nd/de/hitos-por-edad.pdf', label: 'Meilensteine nach Alter', description: 'Druckbare Tabelle nach Bereichen und Alter für dein Tagebuch, mit Platz für Notizen.' },
      ] },
    ],
  },
  {
    id: 'B', slug: 'spiel-und-anregung', icon: 'blocks',
    title: 'Spiel und Anregung', area: 'Spielend lernen im Alltag',
    summary: 'Spiel ist der Motor: einfache Ideen, ohne zu überreizen.',
    sections: [
      { id: 'juego-motor', title: 'Spiel, die beste Lehrmeisterin', blocks: [
        { kind: 'lead', text: 'Kein teures Spielzeug und keine Bildschirme nötig. Bindung, Stimme und Alltagsgegenstände reichen zum Lernen.' },
        { kind: 'list', variant: 'check', items: [
          'Folge dem Interesse des Kindes: Schaut es etwas an, benenne es und spiel damit.',
          'Weniger ist mehr: wenige Objekte, kurze Runden und viele Wiederholungen.',
          'Benenne, was ihr beide tut: „du baust den Turm", „er fällt", „nochmal".',
          'Warte und beobachte: Lass Pausen, damit es in seinem Tempo antwortet.',
        ] },
      ] },
      { id: 'ideas-edad', title: 'Ideen nach Phase', blocks: [
        { kind: 'table', columns: ['Phase', 'Einfaches Spiel', 'Was es stärkt'], rows: [
          ['0–12 Monate', 'Guck-guck, Lieder mit Gesten, in den Spiegel schauen.', 'Geteilte Aufmerksamkeit, Bindung, Vorfreude.'],
          ['1–2 Jahre', 'Objekte rein- und rausräumen, Türme, im Buch zeigen.', 'Motorik, erste Wörter, Ursache-Wirkung.'],
          ['2–3 Jahre', 'Als-ob-Spiel (die Puppe füttern), Steckspiele.', 'Sprache, Fantasie, Problemlösen.'],
          ['3–5 Jahre', 'Rollen (Laden, Arzt), nach Farbe oder Größe sortieren.', 'Soziale Fähigkeiten, exekutive Funktionen.'],
        ] },
        { kind: 'callout', tone: 'tip', title: 'Routinen, die lehren', text: 'Baden, Essen und Anziehen sind Gold: Erzähle die Schritte und biete kleine Wahlmöglichkeiten („die rote oder die blaue?").' },
      ] },
      { id: 'sin-sobreestimular', title: 'Anregen ohne zu überfluten', blocks: [
        { kind: 'steps', items: [
          'Achte auf Müdigkeitszeichen: dreht das Gesicht weg, wird unruhig, reibt die Augen.',
          'Fahr herunter: weniger Reize, sanfte Stimme, ein einziges Spiel.',
          'Biete Ruhe vor dem Schlaf: gedämpftes Licht, keine Bildschirme, vorhersehbare Routine.',
        ] },
        { kind: 'resource', file: '/kit/nd/de/ideas-de-juego.pdf', label: 'Spielideen nach Alter', description: 'Kurze Karten mit selbstgemachten, günstigen Vorschlägen.' },
      ] },
    ],
  },
  {
    id: 'C', slug: 'respektvolle-erziehung-und-bindung', icon: 'hearthands',
    title: 'Respektvolle Erziehung und Bindung', area: 'Die affektive Seite der Entwicklung',
    summary: 'Eine sichere Bindung ist die Basis, auf der alles aufbaut.',
    sections: [
      { id: 'apego', title: 'Eine Bindung, die Sicherheit gibt', blocks: [
        { kind: 'lead', text: 'Wenn ein Kind spürt, dass jemand verfügbar und verlässlich ist, traut es sich zu erkunden. Zuwendung „verwöhnt" nicht: sie trägt.' },
        { kind: 'p', text: 'Auf sein Weinen zu reagieren, zu benennen, was es fühlt, und gemeinsam zur Ruhe zurückzufinden — so lernt es Schritt für Schritt, sich innerlich zu regulieren.' },
      ] },
      { id: 'regular-calma', title: 'Den Wutanfall ruhig begleiten', blocks: [
        { kind: 'steps', items: [
          'Zuerst deine Ruhe: atme; deine Gelassenheit ist ansteckend.',
          'In Worte fassen: „du bist sehr wütend, weil das Spiel vorbei ist".',
          'Nähe statt Predigt: manchmal reicht es, daneben zu sein.',
          'Wenn die Welle vorbei ist, versöhne dich und kehre zur Routine zurück — ohne Strafen oder Etiketten.',
        ] },
        { kind: 'callout', tone: 'calm', title: 'Es ist nicht gegen dich', text: 'Ein Wutanfall ist meist ein überfordertes kleines Gehirn, keine Manipulation. Selbstregulation zu reifen dauert Jahre.' },
      ] },
      { id: 'sin-comparar', title: 'Den Blick pflegen', blocks: [
        { kind: 'list', items: [
          'Vermeide Vergleiche mit Geschwistern oder anderen Kindern: jedes hat seinen eigenen Kalender.',
          'Feiere die Anstrengung, nicht nur den Erfolg: „du hast es oft versucht".',
          'Sorge auch für dich: Wer erholt begleitet, begleitet besser.',
        ] },
        { kind: 'resource', file: '/kit/nd/de/rutinas-visuales.pdf', label: 'Visuelle Routinen für zu Hause', description: 'Hilfekarten, um den Tag vorwegzunehmen und Konflikte zu verringern.' },
      ] },
    ],
  },
  {
    id: 'D', slug: 'schuleintritt', icon: 'graduation',
    title: 'Eintritt in die Schulwelt', area: 'Kita, Vorschule und erste Anpassungen',
    summary: 'Ein freundliches Umfeld wählen und ein Bündnis mit der Schule aufbauen.',
    sections: [
      { id: 'elegir-entorno', title: 'Worauf man bei der Wahl achtet', blocks: [
        { kind: 'list', variant: 'check', items: [
          'Warmer, respektvoller Umgang mit Kindern und Familien.',
          'Nicht überfüllte Gruppen und genug Erwachsene zum Begleiten.',
          'Offenheit für Anpassungen und häufige Kommunikation.',
          'Vorhersehbare Routinen und Räume, die nicht überreizen.',
        ] },
      ] },
      { id: 'alianza-escuela', title: 'Bündnis Schule–Familie', blocks: [
        { kind: 'steps', items: [
          'Teile, was zu Hause funktioniert: Interessen, Beruhigendes, Müdigkeitszeichen.',
          'Vereinbart einen einfachen Kommunikationsweg (Heft, kurze Nachrichten).',
          'Legt nach wenigen Wochen ein Folgegespräch fest.',
        ] },
        { kind: 'resource', file: '/kit/nd/de/carta-inicio-escolar.pdf', label: 'Brief zum Schulstart', description: 'Eine Vorlage, um dein Kind und die hilfreichen Unterstützungen vorzustellen.' },
      ] },
      { id: 'adaptaciones-tempranas', title: 'Einfache Anpassungen', blocks: [
        { kind: 'list', items: [
          'Veränderungen mit Bildern oder kurzen Hinweisen ankündigen.',
          'Eine Ruhe-Ecke zur Selbstregulation.',
          'Kurze Anweisungen und eine Sache nach der anderen.',
          'Eine flexible Eingewöhnungszeit am Anfang.',
        ] },
      ] },
    ],
  },
  {
    id: 'E', slug: 'rechte-und-erste-hilfen', icon: 'scale',
    title: 'Rechte und erste Hilfen', area: 'Wege der Frühförderung und Rechte',
    summary: 'Worauf du Anspruch hast und wie du Unterstützungen startest.',
    sections: [
      { id: 'derechos-nd', title: 'Du hast das Recht auf…', blocks: [
        { kind: 'list', variant: 'check', items: [
          'Entwicklungsüberwachung bei jeder Vorsorge.',
          'Klare Information ohne Fachjargon und eine Zweitmeinung.',
          'Frühförderleistungen bei Bedarf.',
          'Bildungsinklusion von den ersten Jahren an.',
        ] },
        { kind: 'callout', tone: 'calm', title: 'Ohne Schuldgefühle', text: 'Früh Unterstützung zu suchen ist ein Akt der Fürsorge, kein Versagen. Je früher, desto einfacher ist das Begleiten meist.' },
      ] },
      { id: 'rutas', title: 'Wie du beginnst', blocks: [
        { kind: 'steps', items: [
          'Notiere Beobachtungen und Fragen vor dem Termin (nutze das Tagebuch).',
          'Sprich mit der Kinderarztpraxis oder dem Gesundheitszentrum über die Entwicklungsüberwachung.',
          'Bitte gegebenenfalls um eine Frühförder-Abklärung.',
          'Sammle das Verzeichnis der Hilfen in deiner Region und bewahre jeden Bericht auf.',
        ] },
        { kind: 'glossary', items: [
          { term: 'Frühförderung', plain: 'Ein Unterstützungsprogramm der ersten Jahre, idealerweise in natürlichen Umgebungen (zu Hause, Schule).' },
          { term: 'Bericht', plain: 'Dokument mit Beobachtungen und Empfehlungen; bewahre es auf, es hilft bei Anträgen.' },
          { term: 'Inklusion', plain: 'Dass sich die Umgebung an das Kind anpasst, nicht umgekehrt.' },
        ] },
        { kind: 'resource', file: '/kit/nd/de/directorio-apoyos.pdf', label: 'Verzeichnis erster Hilfen', description: 'Eine Vorlage, um Kontakte, Termine und Berichte an einem Ort zu ordnen.' },
      ] },
    ],
  },
];
