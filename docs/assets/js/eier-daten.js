/*
 * Küchenideenkompass – Eiergrößen EU und USA
 * Stand: November 2026. Gewichte in Gramm je Ei mit Schale, je Wert mit Quelle.
 * Läuft im Browser (window.KIK.eier) und in Node (module.exports).
 */
(function (root, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik();
  else { root.KIK = root.KIK || {}; root.KIK.eier = fabrik(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var UNZE = 28.349523125; // g, internationale Unze (avoirdupois)

  var QUELLEN = {
    eu: { name: 'Delegierte Verordnung (EU) 2023/2465, Art. 5 – Gewichtsklassen für Eier der Klasse A', url: 'https://eur-lex.europa.eu/eli/reg_del/2023/2465/oj?locale=de' },
    usda: { name: 'USDA Agricultural Marketing Service – Minimum Net Weight for Various Egg Containers', url: 'https://www.ams.usda.gov/sites/default/files/media/ConsumerContainerNetWeightDeclaration.pdf' },
    ka: { name: 'King Arthur Baking – Ingredient Weight Chart (1 large egg, without shell, 50 g)', url: 'https://www.kingarthurbaking.com/learn/ingredient-weight-chart' }
  };

  // EU: Grenzen je Einzelei. min/max in g, max exklusiv; null = offen.
  // rechen: Rechenwert, wo die Norm offen ist, ausdrücklich als Annahme gekennzeichnet.
  var EU = [
    { id: 'eu-s', name: 'S (klein)', min: null, max: 53, rechen: 50, annahme: true },
    { id: 'eu-m', name: 'M (mittel)', min: 53, max: 63, rechen: 58 },
    { id: 'eu-l', name: 'L (groß)', min: 63, max: 73, rechen: 68 },
    { id: 'eu-xl', name: 'XL (sehr groß)', min: 73, max: null, rechen: 76, annahme: true }
  ];

  // USA: Mindestgewicht je Dutzend in Unzen; je Ei = Durchschnitt im Karton.
  var US = [
    { id: 'us-peewee', name: 'Peewee', ozDutzend: 15 },
    { id: 'us-small', name: 'Small', ozDutzend: 18 },
    { id: 'us-medium', name: 'Medium', ozDutzend: 21 },
    { id: 'us-large', name: 'Large', ozDutzend: 24 },
    { id: 'us-xl', name: 'Extra Large', ozDutzend: 27 },
    { id: 'us-jumbo', name: 'Jumbo', ozDutzend: 30 }
  ].map(function (k) { k.minProEi = k.ozDutzend * UNZE / 12; k.rechen = k.minProEi; return k; });

  // Anteil ohne Schale: King Arthur 50 g Inhalt je US-large-Ei, USDA-Mindestdurchschnitt 56,7 g mit Schale.
  var ESSBAR = 50 / (24 * UNZE / 12);

  function klasse(id) { return EU.concat(US).filter(function (k) { return k.id === id; })[0] || null; }

  // EU-Klasse, in die ein Gewicht je Ei fällt
  function euKlasseFuer(g) {
    return EU.filter(function (k) { return (k.min === null || g >= k.min) && (k.max === null || g < k.max); })[0];
  }

  // Wie viele Eier der Klasse "habe" ersetzen n Eier der Klasse "rezept"?
  function ersetzen(rezeptId, n, habeId) {
    var r = klasse(rezeptId), hb = klasse(habeId);
    if (!r || !hb || !(n > 0)) return null;
    var masse = r.rechen * n;
    var stueck = masse / hb.rechen;
    return { masseMitSchale: masse, masseOhneSchale: masse * ESSBAR, stueck: stueck, annahme: !!(r.annahme || hb.annahme) };
  }

  return { UNZE: UNZE, QUELLEN: QUELLEN, EU: EU, US: US, ESSBAR: ESSBAR, klasse: klasse, euKlasseFuer: euKlasseFuer, ersetzen: ersetzen };
});
