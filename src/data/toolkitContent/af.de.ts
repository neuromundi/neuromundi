import type { ToolkitModule } from './types';

/** Werkzeuge — Bereich NEUROLOGISCHE ERKRANKUNGEN (Deutsch). Grundlage: WHO — ICD-11
 *  Kap.08 und IGAP. Allgemeine, unterstützende Orientierung; ersetzt NICHT dein
 *  medizinisches Team oder den Rettungsdienst. */
export const MODULES: ToolkitModule[] = [
  {
    id: 'A', slug: 'die-erkrankung-verstehen', icon: 'stethoscope',
    title: 'Die Erkrankung verstehen', area: 'Klare Information und ein gut genutzter Termin',
    summary: 'Worte ohne Angst und Fragen, die den Weg ordnen.',
    sections: [
      { id: 'glosario-af', title: 'Ein Glossar ohne Angst', blocks: [
        { kind: 'lead', text: 'Manche Begriffe klingen groß. Hier erzählen wir sie ruhig: Sie beschreiben Prozesse und Unterstützungen, sie definieren nicht, wer du oder dein Angehöriger bist.' },
        { kind: 'glossary', items: [
          { term: 'Neurologische Erkrankung', plain: 'Ein Zustand des Nervensystems (Gehirn, Rückenmark oder Nerven). Viele werden begleitet, und die Lebensqualität verbessert sich mit Unterstützung.' },
          { term: 'Neurologie', plain: 'Das Fachgebiet, das diese Erkrankungen untersucht und behandelt.' },
          { term: 'Rehabilitation', plain: 'Therapien, um Funktionen wiederzugewinnen oder auszugleichen und Selbstständigkeit zu gewinnen.' },
          { term: 'Chronisch', plain: 'Was lange begleitet; man steuert es, pflegt es und lebt damit.' },
          { term: 'Palliativversorgung', plain: 'Unterstützung mit Fokus auf Wohlbefinden und Linderung; sie fügt in jeder Phase Lebensqualität hinzu.' },
          { term: 'Adhärenz', plain: 'Den vereinbarten Plan (Medikamente, Therapien, Kontrollen) beständig einhalten.' },
        ] },
      ] },
      { id: 'consulta', title: 'Den Termin gut nutzen', blocks: [
        { kind: 'p', text: 'Die Zeit mit dem medizinischen Team ist wertvoll. Mit aufgeschriebenen Fragen zu kommen hilft, Wichtiges nicht zu vergessen.' },
        { kind: 'list', variant: 'check', items: [
          'Wie heißt die Erkrankung und was bedeutet sie im Alltag?',
          'Welche Zeichen soll ich beobachten, und welche sind dringend?',
          'Wofür ist jedes Medikament und welche Wirkungen sind zu erwarten?',
          'Welche Therapien helfen und wie oft?',
          'Wen rufe ich bei einer Frage oder einer Krise an?',
        ] },
        { kind: 'callout', tone: 'tip', title: 'Bring jemanden mit', text: 'Vier Ohren hören besser als zwei. Bitte um schriftliche Zusammenfassungen und frag ruhig „können Sie es anders sagen?".' },
      ] },
      { id: 'organizar', title: 'Die Informationen ordnen', blocks: [
        { kind: 'p', text: 'Ein einziger Ordner — auf Papier oder digital — mit Berichten, Untersuchungen, Medikamenten und Kontakten erspart das Wiederholen der Geschichte und beschleunigt jede Versorgung.' },
        { kind: 'resource', file: '/kit/af/de/carpeta-de-salud.pdf', label: 'Gesundheitsordner', description: 'Eine Vorlage, um Diagnosen, Untersuchungen, Medikamente und Schlüsselkontakte zu sammeln.' },
      ] },
    ],
  },
  {
    id: 'B', slug: 'rehabilitation-und-therapien', icon: 'activity',
    title: 'Rehabilitation und Therapien', area: 'Funktionen wiedergewinnen und ausgleichen',
    summary: 'Freundliche Beständigkeit, realistische Ziele und Übung zu Hause.',
    sections: [
      { id: 'tipos', title: 'Arten der Rehabilitation', blocks: [
        { kind: 'table', columns: ['Therapie', 'Wobei sie hilft'], rows: [
          ['Physiotherapie / Neuroreha', 'Kraft, Gleichgewicht, Gehen und Mobilität.'],
          ['Ergotherapie', 'Alltagsaktivitäten und Selbstständigkeit.'],
          ['Logopädie', 'Kommunikation, Stimme und Schlucken.'],
          ['Neuropsychologie', 'Gedächtnis, Aufmerksamkeit und exekutive Funktionen.'],
          ['Kognitive Rehabilitation', 'Strategien, um besser zu denken und sich zu organisieren.'],
        ] },
      ] },
      { id: 'constancia', title: 'Ziele und Beständigkeit', blocks: [
        { kind: 'steps', items: [
          'Vereinbart mit dem Team kleine, messbare Ziele („10 Meter mit Stütze gehen").',
          'Verteilt die Übung in kurze, häufige Dosen statt erschöpfender Einheiten.',
          'Haltet Fortschritte und Plateaus fest: Plateaus gehören zum Prozess, kein Versagen.',
          'Feiert jeden Erfolg und passt die Ziele mit dem Team an.',
        ] },
        { kind: 'callout', tone: 'calm', title: 'Dein eigenes Tempo', text: 'Erholung verläuft nicht linear. Gute und schwerere Tage bestehen nebeneinander; freundliche Beständigkeit bringt mehr als Druck.' },
      ] },
      { id: 'en-casa', title: 'Zu Hause üben', blocks: [
        { kind: 'list', items: [
          'Mach die vom Team angegebenen Übungen, ohne zusätzliche zu improvisieren.',
          'Verwebe die Übung in echte Routinen: Anziehen, Kochen, in den Hof gehen.',
          'Achte auf Sicherheit: freie Flächen und festes Schuhwerk.',
        ] },
        { kind: 'resource', file: '/kit/af/de/registro-de-terapias.pdf', label: 'Therapie-Tagebuch', description: 'Ein Wochentagebuch für Übungen, Fortschritte und Fragen für die nächste Sitzung.' },
      ] },
    ],
  },
  {
    id: 'C', slug: 'taegliche-pflege-zu-hause', icon: 'hearthands',
    title: 'Tägliche Pflege zu Hause', area: 'Wohlbefinden und Sicherheit im Alltag',
    summary: 'Sichere Medikation, Mobilität, Ernährung und Ruhe.',
    sections: [
      { id: 'medicacion', title: 'Sichere Medikation', blocks: [
        { kind: 'list', variant: 'check', items: [
          'Zeiten und Dosen einhalten; Wecker oder eine Wochen-Pillenbox nutzen.',
          'Dosen nicht ohne Rücksprache absetzen oder ändern: Manche Mittel brauchen schrittweise Anpassung.',
          'Beobachtete Wirkungen notieren und beim nächsten Termin ansprechen.',
          'Eine aktuelle Medikamentenliste immer griffbereit halten.',
        ] },
        { kind: 'callout', tone: 'care', title: 'Änderungen mit dem Team', text: 'Bestimmte Medikamente abrupt abzusetzen — zum Beispiel manche Antiepileptika — kann riskant sein. Jede Änderung mit deiner Ärztin oder deinem Arzt abstimmen.' },
      ] },
      { id: 'movilidad', title: 'Mobilität und Sturzprävention', blocks: [
        { kind: 'list', items: [
          'Lose Teppiche und Kabel entfernen; gute Beleuchtung ergänzen.',
          'Haltegriffe im Bad und in Fluren, falls nötig.',
          'Angegebene Hilfen (Gehstock, Rollator) ohne Scham nutzen: Sie geben Freiheit.',
          'Häufige Positionswechsel, wenn viel Zeit im Bett oder im Stuhl verbracht wird.',
        ] },
      ] },
      { id: 'alimentacion-descanso', title: 'Ernährung, Haut und Ruhe', blocks: [
        { kind: 'p', text: 'Bei Schluckproblemen (Dysphagie) die Hinweise zu Konsistenzen und Haltung beim Essen befolgen und bei häufigem Husten oder Verschlucken Rat einholen.' },
        { kind: 'list', items: [
          'Auf Flüssigkeitszufuhr und eine an die Hinweise angepasste Ernährung achten.',
          'Die Haut an Druckstellen prüfen, um Wunden vorzubeugen.',
          'Den Schlaf schützen: stabile Zeiten und ruhige Umgebung.',
        ] },
        { kind: 'resource', file: '/kit/af/de/plan-de-cuidados.pdf', label: 'Täglicher Pflegeplan', description: 'Eine Checkliste für Medikamente, Mobilität, Ernährung und Ruhe.' },
      ] },
    ],
  },
  {
    id: 'D', slug: 'warnzeichen-und-notfaelle', icon: 'pulse',
    title: 'Warnzeichen und Notfälle', area: 'Ruhig handeln, wenn es dringend ist',
    summary: 'Was beobachten, wie reagieren und wann dringend Hilfe holen.',
    sections: [
      { id: 'cuando-urge', title: 'Wann dringend Hilfe holen', blocks: [
        { kind: 'callout', tone: 'care', title: 'Im Zweifel den Rettungsdienst rufen', text: 'Dieser Leitfaden ist allgemein und ersetzt weder den Plan deines Teams noch den Rettungsdienst deines Landes. Bei Lebensgefahr sofort die örtliche Notrufnummer wählen.' },
        { kind: 'list', items: [
          'Plötzliche Schwäche in Gesicht, Arm oder Bein, Sprech- oder Sehstörung (möglicher Schlaganfall): schnell handeln, jede Minute zählt.',
          'Ein Anfall (Krampf) länger als 5 Minuten oder wiederholt ohne Wiedererlangen des Bewusstseins.',
          'Ein plötzlicher, extrem starker Kopfschmerz, anders als sonst.',
          'Hohes Fieber mit Nackensteife oder Verwirrtheit.',
          'Atemnot, Ersticken oder Bewusstlosigkeit.',
        ] },
      ] },
      { id: 'crisis', title: 'Erste Hilfe bei einem Anfall (Krampf)', blocks: [
        { kind: 'steps', items: [
          'Ruhig bleiben und schützen: Gegenstände wegräumen, an denen sich die Person verletzen könnte.',
          'Etwas Weiches unter den Kopf legen und Enges am Hals lockern.',
          'Nicht mit Kraft festhalten und nichts in den Mund stecken.',
          'Auf die Seite drehen (stabile Seitenlage), um die Atmung zu unterstützen.',
          'Den Anfall stoppen: Zeit messen; dauert er über 5 Minuten oder wiederholt sich, den Rettungsdienst rufen.',
          'Bis zur Erholung dabeibleiben und dem ärztlichen Plan folgen.',
        ] },
        { kind: 'callout', tone: 'calm', title: 'Nach dem Anfall', text: 'Schläfrigkeit oder Verwirrtheit danach sind normal. Sprich mit sanfter Stimme, gib Sicherheit und notiere das Geschehen für das medizinische Team.' },
      ] },
      { id: 'kit-emergencia', title: 'Sich vorbereiten', blocks: [
        { kind: 'list', variant: 'check', items: [
          'Ein von deinem Team geschriebener Notfallplan (was tun und wen anrufen).',
          'Eine Liste der Medikamente und Allergien, sichtbar und aktuell.',
          'Notfallkontakte und Neurologin/Neurologe griffbereit.',
          'Ein medizinisches Ausweisdokument oder Armband, falls empfohlen.',
        ] },
        { kind: 'resource', file: '/kit/af/de/plan-de-emergencia.pdf', label: 'Notfallplan', description: 'Eine Karte zum Ausfüllen mit deinem Team: Zeichen, Schritte und Schlüsselkontakte.' },
      ] },
    ],
  },
  {
    id: 'E', slug: 'rechte-antraege-und-hilfen', icon: 'scale',
    title: 'Rechte, Anträge und Hilfen', area: 'Behinderung, Hilfen und Sorge um die Pflegeperson',
    summary: 'Worauf du Anspruch hast und wie du die Pflege langfristig trägst.',
    sections: [
      { id: 'derechos-af', title: 'Du hast das Recht auf…', blocks: [
        { kind: 'list', variant: 'check', items: [
          'Würdevolle, kontinuierliche Versorgung mit klarer Information.',
          'Rehabilitation und die Unterstützungen, die du brauchst.',
          'Barrierefreiheit und angemessene Vorkehrungen bei Arbeit und Schule.',
          'Eine Behandlung ohne Diskriminierung wegen deiner Erkrankung.',
        ] },
        { kind: 'callout', tone: 'calm', title: 'Um Hilfe zu bitten ist ein Recht', text: 'Behinderungshilfen sind kein Gefallen: Sie gleichen Chancen aus. Informiere dich ohne Scham über die deines Landes.' },
      ] },
      { id: 'tramites', title: 'Häufige Anträge', blocks: [
        { kind: 'steps', items: [
          'Aktuelle Arztberichte in deinem Gesundheitsordner sammeln.',
          'Anerkennung oder Ausweis der Behinderung deines Landes und dessen Leistungen prüfen.',
          'Nach Hilfen für Transport, Medikamente, Therapien oder finanzieller Art fragen.',
          'Von jedem Antrag eine Kopie und die Verlängerungsdaten aufbewahren.',
        ] },
      ] },
      { id: 'cuidar-cuidador', title: 'Für die Pflegeperson sorgen', blocks: [
        { kind: 'lead', text: 'Das Wohl der pflegenden Person trägt alles andere. Für dich zu sorgen ist kein Egoismus: Es gehört zur Pflege.' },
        { kind: 'list', items: [
          'Aufgaben teilen und Hilfe annehmen: Niemand schafft immer alles.',
          'Momente der Ruhe und Entlastung einplanen, auch kurze.',
          'Peer-Selbsthilfegruppen suchen (bei Neuromundi gibt es die Neurocamps).',
          'Professionelle Hilfe suchen, wenn Erschöpfung, Traurigkeit oder Angst anhalten.',
        ] },
        { kind: 'resource', file: '/kit/af/de/red-de-apoyo.pdf', label: 'Karte des Unterstützungsnetzes', description: 'Eine Vorlage, um zu ordnen, wer wobei hilft, und die Pflege-Übergaben.' },
      ] },
    ],
  },
];
