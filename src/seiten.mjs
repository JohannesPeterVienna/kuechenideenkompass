// Seitenverzeichnis: Meta-Angaben je Seite. Inhalt liegt in src/content/<slug>.html
export const DOMAIN = 'https://kuechenideenkompass.de';

const KERN = ['kueche-daten.js', 'werkbank-kern.js'];

export const SEITEN = [
  {
    slug: '', typ: 'uebersicht', kurz: 'Startseite',
    titel: 'Rezept-Werkbank AT · DE · CH – Rezepte umrechnen & übersetzen | Küchenideenkompass',
    beschreibung: 'Rezept einfügen und in einem Durchgang auf Portionen, Backform und Einheiten umrechnen – mit dag, Obers, Topfen und Germ. Druckfertig, mit Einkaufsliste.',
    h1: 'Rezept-Werkbank für Österreich, Deutschland und die Schweiz'
  },
  {
    slug: 'rezept-umrechnen', typ: 'werkzeug', kurz: 'Rezept umrechnen', skripte: [...KERN, 'werkbank-ui.js'],
    titel: 'Rezept umrechnen: Portionen, Backform & Einheiten in einem Schritt',
    beschreibung: 'Beliebiges Rezept einfügen, auf neue Portionen oder eine andere Backform umrechnen, Cups in Gramm wandeln und zwischen AT-, DE- und CH-Küchensprache übersetzen.',
    h1: 'Rezept umrechnen – Portionen, Backform und Einheiten',
    einleitung: 'Fügen Sie ein Rezept ein, wie es im Kochbuch, auf dem Zettel oder auf einer Website steht. Die Werkbank liest Mengen, Brüche und Einheiten, rechnet alles auf einmal um und zeigt offen, welche Zutaten nicht einfach mitwachsen.',
    howto: 'Ein Rezept mit der Werkbank umrechnen'
  },
  {
    slug: 'backform-umrechnen', typ: 'werkzeug', kurz: 'Backform umrechnen', skripte: [...KERN, 'backform-ui.js'],
    titel: 'Backform umrechnen: rund, eckig, Kasten, Gugelhupf & Blech',
    beschreibung: 'Backform-Übersetzer mit maßstabsgetreuer Skizze: Faktor nach Fläche oder Volumen, Hinweis zu Teighöhe und Backzeit, Übernahme direkt in die Rezept-Werkbank.',
    h1: 'Backform umrechnen – rund, eckig, Kasten, Gugelhupf, Blech',
    einleitung: 'Zwei Formen eingeben, Faktor ablesen: Der Übersetzer legt beide Formen maßstabsgetreu übereinander, rechnet über die Bodenfläche oder – wenn Sie die Höhe kennen – über das Volumen und sagt, was das für Teighöhe und Backzeit bedeutet.'
  },
  {
    slug: 'springform-umrechnen', typ: 'ratgeber', kurz: 'Springform 26 cm umrechnen',
    titel: 'Springform 26 cm auf 28, 24 oder 20 cm umrechnen – Tabelle & Faktoren',
    beschreibung: 'Wie viel Teig für eine 28er, 24er oder 20er Springform, wenn das Rezept für 26 cm gedacht ist? Faktoren, Tabelle mit Beispielmengen, Eier und Backzeit.',
    h1: 'Springform 26 cm umrechnen: auf 28, 24 oder 20 cm',
    einleitung: 'Sehr viele Kuchenrezepte im deutschsprachigen Raum sind für eine Springform mit 26 cm Durchmesser geschrieben. Hier stehen die Faktoren für die gängigen anderen Größen – und was beim Umrechnen wirklich zählt.'
  },
  {
    slug: 'cups-in-gramm', typ: 'werkzeug', kurz: 'Cups in Gramm (Zutaten-Waage)', skripte: [...KERN, 'helfer-ui.js'],
    titel: 'Cups in Gramm umrechnen: Mehl, Zucker, Butter, Milch – mit Quelle je Wert',
    beschreibung: 'Zutaten-Waage: 1 Cup Mehl, Zucker, Butter oder Milch in Gramm und Milliliter, dazu EL und TL. Jeder Wert mit Quelle (King Arthur Ingredient Weight Chart).',
    h1: 'Cups in Gramm – die Zutaten-Waage',
    einleitung: 'Ein Cup ist ein Hohlmaß, Gramm sind ein Gewicht. Wie viel ein Cup wiegt, hängt deshalb von der Zutat ab. Die Zutaten-Waage rechnet mit veröffentlichten Messwerten und nennt zu jedem Wert die Quelle.'
  },
  {
    slug: 'dag-in-gramm', typ: 'ratgeber', kurz: 'dag in Gramm',
    titel: 'dag in Gramm: Dekagramm & österreichische Mengenangaben erklärt',
    beschreibung: '1 dag = 10 g. Was Dekagramm, dkg, Achterl, Viertel und Kaffeelöffel in österreichischen Rezepten bedeuten – mit Umrechnungstabelle und Beispielen.',
    h1: 'dag in Gramm und österreichische Mengenangaben',
    einleitung: 'In österreichischen Rezepten stehen „25 dag Mehl“ und „⅛ l Obers“ ganz selbstverständlich. Für alle anderen sind das Rätsel. Dieser Ratgeber übersetzt die typischen Angaben und zeigt, wie man sie sicher umrechnet.'
  },
  {
    slug: 'obers-sahne-rahm', typ: 'ratgeber', kurz: 'Obers, Sahne, Rahm',
    titel: 'Obers, Sahne oder Rahm? Die Begriffe in Österreich, Deutschland & der Schweiz',
    beschreibung: 'Obers, Schlagobers, Sahne, Rahm, Nidel, Sauerrahm: was in AT, DE und CH gemeint ist, welcher Becher ins Rezept passt und wie man Mengen umrechnet.',
    h1: 'Obers, Sahne, Rahm – ein Produkt, drei Länder',
    einleitung: 'Wer ein Wiener Rezept in Hamburg nachkocht oder ein Zürcher Rezept in Graz, stolpert zuerst über das Milchregal. Hier steht, welches Wort wo was bedeutet – und woran man im Zweifel den richtigen Becher erkennt.'
  },
  {
    slug: 'topfen-quark', typ: 'ratgeber', kurz: 'Topfen und Quark',
    titel: 'Topfen und Quark: gleiches Produkt, andere Namen – und worauf es beim Backen ankommt',
    beschreibung: 'Topfen ist Quark – aber nicht jeder Becher backt gleich. Begriffe in AT, DE und CH, Fettstufen, Wassergehalt, Umrechnung von Rezepten und typische Fehler.',
    h1: 'Topfen und Quark',
    einleitung: 'Topfenstrudel, Quarkkuchen, Käsekuchen: Gemeint ist dieselbe Zutat. Trotzdem gelingt ein Rezept aus dem Nachbarland manchmal nicht. Das liegt selten am Namen, sondern an Fettstufe und Wassergehalt.'
  },
  {
    slug: 'germ-umrechnen', typ: 'ratgeber', kurz: 'Germ umrechnen', skripte: [...KERN, 'helfer-ui.js'],
    titel: 'Germ umrechnen: Würfel, Trockengerm & Hefe – mit Rechner',
    beschreibung: '1 Würfel Frischgerm (42 g) entspricht 2 Päckchen Trockengerm à 7 g. Rechner für Frischgerm, Trockengerm und Mehlmenge, Herstellerangaben aus AT und CH.',
    h1: 'Germ umrechnen – Würfel, Trockengerm, Hefe',
    einleitung: 'Germ heißt in Deutschland und der Schweiz Hefe. Ob frisch im Würfel oder getrocknet im Päckchen: Entscheidend ist das Verhältnis zur Mehlmenge. Der Rechner oben macht daraus Gramm, Würfel und Päckchen.'
  },
  {
    slug: 'triebmittel-verdoppeln', typ: 'ratgeber', kurz: 'Triebmittel beim Verdoppeln',
    titel: 'Hefe, Backpulver & Natron beim Verdoppeln oder Halbieren richtig dosieren',
    beschreibung: 'Wächst das Backpulver einfach mit? Faustregeln der Hersteller je 500 g Mehl, Unterschiede zwischen Backpulver, Natron und Germ, Beispiele und typische Fehler.',
    h1: 'Hefe, Backpulver und Natron beim Verdoppeln',
    einleitung: 'Triebmittel sind die Zutaten, bei denen „einfach mal zwei“ am häufigsten Fragen auslöst. Die gute Nachricht: Die Hersteller geben klare Bezugsgrößen an. Die Werkbank vergleicht Ihr Rezept automatisch damit.'
  },
  {
    slug: 'rezept-halbieren', typ: 'ratgeber', kurz: 'Rezept halbieren',
    titel: 'Rezept halbieren: Eier, Backzeit, Form – so gelingt die kleine Menge',
    beschreibung: 'Ein Rezept halbieren ohne Pannen: halbe Eier abwiegen, die passende kleinere Form finden, Backzeit einschätzen, Gewürze anpassen. Mit Schritt-für-Schritt-Anleitung.',
    h1: 'Rezept halbieren – Eier, Backzeit, Form',
    einleitung: 'Halbieren klingt nach Division durch zwei. In der Praxis scheitert es an drei Stellen: am halben Ei, an der zu großen Form und an der Backzeit. So lösen Sie alle drei.',
    howto: 'Ein Rezept halbieren'
  },
  {
    slug: 'fuer-viele-gaeste-kochen', typ: 'ratgeber', kurz: 'Für viele Gäste kochen',
    titel: 'Für viele Gäste kochen: Mengen hochrechnen, Töpfe wählen, Reihenfolge planen',
    beschreibung: 'Von 4 auf 20 Portionen: Was linear mitwächst, was nicht, welche Topf- und Pfannengröße passt und wie man Arbeit und Herdplätze sinnvoll einteilt.',
    h1: 'Für viele Gäste kochen',
    einleitung: 'Ein Rezept für vier auf zwanzig Personen hochzurechnen, dauert mit der Werkbank Sekunden. Schwieriger ist alles drumherum: Topfgröße, Bratflächen, Herdplätze und Zeitplan. Dieser Ratgeber sortiert das.'
  },
  {
    slug: 'us-rezepte-umrechnen', typ: 'ratgeber', kurz: 'US-Rezepte nachbacken',
    titel: 'US-Rezepte nachbacken: Cups, Sticks, Unzen & Fahrenheit umrechnen',
    beschreibung: 'Amerikanische Rezepte sicher nachbacken: Cups und Sticks in Gramm, Unzen, Teelöffel, Fahrenheit in Celsius – und welche Zutaten es bei uns anders gibt.',
    h1: 'US-Rezepte nachbacken – Cups, Sticks, Fahrenheit',
    einleitung: 'Amerikanische Back-Rezepte messen mit Tassen, schneiden Butter in Sticks und heizen in Fahrenheit. Mit drei Umrechnungen und ein wenig Zutatenkunde backt man sie in Wien, Köln oder Bern genauso nach.'
  },
  {
    slug: 'ofentemperatur-umrechnen', typ: 'ratgeber', kurz: 'Ofentemperatur umrechnen', skripte: [...KERN, 'helfer-ui.js'],
    titel: 'Ofentemperatur umrechnen: Umluft, Ober-/Unterhitze & Fahrenheit',
    beschreibung: 'Umluft statt Ober-/Unterhitze: rund 20 °C weniger. Fahrenheit in Celsius: minus 32, geteilt durch 1,8. Rechner, Tabelle und Hinweise zu Heißluft-Systemen.',
    h1: 'Ofentemperatur umrechnen – Umluft, Ober-/Unterhitze, Fahrenheit',
    einleitung: 'Ein Rezept nennt 180 °C Ober-/Unterhitze, Ihr Ofen backt am liebsten mit Umluft – oder das Rezept kommt aus den USA und verlangt 350 °F. Der Rechner und die Tabelle unten übersetzen beides.'
  },
  {
    slug: 'einkaufsliste', typ: 'werkzeug', kurz: 'Einkaufsliste aus Rezepten', skripte: [...KERN, 'helfer-ui.js'],
    titel: 'Einkaufsliste aus mehreren Rezepten – nach Supermarkt sortiert, mit Vorrat',
    beschreibung: 'Mehrere Rezepte einfügen, Mengen zusammenzählen, Vorrat abziehen: Die Einkaufsliste sortiert nach Supermarktbereich, lässt sich drucken und bleibt lokal gespeichert.',
    h1: 'Einkaufsliste aus mehreren Rezepten',
    einleitung: 'Für ein Wochenende, ein Fest oder die ganze Woche: Rezepte einfügen, Portionsfaktor setzen, Vorrat eintragen. Die Liste fasst gleiche Zutaten zusammen und sortiert sie so, wie man durch den Markt geht.'
  },
  {
    slug: 'kuechenwoerterbuch', typ: 'werkzeug', kurz: 'Küchenwörterbuch AT–DE–CH', skripte: [...KERN, 'helfer-ui.js'],
    titel: 'Küchenwörterbuch Österreich – Deutschland – Schweiz: Obers, Topfen, Germ & Co.',
    beschreibung: 'Durchsuchbares Küchenwörterbuch mit belegten Einträgen: von Erdäpfeln über Paradeiser bis Rüebli. Jeder Begriff mit Bedeutung, Region, Praxistipp und Quelle.',
    h1: 'Küchenwörterbuch AT · DE · CH',
    einleitung: 'Paradeiser, Rüebli, Faschiertes, Nüsslisalat: Jedes Land hat seine Küchenwörter. Hier sind die wichtigsten mit Bedeutung, Region und Quelle versammelt – dieselbe Liste übersetzt in der Werkbank automatisch.'
  },
  {
    slug: 'essloeffel-teeloeffel-gramm', typ: 'ratgeber', kurz: 'Esslöffel & Teelöffel in Gramm',
    titel: 'Esslöffel und Teelöffel in Gramm – Tabelle je Zutat',
    beschreibung: 'Wie viel Gramm hat ein Esslöffel Zucker, Mehl, Butter oder Salz? Tabelle je Zutat mit Quelle, Unterschied gestrichen und gehäuft, Kaffeelöffel in Österreich.',
    h1: 'Esslöffel und Teelöffel in Gramm',
    einleitung: '„2 EL Zucker“ ist schnell gelesen, aber wie viel ist das auf der Waage? Die Antwort hängt von der Zutat ab – und davon, ob der Löffel gestrichen oder gehäuft ist. Die Tabelle rechnet mit Messlöffeln.'
  },
  {
    slug: 'so-rechnet-die-werkbank', typ: 'info', kurz: 'So rechnet die Werkbank',
    titel: 'So rechnet die Werkbank: Methodik, Rundung & Quellen',
    beschreibung: 'Offene Methodik der Rezept-Werkbank: wie Zeilen gelesen, Mengen skaliert, Einheiten umgerechnet und gerundet werden – mit allen Quellen und Grenzen.',
    h1: 'So rechnet die Werkbank',
    einleitung: 'Ein Rechenwerkzeug ist nur so gut wie seine Annahmen. Deshalb steht hier vollständig, wie die Werkbank liest, rechnet, rundet und übersetzt – und wo sie bewusst nicht rechnet.'
  },
  {
    slug: 'ueber-uns', typ: 'pflicht', kurz: 'Über uns',
    titel: 'Über uns – Küchenideenkompass',
    beschreibung: 'Wer hinter dem Küchenideenkompass steht, warum es die Rezept-Werkbank gibt und nach welchen Grundsätzen Werte, Quellen und Werbung behandelt werden.',
    h1: 'Über den Küchenideenkompass',
    einleitung: 'Eine Werkbank für Rezepte aus drei Küchensprachen – gebaut in Wien.'
  },
  {
    slug: 'kontakt', typ: 'pflicht', kurz: 'Kontakt',
    titel: 'Kontakt – Küchenideenkompass',
    beschreibung: 'Kontaktdaten des Betreibers des Küchenideenkompass: AdStern, Werbeagentur in Wien.',
    h1: 'Kontakt',
    einleitung: 'Wer den Küchenideenkompass betreibt und wie das Unternehmen erreichbar ist.'
  },
  {
    slug: 'impressum', typ: 'pflicht', kurz: 'Impressum',
    titel: 'Impressum – Küchenideenkompass',
    beschreibung: 'Impressum und Offenlegung des Küchenideenkompass gemäß § 5 ECG und § 25 MedienG.',
    h1: 'Impressum',
    einleitung: 'Angaben gemäß § 5 E-Commerce-Gesetz (ECG), § 14 Unternehmensgesetzbuch und Offenlegung gemäß § 25 Mediengesetz.'
  },
  {
    slug: 'datenschutz', typ: 'pflicht', kurz: 'Datenschutz',
    titel: 'Datenschutzerklärung – Küchenideenkompass',
    beschreibung: 'Datenschutzerklärung: Hosting über GitHub Pages, Google AdSense, Google Analytics 4 nur nach Einwilligung, Rezepte und Listen nur lokal im Browser.',
    h1: 'Datenschutzerklärung',
    einleitung: 'Welche Daten beim Besuch dieser Website verarbeitet werden, wozu und welche Rechte Sie haben.'
  }
];

// Alte URLs (Sitemap & Menü vom 31.10.2026) → neue Seiten
export const WEITERLEITUNGEN = [
  ['about.html', 'ueber-uns'],
  ['advertise.html', 'kontakt'],
  ['gramm-milliliter.html', 'cups-in-gramm'],
  ['imprint.html', 'impressum'],
  ['privacy.html', 'datenschutz'],
  ['menueplan.html', 'einkaufsliste'],
  ['wochenessen-planen.html', 'einkaufsliste'],
  ['vorratsplan.html', 'einkaufsliste'],
  ['portionen-umrechnen.html', 'rezept-umrechnen'],
  ['portionenwerk.html', 'rezept-umrechnen'],
  ['rezeptliste-pruefen.html', 'rezept-umrechnen'],
];
