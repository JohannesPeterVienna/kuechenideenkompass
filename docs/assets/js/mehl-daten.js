/*
 * Küchenideenkompass – Mehltypen Österreich · Deutschland · Schweiz
 * Stand: November 2026. Mineralstoffgehalt (Asche) in % der Trockenmasse, je Wert mit Quelle.
 * Läuft im Browser (window.KIK.mehl) und in Node (module.exports).
 */
(function (root, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik();
  else { root.KIK = root.KIK || {}; root.KIK.mehl = fabrik(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var QUELLEN = {
    oelmb: { name: 'Österreichisches Lebensmittelbuch, Kapitel B 20 „Mahl- und Schälprodukte“', url: 'https://www.lebensmittelbuch.at/lebensmittelbuch/b-20-mahl-und-schaelprodukte' },
    ak: { name: 'Arbeiterkammer Wien – Herstellung und Verarbeitung von Lebensmitteln (Kapitel Mahlprodukte)', url: 'https://wien.arbeiterkammer.at/service/broschueren/konsument/Lebensmittelproduktion_122016.pdf' },
    din: { name: 'DIN 10355:2007-11 „Mahlerzeugnisse aus Getreide – Anforderungen, Typen“, Werte nach Wikipedia „Mehltype“', url: 'https://de.wikipedia.org/wiki/Mehltype' },
    vlph: { name: 'Schweiz: Verordnung des EDI über Lebensmittel pflanzlicher Herkunft (VLpH), Art. 63', url: 'https://www.fedlex.admin.ch/eli/cc/2017/181/de' }
  };

  var LAENDER = { at: 'Österreich', de: 'Deutschland', ch: 'Schweiz' };

  // min: null = keine Untergrenze in der Norm ("bis …")
  var SORTEN = [
    { id: 'at-w480', land: 'at', korn: 'weizen', name: 'W 480', lang: 'Weizenmehl Type 480 (glatt, griffig, Universal)', min: 0.33, max: 0.58, q: 'ak' },
    { id: 'at-w700', land: 'at', korn: 'weizen', name: 'W 700', lang: 'Weizenkoch- und -backmehl Type 700', min: 0.66, max: 0.79, q: 'ak' },
    { id: 'at-w1600', land: 'at', korn: 'weizen', name: 'W 1600', lang: 'Weizenbrotmehl Type 1600', min: 1.50, max: 1.75, q: 'ak' },
    { id: 'de-405', land: 'de', korn: 'weizen', name: 'Type 405', lang: 'Weizenmehl Type 405', min: null, max: 0.50, q: 'din' },
    { id: 'de-550', land: 'de', korn: 'weizen', name: 'Type 550', lang: 'Weizenmehl Type 550', min: 0.51, max: 0.63, q: 'din' },
    { id: 'de-812', land: 'de', korn: 'weizen', name: 'Type 812', lang: 'Weizenmehl Type 812', min: 0.64, max: 0.90, q: 'din' },
    { id: 'de-1050', land: 'de', korn: 'weizen', name: 'Type 1050', lang: 'Weizenmehl Type 1050', min: 0.91, max: 1.20, q: 'din' },
    { id: 'de-1600', land: 'de', korn: 'weizen', name: 'Type 1600', lang: 'Weizenmehl Type 1600', min: 1.21, max: 1.80, q: 'din' },
    { id: 'ch-weiss', land: 'ch', korn: 'weizen', name: 'Weissmehl', lang: 'Weissmehl', min: null, max: 0.63, q: 'vlph' },
    { id: 'ch-halbweiss', land: 'ch', korn: 'weizen', name: 'Halbweissmehl', lang: 'Halbweissmehl', min: 0.64, max: 0.90, q: 'vlph' },
    { id: 'ch-ruch', land: 'ch', korn: 'weizen', name: 'Ruchmehl', lang: 'Ruchmehl', min: 0.91, max: 1.69, q: 'vlph' },
    { id: 'at-r500', land: 'at', korn: 'roggen', name: 'R 500', lang: 'Roggenvorschussmehl Type 500', min: 0.43, max: 0.57, q: 'ak' },
    { id: 'at-r960', land: 'at', korn: 'roggen', name: 'R 960', lang: 'Roggenbrotmehl Type 960', min: 0.88, max: 1.12, q: 'ak' },
    { id: 'at-r2500', land: 'at', korn: 'roggen', name: 'R 2500', lang: 'Schwarzroggenmehl Type 2500', min: 2.0, max: 3.0, q: 'ak' },
    { id: 'de-815', land: 'de', korn: 'roggen', name: 'Type 815', lang: 'Roggenmehl Type 815', min: null, max: 0.90, q: 'din' },
    { id: 'de-997', land: 'de', korn: 'roggen', name: 'Type 997', lang: 'Roggenmehl Type 997', min: 0.91, max: 1.10, q: 'din' },
    { id: 'de-1150', land: 'de', korn: 'roggen', name: 'Type 1150', lang: 'Roggenmehl Type 1150', min: 1.11, max: 1.30, q: 'din' },
    { id: 'de-1370', land: 'de', korn: 'roggen', name: 'Type 1370', lang: 'Roggenmehl Type 1370', min: 1.31, max: 1.60, q: 'din' },
    { id: 'de-1740', land: 'de', korn: 'roggen', name: 'Type 1740', lang: 'Roggenmehl Type 1740', min: 1.61, max: 1.80, q: 'din' }
  ];

  function sorte(id) { return SORTEN.filter(function (s) { return s.id === id; })[0] || null; }
  function untergrenze(s) { return s.min === null ? 0 : s.min; }
  function bereichText(s) {
    var f = function (x) { return x.toFixed(2).replace('.', ','); };
    return s.min === null ? 'bis ' + f(s.max) + ' %' : f(s.min) + '–' + f(s.max) + ' %';
  }

  // Wie viel des Normbereichs von a liegt im Normbereich von b? (0 … 1)
  function ueberschneidung(a, b) {
    var lo = Math.max(untergrenze(a), untergrenze(b)), hi = Math.min(a.max, b.max);
    if (hi < lo) return { anteil: 0, von: null, bis: null };
    var breite = a.max - untergrenze(a);
    return { anteil: breite > 0 ? (hi - lo) / breite : 1, von: lo, bis: hi };
  }

  // Mischung zweier Mehle mit geschlossenen Bereichen auf die Bereichsmitte des Ziels (Asche mischt sich nach Masse linear)
  function mischung(ziel, tief, hoch) {
    if (ziel.min === null || tief.min === null || hoch.min === null) return null;
    var m = (ziel.min + ziel.max) / 2, mt = (tief.min + tief.max) / 2, mh = (hoch.min + hoch.max) / 2;
    if (!(mt < m && m < mh)) return null;
    var anteilTief = (mh - m) / (mh - mt);
    return { tief: tief, hoch: hoch, anteilTief: anteilTief, anteilHoch: 1 - anteilTief };
  }

  // Entsprechungen einer Sorte in einem anderen Land
  function entsprechungen(id, land) {
    var a = sorte(id);
    if (!a) return null;
    var kandidaten = SORTEN.filter(function (s) { return s.land === land && s.korn === a.korn; });
    var treffer = kandidaten.map(function (s) { var u = ueberschneidung(a, s); return { sorte: s, anteil: u.anteil, von: u.von, bis: u.bis }; })
      .filter(function (t) { return t.anteil > 0; })
      .sort(function (x, y) { return y.anteil - x.anteil; });
    var ergebnis = { land: land, treffer: treffer, mischung: null, keineSorten: kandidaten.length === 0 };
    if (!treffer.length && kandidaten.length) {
      var darunter = kandidaten.filter(function (s) { return s.max < untergrenze(a); }).sort(function (x, y) { return y.max - x.max; })[0];
      var darueber = kandidaten.filter(function (s) { return untergrenze(s) > a.max; }).sort(function (x, y) { return untergrenze(x) - untergrenze(y); })[0];
      ergebnis.darunter = darunter || null;
      ergebnis.darueber = darueber || null;
      if (darunter && darueber) ergebnis.mischung = mischung(a, darunter, darueber);
    }
    return ergebnis;
  }

  return { QUELLEN: QUELLEN, LAENDER: LAENDER, SORTEN: SORTEN, sorte: sorte, bereichText: bereichText, ueberschneidung: ueberschneidung, mischung: mischung, entsprechungen: entsprechungen };
});
