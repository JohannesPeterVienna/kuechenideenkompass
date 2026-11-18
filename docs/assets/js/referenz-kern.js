/*
 * Küchenideenkompass – Referenzdaten Kerntemperatur und Kühlschrank-Fristen mit Rechenlogik.
 * Stand: 18.11.2026. Jede Zeile nennt ihre Quelle; nichts ist geschätzt oder gemittelt.
 * Läuft im Browser (window.KIK.referenz) und in Node (module.exports).
 */
(function (root, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik();
  else { root.KIK = root.KIK || {}; root.KIK.referenz = fabrik(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ABRUF = '18.11.2026';
  var QUELLEN = {
    bfr: {
      kurz: 'BfR', land: 'DE',
      name: 'Bundesinstitut für Risikobewertung (BfR): Verbrauchertipps „Schutz vor Lebensmittelinfektionen im Privathaushalt“ (PDF, Ausgabe 2020)',
      url: 'https://www.bfr.bund.de/cm/350/verbrauchertipps_schutz_vor_lebensmittelinfektionen_im_privathaushalt.pdf'
    },
    fsis: {
      kurz: 'USDA', land: 'US',
      name: 'USDA Food Safety and Inspection Service: Safe Minimum Internal Temperature Chart (zuletzt aktualisiert 14.4.2025)',
      url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart',
      archiv: 'https://web.archive.org/web/20261103202835/https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart',
      weg: 'gelesen in der Archivkopie des Internet Archive vom 3.11.2026'
    },
    fsgov: {
      kurz: 'FoodSafety.gov', land: 'US',
      name: 'FoodSafety.gov (Portal der US-Bundesregierung): Cold Food Storage Chart (zuletzt geprüft 19.9.2023)',
      url: 'https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts',
      archiv: 'https://web.archive.org/web/20261115073039/https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts',
      weg: 'gelesen in der Archivkopie des Internet Archive vom 15.11.2026'
    },
    bzfe: {
      kurz: 'BZfE', land: 'DE',
      name: 'Bundeszentrum für Ernährung (BZfE): Lebensmittel richtig lagern',
      url: 'https://www.bzfe.de/kueche-und-alltag/kochen/lebensmittel-richtig-lagern'
    },
    zgfdt: {
      kurz: 'Zu gut für die Tonne', land: 'DE',
      name: 'Zu gut für die Tonne! (Bundesministerium für Landwirtschaft, Ernährung und Heimat): Wie lagert man Lebensmittel richtig?',
      url: 'https://www.zugutfuerdietonne.de/tipps-fuer-zu-hause/richtig-lagern'
    },
    kaKuchen: {
      kurz: 'King Arthur', land: 'US',
      name: 'King Arthur Baking: How to tell when cake is done',
      url: 'https://www.kingarthurbaking.com/blog/2019/07/01/how-to-tell-when-cake-is-done'
    },
    kaKaese: {
      kurz: 'King Arthur', land: 'US',
      name: 'King Arthur Baking: Why did my cheesecake crack?',
      url: 'https://www.kingarthurbaking.com/blog/2024/05/09/why-did-my-cheesecake-crack'
    },
    kaBrot: {
      kurz: 'King Arthur', land: 'US',
      name: 'King Arthur Baking: Using a thermometer with yeast bread',
      url: 'https://www.kingarthurbaking.com/blog/2017/04/07/using-a-thermometer-with-yeast-bread'
    }
  };

  var KERN_GRUPPEN = [
    { id: 'fleisch', name: 'Fleisch' }, { id: 'gefluegel', name: 'Geflügel' }, { id: 'fisch', name: 'Fisch' },
    { id: 'ei', name: 'Eier' }, { id: 'reste', name: 'Reste & Warmhalten' }, { id: 'gebaeck', name: 'Kuchen & Brot' }
  ];

  /*
   * Kerntemperaturen. art: 'sicherheit' = Mindestwert einer Behörde; 'garprobe' = Qualitätsrichtwert (keine Sicherheitsaussage).
   * c = Zielwert in °C; f = Originalwert in °F, wenn die Quelle in Fahrenheit schreibt; halteMin/ruheMin in Minuten.
   */
  var KERN = [
    { id: 'bfr-tierisch', gruppen: ['fleisch', 'gefluegel'], art: 'sicherheit', quelle: 'bfr', c: 70, halteMin: 2,
      name: 'Fleisch und Geflügel – Regel des BfR',
      wert: 'mindestens 70 °C für mindestens 2 Minuten an allen Stellen',
      hinweis: 'Sichtprobe laut BfR: Fleischsaft klar, Geflügel innen weißlich, Schwein graurosa, Rind graubraun.' },
    { id: 'usda-stueck', gruppen: ['fleisch'], art: 'sicherheit', quelle: 'fsis', c: 62.8, f: 145, ruheMin: 3,
      name: 'Steak, Kotelett, Braten von Rind, Schwein, Kalb, Lamm – USDA',
      wert: '62,8 °C (145 °F), danach mindestens 3 Minuten ruhen lassen',
      hinweis: 'Gilt für ganze Stücke. Der Wert liegt unter der 70-Grad-Regel des BfR.' },
    { id: 'usda-faschiert', gruppen: ['fleisch'], art: 'sicherheit', quelle: 'fsis', c: 71.1, f: 160,
      name: 'Faschiertes / Hackfleisch von Rind, Schwein, Kalb, Lamm – USDA',
      wert: '71,1 °C (160 °F)',
      hinweis: 'Für Zerkleinertes nennt die USDA einen höheren Wert als für ganze Stücke und keine Ruhezeit.' },
    { id: 'usda-gefluegel', gruppen: ['gefluegel'], art: 'sicherheit', quelle: 'fsis', c: 73.9, f: 165,
      name: 'Geflügel: ganz, Brust, Keule, Flügel, faschiert, Innereien, Füllung – USDA',
      wert: '73,9 °C (165 °F)',
      hinweis: 'Ein Wert für alle Geflügelteile, ausdrücklich auch für Faschiertes vom Geflügel und für die Füllung.' },
    { id: 'usda-schinken-roh', gruppen: ['fleisch'], art: 'sicherheit', quelle: 'fsis', c: 62.8, f: 145, ruheMin: 3,
      name: 'Schinken, frisch oder geräuchert, ungegart – USDA',
      wert: '62,8 °C (145 °F), danach mindestens 3 Minuten ruhen lassen', hinweis: '' },
    { id: 'usda-schinken-gegart', gruppen: ['fleisch', 'reste'], art: 'sicherheit', quelle: 'fsis', c: 73.9, f: 165,
      name: 'Gegarter Schinken, aufwärmen – USDA',
      wert: '73,9 °C (165 °F); 60 °C (140 °F) nur für Ware, die in einem USDA-kontrollierten Betrieb verpackt wurde',
      hinweis: 'Die 60-Grad-Ausnahme bezieht sich auf US-Ware; der Prüfer rechnet deshalb mit 73,9 °C.' },
    { id: 'bfr-fisch', gruppen: ['fisch'], art: 'sicherheit', quelle: 'bfr', c: null,
      name: 'Fisch – Sichtprobe des BfR',
      wert: 'erhitzen, bis das Fischfleisch nicht mehr glasig ist und sich leicht mit der Gabel zerteilen lässt',
      hinweis: 'Das BfR nennt für Fisch keine eigene Gradzahl; es gilt die allgemeine 70-Grad-Regel für das Erhitzen von Speisen.' },
    { id: 'usda-fisch', gruppen: ['fisch'], art: 'sicherheit', quelle: 'fsis', c: 62.8, f: 145,
      name: 'Fisch und Schalentiere – USDA', wert: '62,8 °C (145 °F)', hinweis: '' },
    { id: 'bfr-ei', gruppen: ['ei'], art: 'sicherheit', quelle: 'bfr', c: null,
      name: 'Eier für Kleinkinder, Kranke und sehr alte Menschen – BfR',
      wert: 'vollständig durcherhitzen: Eiweiß und Eigelb sind fest',
      hinweis: 'Speisen, die nicht mehr erhitzt werden (Desserts, Mayonnaise), laut BfR ohne Rohei zubereiten.' },
    { id: 'usda-ei', gruppen: ['ei'], art: 'sicherheit', quelle: 'fsis', c: 71.1, f: 160,
      name: 'Eier – USDA', wert: '71,1 °C (160 °F)', hinweis: 'Die Tabelle der USDA nennt nur „Eggs“.' },
    { id: 'bfr-aufwaermen', gruppen: ['reste'], art: 'sicherheit', quelle: 'bfr', c: 70, halteMin: 2,
      name: 'Speisen zubereiten und aufwärmen – BfR',
      wert: 'mindestens 70 °C für 2 Minuten an allen Stellen',
      hinweis: 'In der Mikrowelle zwischendurch umrühren, damit die Speise gleichmäßig heiß wird.' },
    { id: 'usda-reste', gruppen: ['reste'], art: 'sicherheit', quelle: 'fsis', c: 73.9, f: 165,
      name: 'Reste und Aufläufe aufwärmen – USDA', wert: '73,9 °C (165 °F)', hinweis: '' },
    { id: 'bfr-heisshalten', gruppen: ['reste'], art: 'sicherheit', quelle: 'bfr', c: 60, dauerhaft: true,
      name: 'Warme Speisen heiß halten – BfR',
      wert: 'mindestens 60 °C an allen Stellen – oder innerhalb weniger Stunden auf unter 7 °C abkühlen',
      hinweis: 'Zwischen 10 °C und 60 °C können sich Keime laut BfR vermehren.' },
    { id: 'ka-ruehrkuchen', gruppen: ['gebaeck'], art: 'garprobe', quelle: 'kaKuchen', c: 93.3, cBis: 98.9, f: 200, fBis: 210,
      name: 'Rührkuchen, Sandkuchen, Schokoladekuchen – Garprobe',
      wert: '93–99 °C (200–210 °F)',
      hinweis: 'Qualitätsrichtwert. King Arthur nennt das Thermometer bei Kuchen selbst wenig verlässlich; Stäbchenprobe dazunehmen.' },
    { id: 'ka-kaesekuchen', gruppen: ['gebaeck'], art: 'garprobe', quelle: 'kaKaese', c: 65.6, cBis: 68.3, f: 150, fBis: 155,
      name: 'Käsekuchen / Topfentorte, cremig – Garprobe in der Mitte',
      wert: 'Mitte 65–68 °C (150–155 °F); ab 85 °C (185 °F) reißt die Oberfläche fast sicher',
      hinweis: 'Qualitätsrichtwert für die Konsistenz, keine Aussage zur Lebensmittelsicherheit.' },
    { id: 'ka-brot', gruppen: ['gebaeck'], art: 'garprobe', quelle: 'kaBrot', c: 87.8, f: 190,
      name: 'Die meisten Brote und Germgebäcke – Garprobe', wert: 'rund 88 °C (190 °F)', hinweis: 'Qualitätsrichtwert.' },
    { id: 'ka-vollkornbrot', gruppen: ['gebaeck'], art: 'garprobe', quelle: 'kaBrot', c: 96.1, cBis: 98.9, f: 205, fBis: 210,
      name: 'Große, dichte Vollkornlaibe – Garprobe', wert: '96–99 °C (205–210 °F)',
      hinweis: 'Qualitätsrichtwert; laut King Arthur die Empfehlung mancher Bäcker, 88 °C bleibt der Bezugswert.' }
  ];

  var LAGER_GRUPPEN = [
    { id: 'reste', name: 'Reste & Gekochtes' }, { id: 'fleisch', name: 'Fleisch & Wurst' }, { id: 'gefluegel', name: 'Geflügel' },
    { id: 'fisch', name: 'Fisch & Meeresfrüchte' }, { id: 'ei', name: 'Eier' }, { id: 'milch', name: 'Milch & Käse' }, { id: 'teig', name: 'Teigwaren' }
  ];

  /*
   * Fristen im Kühlschrank. von/bis in der Einheit e ('h' Stunden, 'd' Tage, 'w' Wochen); ab = Ereignis, ab dem gezählt wird.
   * tk = Angabe für den Tiefkühler (Text der Quelle, nur Qualität). bedingung = Temperatur, unter der die Quelle rechnet.
   */
  var US_K = 'Kühlschrank höchstens 4 °C (40 °F)';
  var LAGER_ROH = [
    { id: 'reste-bfr', gruppe: 'reste', quelle: 'bfr', erhitzen: true, name: 'Reste gegarter Speisen', von: 2, bis: 3, e: 'd', ab: 'Zubereitung', bedingung: 'Kühlschrank höchstens 7 °C, besser unter 5 °C', tk: '' },
    { id: 'reste-fleisch-us', gruppe: 'reste', quelle: 'fsgov', name: 'Reste von gegartem Fleisch oder Geflügel', von: 3, bis: 4, e: 'd', ab: 'Zubereitung', bedingung: US_K, tk: '2 bis 6 Monate' },
    { id: 'suppe-us', gruppe: 'reste', quelle: 'fsgov', name: 'Suppen und Eintöpfe mit Gemüse oder Fleisch', von: 3, bis: 4, e: 'd', ab: 'Zubereitung', bedingung: US_K, tk: '2 bis 3 Monate' },
    { id: 'pizza-us', gruppe: 'reste', quelle: 'fsgov', name: 'Pizza (Reste)', von: 3, bis: 4, e: 'd', ab: 'Zubereitung', bedingung: US_K, tk: '1 bis 2 Monate' },
    { id: 'salat-us', gruppe: 'reste', quelle: 'fsgov', name: 'Eier-, Hühner-, Schinken-, Thunfisch- und Nudelsalat', von: 3, bis: 4, e: 'd', ab: 'Zubereitung', bedingung: US_K, tk: 'nicht zum Einfrieren geeignet' },
    { id: 'quiche-us', gruppe: 'reste', quelle: 'fsgov', name: 'Quiche mit Füllung', von: 3, bis: 5, e: 'd', ab: 'Backen', bedingung: US_K, tk: '2 bis 3 Monate' },
    { id: 'auflauf-ei-us', gruppe: 'reste', quelle: 'fsgov', name: 'Aufläufe mit Ei', von: 3, bis: 4, e: 'd', ab: 'Backen', bedingung: US_K, tk: '2 bis 3 Monate' },
    { id: 'nudelreste-de', gruppe: 'teig', quelle: 'zgfdt', name: 'Gekochte Nudeln (Reste), oberstes Fach', von: 1, bis: 2, e: 'd', ab: 'Kochen', bedingung: 'geschlossener Behälter', tk: '' },
    { id: 'frischteig-de', gruppe: 'teig', quelle: 'zgfdt', name: 'Frische Teigwaren: Nudeln, Spätzle, Gnocchi', von: 3, bis: 4, e: 'd', ab: 'Einkauf/Herstellung', bedingung: 'gut gekühlt', tk: '' },
    { id: 'hack-lose-de', gruppe: 'fleisch', quelle: 'bzfe', name: 'Faschiertes / Hackfleisch, lose vom Fleischer', von: 6, bis: 8, e: 'h', ab: 'Einkauf', bedingung: 'kälteste Zone: hinten auf der Glasplatte über dem Gemüsefach; am selben Tag verbrauchen', tk: '' },
    { id: 'hack-us', gruppe: 'fleisch', quelle: 'fsgov', name: 'Faschiertes / Hackfleisch, auch von Geflügel', von: 1, bis: 2, e: 'd', ab: 'Einkauf', bedingung: US_K, tk: '3 bis 4 Monate' },
    { id: 'stueck-us', gruppe: 'fleisch', quelle: 'fsgov', name: 'Steaks, Koteletts, Braten von Rind, Kalb, Lamm, Schwein (roh)', von: 3, bis: 5, e: 'd', ab: 'Einkauf', bedingung: US_K, tk: '4 bis 12 Monate' },
    { id: 'rohwurst-us', gruppe: 'fleisch', quelle: 'fsgov', name: 'Rohe Bratwurst von Huhn, Pute, Schwein oder Rind', von: 1, bis: 2, e: 'd', ab: 'Einkauf', bedingung: US_K, tk: '1 bis 2 Monate' },
    { id: 'speck-us', gruppe: 'fleisch', quelle: 'fsgov', name: 'Frühstücksspeck (Bacon)', von: 7, bis: 7, e: 'd', ab: 'Einkauf', bedingung: US_K, tk: '1 Monat' },
    { id: 'aufschnitt-us', gruppe: 'fleisch', quelle: 'fsgov', name: 'Aufschnitt, geöffnete Packung oder frisch geschnitten', von: 3, bis: 5, e: 'd', ab: 'Öffnen', bedingung: US_K, tk: '1 bis 2 Monate' },
    { id: 'gefluegel-us', gruppe: 'gefluegel', quelle: 'fsgov', name: 'Huhn oder Pute, roh – ganz oder in Teilen', von: 1, bis: 2, e: 'd', ab: 'Einkauf', bedingung: US_K, tk: 'ganz 1 Jahr, Teile 9 Monate' },
    { id: 'fisch-fett-us', gruppe: 'fisch', quelle: 'fsgov', name: 'Fetter Fisch, roh (u. a. Makrele, Lachs, Thunfisch)', von: 1, bis: 3, e: 'd', ab: 'Einkauf', bedingung: US_K, tk: '2 bis 3 Monate' },
    { id: 'fisch-mager-us', gruppe: 'fisch', quelle: 'fsgov', name: 'Magerer Fisch, roh (u. a. Kabeljau, Schellfisch, Heilbutt, Seezunge)', von: 1, bis: 3, e: 'd', ab: 'Einkauf', bedingung: US_K, tk: '6 bis 8 Monate' },
    { id: 'fisch-mager2-us', gruppe: 'fisch', quelle: 'fsgov', name: 'Magerer Fisch, roh (in der Quelle: pollock, ocean perch, rockfish, sea trout)', von: 1, bis: 3, e: 'd', ab: 'Einkauf', bedingung: US_K, tk: '4 bis 8 Monate' },
    { id: 'garnelen-us', gruppe: 'fisch', quelle: 'fsgov', name: 'Garnelen, Flusskrebse', von: 3, bis: 5, e: 'd', ab: 'Einkauf', bedingung: US_K, tk: '6 bis 18 Monate' },
    { id: 'ei-roh-us', gruppe: 'ei', quelle: 'fsgov', name: 'Rohe Eier in der Schale', von: 3, bis: 5, e: 'w', ab: 'Einkauf', bedingung: US_K, tk: 'nicht in der Schale einfrieren' },
    { id: 'ei-hart-de', gruppe: 'ei', quelle: 'bzfe', name: 'Hartgekochte Eier – Angabe BZfE', von: 2, bis: 4, e: 'w', ab: 'Kochen', bedingung: 'im Kühlschrank', tk: '' },
    { id: 'ei-hart-us', gruppe: 'ei', quelle: 'fsgov', name: 'Hartgekochte Eier – Angabe FoodSafety.gov', von: 1, bis: 1, e: 'w', ab: 'Kochen', bedingung: US_K, tk: 'nicht einfrieren' },
    { id: 'ei-aufgeschlagen-us', gruppe: 'ei', quelle: 'fsgov', name: 'Rohes Eiklar und rohe Dotter', von: 2, bis: 4, e: 'd', ab: 'Aufschlagen', bedingung: US_K, tk: '12 Monate (Dotter frieren schlecht ein)' },
    { id: 'frischmilch-de', gruppe: 'milch', quelle: 'zgfdt', name: 'Frischmilch (pasteurisiert), geöffnet', von: 2, bis: 3, e: 'd', ab: 'Öffnen', bedingung: 'gekühlt; ungeöffnet bis zu 7 Tage', tk: '' },
    { id: 'esl-de', gruppe: 'milch', quelle: 'zgfdt', name: 'Länger haltbare Frischmilch (ESL), geöffnet', von: 2, bis: 4, e: 'd', ab: 'Öffnen', bedingung: 'gekühlt; ungeöffnet 3 Wochen', tk: '' },
    { id: 'hmilch-de', gruppe: 'milch', quelle: 'zgfdt', name: 'H-Milch, geöffnet', von: 2, bis: 3, e: 'd', ab: 'Öffnen', bedingung: 'gekühlt; ungeöffnet mehrere Monate bei Zimmertemperatur', tk: '' },
    { id: 'kaese-stueck-de', gruppe: 'milch', quelle: 'zgfdt', name: 'Käse am Stück', von: 2, bis: 3, e: 'w', ab: 'Einkauf', bedingung: 'mittleres Fach, einzeln verpackt', tk: '' },
    { id: 'kaese-scheiben-de', gruppe: 'milch', quelle: 'zgfdt', name: 'Käsescheiben und Frischkäse, geöffnet', von: 7, bis: 7, e: 'd', ab: 'Öffnen', bedingung: 'innerhalb einer Woche essen', tk: '' }
  ];

  /*
   * Startpunkt der Zählung: Nur wenige Quellzeilen nennen ihn ausdrücklich („geöffnet“, „after baking“, loses Hackfleisch „am selben Tag“).
   * Bei allen anderen ist „ab Einkauf/Zubereitung/Kochen“ unsere Annahme und wird überall so gekennzeichnet (abAnnahme).
   */
  var AB_BELEGT = { Öffnen: true, Backen: true, Aufschlagen: false };
  var LAGER = LAGER_ROH.map(function (z) { z.abAnnahme = !(AB_BELEGT[z.ab] || z.id === 'hack-lose-de'); return z; });
  function abText(z) { return z.ab + (z.abAnnahme ? ' (unsere Annahme – die Quelle nennt keinen Startpunkt)' : ''); }

  function quelle(id) { return QUELLEN[id]; }
  function cNachF(c) { return c * 1.8 + 32; }
  function fNachC(f) { return (f - 32) / 1.8; }
  function zahl(x, st) { return Number(x).toFixed(st === undefined ? 0 : st).replace('.', ','); }
  function finden(liste, id) { for (var i = 0; i < liste.length; i++) if (liste[i].id === id) return liste[i]; return null; }

  /* Kleinschreibung ohne Umlaute/Akzente – für die Suche in beiden Tabellen. */
  function norm(s) {
    return String(s === null || s === undefined ? '' : s).toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9°]+/g, ' ').trim();
  }
  function suchtext(z) {
    var q = QUELLEN[z.quelle];
    return norm([z.name, z.wert || '', z.hinweis || '', z.bedingung || '', z.tk || '', q.kurz, q.land === 'DE' ? 'deutschland' : 'usa'].join(' '));
  }
  /* Alle Suchwörter müssen vorkommen; gruppe = id oder '' / 'alle'. */
  function filtern(liste, text, gruppe) {
    var w = norm(text).split(' ').filter(Boolean);
    return liste.filter(function (z) {
      var g = z.gruppen || [z.gruppe];
      if (gruppe && gruppe !== 'alle' && g.indexOf(gruppe) < 0) return false;
      var s = suchtext(z);
      return w.every(function (x) { return s.indexOf(x) >= 0; });
    });
  }

  /* Eingabe „72“, „72,5“, „160 F“ → Zahl oder null; grenzt auf plausible Thermometerwerte ein. */
  function zahlLesen(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var m = String(v === null || v === undefined ? '' : v).trim().replace(',', '.').match(/^-?\d{1,4}(\.\d{1,2})?$/);
    return m ? parseFloat(m[0]) : null;
  }

  /*
   * Gemessene Kerntemperatur gegen eine Zeile prüfen. Verglichen wird ungerundet; bei Zeilen mit Fahrenheit-Original
   * (USDA, King Arthur) gegen den exakten °F-Wert der Quelle, nicht gegen dessen gerundete Celsius-Angabe.
   * Rückgabe: { status: 'erreicht' | 'darunter' | 'darueber' | 'ohne-zahl' | 'ungueltig', titel, c, ziel, diff, schritte[], naechster }
   */
  var EPS = 1e-9;
  function kernPruefen(id, wert, einheit) {
    var z = finden(KERN, id), x = zahlLesen(wert);
    if (!z) return { status: 'ungueltig', titel: 'Eingabe prüfen', grund: 'Unbekannter Eintrag.' };
    if (z.c === null) return { status: 'ohne-zahl', titel: 'Sichtprobe statt Gradzahl', zeile: z, schritte: ['Die Quelle nennt keine Gradzahl, sondern eine Sichtprobe: ' + z.wert + '.'], naechster: 'Sichtprobe an der dicksten Stelle machen.' };
    if (x === null) return { status: 'ungueltig', titel: 'Eingabe prüfen', zeile: z, grund: 'Bitte eine Temperatur als Zahl eingeben, zum Beispiel 68 oder 68,5.' };
    var c = einheit === 'f' ? fNachC(x) : x;
    if (c < -30 || c > 150) return { status: 'ungueltig', titel: 'Eingabe prüfen', zeile: z, grund: 'Der Wert liegt außerhalb dessen, was ein Bratenthermometer im Lebensmittel misst (−30 bis 150 °C).' };
    // USDA druckt neben °F auch °C (z. B. 160 °F = 71,1 °C): Bei Celsius-Eingaben gilt der kleinere der beiden Werte als Ziel,
    // damit weder der exakte °F-Wert noch die von der Quelle gedruckte Celsius-Zahl als „nicht erreicht“ erscheint.
    var ziel = z.f ? (z.quelle === 'fsis' && einheit !== 'f' ? Math.min(fNachC(z.f), z.c) : fNachC(z.f)) : z.c;
    var zielBis = z.fBis ? fNachC(z.fBis) : (z.cBis || null);
    // Fahrenheit-Eingaben direkt in °F vergleichen, damit 145 °F exakt 145 °F trifft
    var diff = einheit === 'f' && z.f ? (x - z.f) / 1.8 : c - ziel;
    if (Math.abs(diff) < EPS) diff = 0;
    var drueber = zielBis !== null && (einheit === 'f' && z.fBis ? x - z.fBis : c - zielBis) > EPS;
    // So viele Nachkommastellen, dass die Anzeige dem Ergebnis nicht widerspricht (69,95 darf nicht als 70,0 erscheinen)
    var st = einheit === 'f' ? 1 : Math.max(1, Math.min(2, (String(x).split('.')[1] || '').length));
    while (st < 3 && diff !== 0 && (Number(Math.abs(diff).toFixed(st)) === 0 || Number(c.toFixed(st)) === Number(ziel.toFixed(st)))) st++;
    var schritte = [];
    if (einheit === 'f') schritte.push('Umrechnung: (' + zahl(x, x % 1 ? 2 : 0) + ' °F − 32) ÷ 1,8 = ' + zahl(c, st) + ' °C');
    schritte.push((z.art === 'garprobe' ? 'Richtwert laut ' : 'Zielwert laut ') + QUELLEN[z.quelle].kurz + ': ' + zahl(ziel, st) + ' °C' + (z.f ? ' (' + z.f + ' °F)' : '') + (zielBis !== null ? ' bis ' + zahl(zielBis, st) + ' °C' + (z.fBis ? ' (' + z.fBis + ' °F)' : '') : ''));
    schritte.push('Vergleich: ' + zahl(c, st) + ' °C − ' + zahl(ziel, st) + ' °C = ' + (diff > 0 ? '+' : diff < 0 ? '−' : '') + zahl(Math.abs(diff), st) + ' °C');
    var r = { zeile: z, c: c, ziel: ziel, diff: diff, stellen: st, schritte: schritte };
    if (z.art === 'garprobe') {
      if (diff < 0) { r.status = 'darunter'; r.titel = 'Richtwert noch nicht erreicht'; r.naechster = 'Weiterbacken und in einigen Minuten erneut in der Mitte messen. Es fehlen ' + zahl(-diff, st) + ' °C bis zum Richtwert.'; }
      else if (drueber) { r.status = 'darueber'; r.titel = 'Über dem Richtbereich'; r.naechster = 'Über dem Richtbereich der Quelle (bis ' + zahl(zielBis, 1) + ' °C): herausnehmen.'; }
      else if (zielBis !== null) { r.status = 'erreicht'; r.titel = 'Im Richtbereich'; r.naechster = 'Im Richtbereich der Quelle. Mit Stäbchen- oder Klopfprobe gegenprüfen und herausnehmen.'; }
      else { r.status = 'erreicht'; r.titel = diff === 0 ? 'Richtwert erreicht' : 'Richtwert überschritten'; r.naechster = (diff === 0 ? 'Richtwert erreicht.' : 'Der Messwert liegt ' + zahl(diff, st) + ' °C über dem Richtwert; eine Obergrenze nennt die Quelle nicht.') + ' Mit der Klopfprobe gegenprüfen und herausnehmen.'; }
      return r;
    }
    if (diff < 0) {
      r.status = 'darunter'; r.titel = 'Noch nicht erreicht';
      r.naechster = 'Weitergaren: Es fehlen ' + zahl(-diff, st) + ' °C. Danach an der dicksten Stelle erneut messen.';
    } else {
      r.status = 'erreicht';
      if (z.halteMin) { r.titel = 'Temperatur erreicht – ' + z.halteMin + ' Minuten halten'; r.naechster = 'Jetzt zählt die Zeit: Die ' + zahl(z.c) + ' °C müssen laut ' + QUELLEN[z.quelle].kurz + ' mindestens ' + z.halteMin + ' Minuten an allen Stellen gehalten werden – an einer zweiten Stelle nachmessen.'; }
      else if (z.ruheMin) { r.titel = 'Temperatur erreicht – ' + z.ruheMin + ' Minuten ruhen lassen'; r.naechster = 'Von der Hitze nehmen und mindestens ' + z.ruheMin + ' Minuten ruhen lassen, erst dann anschneiden.'; }
      else if (z.dauerhaft) { r.titel = 'Heiß genug zum Warmhalten'; r.naechster = 'Die Temperatur darf an keiner Stelle unter ' + zahl(z.c) + ' °C fallen – regelmäßig nachmessen.'; }
      else { r.titel = 'Mindestwert erreicht'; r.naechster = 'An einer zweiten Stelle nachmessen, dann servieren.'; }
    }
    return r;
  }

  /* ISO-Datum „JJJJ-MM-TT“ streng lesen (kein Date-Parsing von Freitext). */
  function datumLesen(s) {
    var m = String(s === null || s === undefined ? '' : s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    var j = +m[1], mo = +m[2], t = +m[3];
    if (j < 2000 || j > 2100) return null;
    var d = new Date(Date.UTC(j, mo - 1, t));
    if (d.getUTCFullYear() !== j || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== t) return null;
    return d;
  }
  function plusTage(d, n) { return new Date(d.getTime() + n * 86400000); }
  function iso(d) { return d.toISOString().slice(0, 10); }
  var WOTAG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  function datumText(d) { return WOTAG[d.getUTCDay()] + ', ' + d.getUTCDate() + '.' + (d.getUTCMonth() + 1) + '.' + d.getUTCFullYear(); }
  function tageVon(n, e) { return e === 'w' ? n * 7 : n; }
  function fristText(z) {
    var e = z.e === 'h' ? 'Stunden' : z.e === 'w' ? 'Wochen' : 'Tage';
    if (z.von === z.bis) return (z.e === 'd' && z.von === 7 ? '1 Woche' : z.von === 1 ? '1 ' + (z.e === 'h' ? 'Stunde' : z.e === 'w' ? 'Woche' : 'Tag') : z.von + ' ' + e);
    return z.von + ' bis ' + z.bis + ' ' + e;
  }

  function tageText(n) { return n + (n === 1 ? ' Tag' : ' Tage'); }
  /*
   * Frist ab einem Startdatum. Der Starttag zählt als Tag 0. heute (ISO) ist optional und liefert Lage, Resttage und nächsten Schritt.
   * Rückgabe: { status: 'ok' | 'stunden' | 'ungueltig', frueh, spaet (ISO), schritte[], rest, lage, titel, naechster }
   * lage: 'zukunft' | 'frisch' (vor der kürzeren Frist) | 'fenster' (zwischen kürzerer und längerer Frist) | 'letzter' (letzter Tag) | 'abgelaufen'
   */
  function fristBerechnen(id, startIso, heuteIso) {
    var z = finden(LAGER, id), start = datumLesen(startIso);
    if (!z) return { status: 'ungueltig', grund: 'Unbekannter Eintrag.' };
    if (!start) return { status: 'ungueltig', zeile: z, grund: 'Bitte ein gültiges Datum wählen.' };
    var q = QUELLEN[z.quelle], heute = datumLesen(heuteIso);
    var stunden = z.e === 'h';
    var a = stunden ? 0 : tageVon(z.von, z.e), b = stunden ? 0 : tageVon(z.bis, z.e);
    var frueh = plusTage(start, a), spaet = plusTage(start, b);
    var schritte;
    if (stunden) schritte = [q.kurz + ': innerhalb von ' + z.von + ' bis ' + z.bis + ' Stunden nach dem ' + z.ab + ' verbrauchen – also noch am ' + datumText(start) + '.'];
    else {
      schritte = [
        'Frist laut ' + q.kurz + ': ' + fristText(z) + (z.e === 'w' ? ' (= ' + a + (a === b ? '' : ' bis ' + b) + ' Tage)' : '') + ', gezählt ab ' + abText(z),
        datumText(start) + ' + ' + tageText(a) + ' = ' + datumText(frueh)
      ];
      if (b !== a) schritte.push(datumText(start) + ' + ' + tageText(b) + ' = ' + datumText(spaet));
    }
    schritte.push('Voraussetzung der Quelle: ' + z.bedingung + '.');
    var r = { status: stunden ? 'stunden' : 'ok', zeile: z, frueh: iso(frueh), spaet: iso(spaet), fruehText: datumText(frueh), spaetText: datumText(spaet), schritte: schritte };
    if (!heute) return r;
    r.rest = Math.round((spaet.getTime() - heute.getTime()) / 86400000);
    r.vergangen = Math.round((heute.getTime() - start.getTime()) / 86400000);
    r.lage = r.vergangen < 0 ? 'zukunft' : r.rest < 0 ? 'abgelaufen' : r.rest === 0 ? 'letzter' : heute.getTime() >= frueh.getTime() ? 'fenster' : 'frisch';
    var tk = z.tk && !/nicht/.test(z.tk) ? ' Tiefkühler laut Quelle: ' + z.tk + ' (nur Qualität, bei −18 °C).' : '';
    var heiss = z.erhitzen ? ' Beim Aufwärmen gilt laut BfR: mindestens 70 °C für 2 Minuten an allen Stellen.' : '';
    if (r.lage === 'zukunft') { r.titel = 'Datum liegt in der Zukunft'; r.naechster = 'Das Datum liegt nach dem heutigen Tag. Für eine Planung stimmt die Rechnung trotzdem.'; }
    else if (r.lage === 'abgelaufen') {
      r.titel = 'Frist überschritten';
      r.naechster = (stunden ? 'Die Quelle sieht den Verbrauch noch am Tag des Einkaufs vor; das war vor ' + tageText(-r.rest).replace('Tage', 'Tagen') + '.' : 'Die längste Frist der Quelle ist seit ' + tageText(-r.rest).replace('Tage', 'Tagen') + ' vorbei.') + ' Nicht mehr essen – auch wenn es noch gut riecht: Krankheitserreger sieht, riecht und schmeckt man nicht.';
    } else if (r.lage === 'letzter') {
      r.titel = stunden ? 'Noch heute verbrauchen' : 'Letzter Tag der Frist';
      r.naechster = (stunden ? 'Heute ist der Tag des Einkaufs: innerhalb von ' + z.von + ' bis ' + z.bis + ' Stunden verbrauchen und bis dahin an der kältesten Stelle lagern.' : 'Heute endet die ' + (a === b ? 'Frist' : 'längere Frist') + ' der Quelle. Heute verbrauchen oder wegwerfen.') + heiss;
    } else if (r.lage === 'fenster') {
      r.titel = 'Kürzere Frist erreicht';
      r.naechster = 'Die Quelle nennt eine Spanne. Die kürzere Angabe (' + tageText(a) + ') ist erreicht, die längere (' + tageText(b) + ') endet in ' + tageText(r.rest).replace('Tage', 'Tagen') + ' am ' + r.spaetText + '. Wer vorsichtig sein will, verbraucht jetzt; nach dem ' + r.spaetText + ' nicht mehr essen.' + heiss;
    } else {
      r.titel = 'Innerhalb der Frist';
      r.naechster = 'Noch ' + tageText(Math.round((frueh.getTime() - heute.getTime()) / 86400000)) + ' bis zum Ende der ' + (a === b ? 'Frist' : 'kürzeren Frist, ' + tageText(r.rest) + ' bis zum Ende der längeren') + '. Was Sie bis dahin nicht essen, rechtzeitig einfrieren.' + tk;
    }
    return r;
  }

  /* CSV nach RFC 4180 mit Schutz vor Formel-Auswertung in Tabellenprogrammen (= + - @ Tab CR am Zellanfang). */
  function csvZelle(v) {
    var s = String(v === null || v === undefined ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function csv(kopf, zeilen) {
    return '﻿' + [kopf].concat(zeilen).map(function (r) { return r.map(csvZelle).join(';'); }).join('\r\n') + '\r\n';
  }
  function kernCsv(liste) {
    return csv(['Lebensmittel', 'Art', 'Zielwert', 'Hinweis', 'Quelle', 'Link', 'Abruf'], liste.map(function (z) {
      var q = QUELLEN[z.quelle];
      return [z.name, z.art === 'sicherheit' ? 'Mindestwert (Sicherheit)' : 'Garprobe (Qualität)', z.wert, z.hinweis, q.name, q.url, ABRUF];
    }));
  }
  function lagerCsv(liste) {
    return csv(['Lebensmittel', 'Frist im Kühlschrank', 'gezählt ab', 'Bedingung', 'Tiefkühler (nur Qualität)', 'Quelle', 'Link', 'Abruf'], liste.map(function (z) {
      var q = QUELLEN[z.quelle];
      return [z.name, fristText(z), abText(z), z.bedingung, z.tk, q.name, q.url, ABRUF];
    }));
  }

  /*
   * Zustand für teilbare Links: nur bekannte Schlüssel, nur geprüfte Werte. Aufbau des Fragments: #k=id~wert~einheit bzw. #h=id~datum
   * Unbekanntes wird verworfen – aus einem Link gelangt nie freier Text in die Seite.
   */
  function kernLink(id, wert, einheit) {
    if (!finden(KERN, id)) return '';
    var x = zahlLesen(wert);
    return 'k=' + id + (x === null ? '' : '~' + String(x) + '~' + (einheit === 'f' ? 'f' : 'c'));
  }
  function lagerLink(id, datum) {
    if (!finden(LAGER, id)) return '';
    return 'h=' + id + (datumLesen(datum) ? '~' + datum : '');
  }
  function linkLesen(hash) {
    var m = String(hash || '').replace(/^#/, '').match(/^([kh])=([a-z0-9-]{1,40})(?:~([0-9.\-]{1,10}))?(?:~([cf]))?$/);
    if (!m) return null;
    if (m[1] === 'k') {
      if (!finden(KERN, m[2])) return null;
      var x = m[3] === undefined ? null : zahlLesen(m[3]);
      return { art: 'k', id: m[2], wert: x, einheit: m[4] === 'f' ? 'f' : 'c' };
    }
    if (!finden(LAGER, m[2])) return null;
    return { art: 'h', id: m[2], datum: m[3] && datumLesen(m[3]) ? m[3] : null };
  }

  return {
    ABRUF: ABRUF, QUELLEN: QUELLEN, KERN: KERN, KERN_GRUPPEN: KERN_GRUPPEN, LAGER: LAGER, LAGER_GRUPPEN: LAGER_GRUPPEN,
    quelle: quelle, cNachF: cNachF, fNachC: fNachC, zahl: zahl, norm: norm, suchtext: suchtext, filtern: filtern, zahlLesen: zahlLesen,
    kernPruefen: kernPruefen, datumLesen: datumLesen, datumText: datumText, fristText: fristText, abText: abText, fristBerechnen: fristBerechnen,
    csvZelle: csvZelle, csv: csv, kernCsv: kernCsv, lagerCsv: lagerCsv, kernLink: kernLink, lagerLink: lagerLink, linkLesen: linkLesen
  };
});
