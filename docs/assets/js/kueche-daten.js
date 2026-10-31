/*
 * Küchenideenkompass – Datenbasis der Rezept-Werkbank
 * Stand: Oktober 2026. Jeder Wert trägt seine Quelle.
 * Läuft im Browser (window.KIK.daten) und in Node (module.exports).
 */
(function (root, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik();
  else { root.KIK = root.KIK || {}; root.KIK.daten = fabrik(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var QUELLEN = {
    ka: {
      name: 'King Arthur Baking – Ingredient Weight Chart',
      url: 'https://www.kingarthurbaking.com/learn/ingredient-weight-chart'
    },
    nist: {
      name: 'NIST – Approximate Conversions from U.S. Customary Measures to Metric',
      url: 'https://www.nist.gov/pml/owm/approximate-conversions-us-customary-measures-metric'
    },
    oetkerBackpulver: {
      name: 'Dr. Oetker Österreich – Wie viel Backpulver braucht man?',
      url: 'https://www.oetker.at/inspiration/tipps-tricks/t/wie-viel-backpulver-braucht-man'
    },
    oetkerGerm: {
      name: 'Dr. Oetker Österreich – Welche Arten von Germ gibt es?',
      url: 'https://www.oetker.at/inspiration/tipps-tricks/t/welche-arten-von-germ-gibt-es'
    },
    oetkerTrockenhefeCH: {
      name: 'Dr. Oetker Schweiz – Trockenhefe richtig angewendet',
      url: 'https://www.oetker.ch/inspiration/tipps-tricks/t/trockenhefe-richtig-angewendet'
    },
    neff: {
      name: 'NEFF – Umluft und Ober-/Unterhitze',
      url: 'https://www.neff-home.com/de/neff-entdecken/produkt-design-highlights/funktionen-von-a-z/umluft-ober-unterhitze'
    },
    cabot: {
      name: 'Cabot Creamery – How many tablespoons in a stick of butter',
      url: 'https://cabotcreamery.com/blogs/food/how-many-tablespoons-in-a-stick-of-butter'
    },
    dudenDekagramm: { name: 'Duden – Dekagramm', url: 'https://www.duden.de/rechtschreibung/Dekagramm' },
    dudenAchterl: { name: 'Duden – Achterl', url: 'https://www.duden.de/rechtschreibung/Achterl' }
  };

  /* US-Maße in Millilitern (NIST, gerundete Näherungen) */
  var US_ML = { cup: 236.59, el: 14.79, tl: 4.93, floz: 29.57 };

  /*
   * Zutaten-Waage. Gewicht für ein bestimmtes Volumen laut King Arthur.
   * vol: Volumen in Cups (1 Cup = 16 EL = 48 TL nach US-Definition).
   */
  var WAAGE = [
    { id: 'weizenmehl', name: 'Weizenmehl (Allzweck)', en: 'All-Purpose Flour', volText: '1 cup', cups: 1, g: 120, muster: ['weizenmehl', 'mehl', 'universalmehl', 'glattes mehl', 'all-purpose flour', 'flour'] },
    { id: 'vollkornmehl', name: 'Weizenvollkornmehl', en: 'Whole Wheat Flour (Premium 100%)', volText: '1 cup', cups: 1, g: 113, muster: ['vollkornmehl', 'weizenvollkornmehl', 'whole wheat flour'] },
    { id: 'roggenmehl', name: 'Roggenmehl, hell', en: 'White Rye Flour', volText: '1 cup', cups: 1, g: 106, muster: ['roggenmehl', 'rye flour'] },
    { id: 'hartweizengriess', name: 'Hartweizengrieß (Semola)', en: 'Semolina Flour', volText: '1 cup', cups: 1, g: 163, muster: ['hartweizengrieß', 'hartweizengriess', 'semola', 'semolina'] },
    { id: 'maismehl', name: 'Maismehl, grob (Cornmeal)', en: 'Cornmeal (whole)', volText: '1 cup', cups: 1, g: 138, muster: ['maismehl', 'cornmeal'] },
    { id: 'zucker', name: 'Kristallzucker / Zucker', en: 'Sugar (granulated white)', volText: '1 cup', cups: 1, g: 198, muster: ['kristallzucker', 'feinkristallzucker', 'zucker', 'sugar'] },
    { id: 'braunerzucker', name: 'Brauner Zucker, fest gedrückt', en: 'Brown sugar (dark or light, packed)', volText: '1 cup', cups: 1, g: 213, muster: ['brauner zucker', 'braunen zucker', 'brown sugar'] },
    { id: 'staubzucker', name: 'Staubzucker / Puderzucker', en: "Confectioners' sugar (unsifted)", volText: '1 cup', cups: 1, g: 113, muster: ['staubzucker', 'puderzucker', "confectioners' sugar", 'powdered sugar'] },
    { id: 'butter', name: 'Butter', en: 'Butter', volText: '8 tablespoons (1/2 cup)', cups: 0.5, g: 113, muster: ['butter'] },
    { id: 'milch', name: 'Milch', en: 'Milk (fresh)', volText: '1 cup', cups: 1, g: 227, fluessig: true, muster: ['milch', 'vollmilch', 'milk'] },
    { id: 'obers', name: 'Obers / Sahne / Rahm', en: 'Cream (heavy cream, light cream, or half & half)', volText: '1 cup', cups: 1, g: 227, fluessig: true, muster: ['schlagobers', 'obers', 'schlagsahne', 'sahne', 'schlagrahm', 'rahm', 'heavy cream', 'cream'] },
    { id: 'sauerrahm', name: 'Sauerrahm / saure Sahne', en: 'Sour cream', volText: '1 cup', cups: 1, g: 227, muster: ['sauerrahm', 'saure sahne', 'sour cream'] },
    { id: 'joghurt', name: 'Joghurt', en: 'Yogurt', volText: '1 cup', cups: 1, g: 227, muster: ['joghurt', 'jogurt', 'yogurt'] },
    { id: 'frischkaese', name: 'Frischkäse', en: 'Cream cheese', volText: '1 cup', cups: 1, g: 227, muster: ['frischkäse', 'cream cheese'] },
    { id: 'oel', name: 'Pflanzenöl', en: 'Vegetable oil', volText: '1 cup', cups: 1, g: 198, fluessig: true, muster: ['pflanzenöl', 'sonnenblumenöl', 'rapsöl', 'öl', 'vegetable oil', 'oil'] },
    { id: 'honig', name: 'Honig', en: 'Honey', volText: '1 tablespoon', cups: 1 / 16, g: 21, muster: ['honig', 'honey'] },
    { id: 'ahornsirup', name: 'Ahornsirup', en: 'Maple syrup', volText: '1/2 cup', cups: 0.5, g: 156, muster: ['ahornsirup', 'maple syrup'] },
    { id: 'kakao', name: 'Kakaopulver, ungesüßt', en: 'Cocoa (unsweetened)', volText: '1/2 cup', cups: 0.5, g: 42, muster: ['kakaopulver', 'kakao', 'backkakao', 'cocoa'] },
    { id: 'haferflocken', name: 'Haferflocken', en: 'Oats (old-fashioned or quick-cooking)', volText: '1 cup', cups: 1, g: 89, muster: ['haferflocken', 'oats'] },
    { id: 'reis', name: 'Reis, Langkorn, roh', en: 'Rice (long grain, dry)', volText: '1/2 cup', cups: 0.5, g: 99, muster: ['langkornreis', 'reis', 'rice'] },
    { id: 'speisestaerke', name: 'Speisestärke (Maisstärke)', en: 'Cornstarch', volText: '1/4 cup', cups: 0.25, g: 28, muster: ['speisestärke', 'maisstärke', 'stärke', 'maizena', 'cornstarch'] },
    { id: 'mandelngemahlen', name: 'Mandeln, gemahlen (Mandelmehl)', en: 'Almond Flour', volText: '1 cup', cups: 1, g: 96, muster: ['gemahlene mandeln', 'mandeln, gemahlen', 'mandeln gemahlen', 'mandelmehl', 'almond flour'] },
    { id: 'haselnuesse', name: 'Haselnüsse, ganz', en: 'Hazelnuts (whole)', volText: '1 cup', cups: 1, g: 142, muster: ['haselnüsse', 'haselnusskerne', 'hazelnuts'] },
    { id: 'walnuesse', name: 'Walnüsse, gehackt', en: 'Walnuts (chopped)', volText: '1 cup', cups: 1, g: 113, muster: ['walnüsse', 'walnusskerne', 'walnuts'] },
    { id: 'rosinen', name: 'Rosinen / Zibeben', en: 'Raisins (loose)', volText: '1 cup', cups: 1, g: 149, muster: ['rosinen', 'zibeben', 'raisins'] },
    { id: 'schokotropfen', name: 'Schokotropfen, zartbitter', en: 'Chocolate Chips (Guittard bittersweet)', volText: '1 cup', cups: 1, g: 170, muster: ['schokotropfen', 'schokostückchen', 'schokodrops', 'chocolate chips'] },
    { id: 'vollmilchpulver', name: 'Vollmilchpulver', en: 'Dried whole milk (powdered)', volText: '1/2 cup', cups: 0.5, g: 50, muster: ['vollmilchpulver', 'milchpulver'] },
    { id: 'salz', name: 'Speisesalz, fein', en: 'Salt (table)', volText: '1 tablespoon', cups: 1 / 16, g: 18, muster: ['speisesalz', 'tafelsalz', 'salz', 'salt'] },
    { id: 'backpulver', name: 'Backpulver', en: 'Baking powder', volText: '1 teaspoon', cups: 1 / 48, g: 4, muster: ['backpulver', 'baking powder'] },
    { id: 'natron', name: 'Natron', en: 'Baking soda', volText: '1/2 teaspoon', cups: 1 / 96, g: 3, muster: ['natron', 'speisenatron', 'baking soda'] },
    // Ergänzt 31.10.2026 aus derselben King-Arthur-Tabelle (zusammengesetzte Zutaten)
    { id: 'erdnussbutter', name: 'Erdnussbutter', en: 'Peanut butter', volText: '1/2 cup', cups: 0.5, g: 135, muster: ['erdnussbutter', 'erdnussmus', 'peanut butter'] },
    { id: 'mandelmus', name: 'Mandelmus', en: 'Almond butter', volText: '1/4 cup', cups: 0.25, g: 68, muster: ['mandelmus', 'almond butter'] },
    { id: 'kokosmehl', name: 'Kokosmehl', en: 'Coconut Flour', volText: '1 cup', cups: 1, g: 128, muster: ['kokosmehl', 'coconut flour'] },
    { id: 'brotmehl', name: 'Brotmehl (US Bread Flour)', en: 'Bread Flour', volText: '1 cup', cups: 1, g: 120, muster: ['bread flour'] },
    { id: 'cakeflour', name: 'Kuchenmehl (US Cake Flour)', en: 'Unbleached Cake Flour', volText: '1 cup', cups: 1, g: 120, muster: ['cake flour'] },
    { id: 'pastryflour', name: 'Feines Gebäckmehl (US Pastry Flour)', en: 'Pastry Flour', volText: '1 cup', cups: 1, g: 106, muster: ['pastry flour'] },
    { id: 'selfrising', name: 'Mehl mit Backtriebmittel (Self-Rising)', en: 'Self-Rising Flour', volText: '1 cup', cups: 1, g: 113, muster: ['self-rising flour', 'self-raising flour'] },
    { id: 'reismehl', name: 'Reismehl, weiß', en: 'Rice flour (white)', volText: '1 cup', cups: 1, g: 142, muster: ['reismehl', 'rice flour'] },
    { id: 'hafermehl', name: 'Hafermehl', en: 'Oat Flour', volText: '1 cup', cups: 1, g: 92, muster: ['hafermehl', 'oat flour'] },
    { id: 'buchweizenmehl', name: 'Buchweizenmehl', en: 'Buckwheat Flour', volText: '1 cup', cups: 1, g: 120, muster: ['buchweizenmehl', 'buckwheat flour'] },
    { id: 'kichererbsenmehl', name: 'Kichererbsenmehl', en: 'Chickpea flour', volText: '1 cup', cups: 1, g: 85, muster: ['kichererbsenmehl', 'chickpea flour'] },
    { id: 'kokosbluetenzucker', name: 'Kokosblütenzucker', en: 'Coconut sugar', volText: '1/2 cup', cups: 0.5, g: 77, muster: ['kokosblütenzucker', 'coconut sugar'] },
    { id: 'demerara', name: 'Demerara-Zucker', en: 'Demerara sugar', volText: '1 cup', cups: 1, g: 220, muster: ['demerarazucker', 'demerara-zucker', 'demerara sugar'] },
    { id: 'turbinado', name: 'Turbinado-Zucker', en: 'Turbinado sugar (raw)', volText: '1 cup', cups: 1, g: 180, muster: ['turbinado sugar', 'turbinado'] },
    { id: 'buttermilch', name: 'Buttermilch', en: 'Buttermilk', volText: '1 cup', cups: 1, g: 227, fluessig: true, muster: ['buttermilch', 'buttermilk'] },
    { id: 'kokosoel', name: 'Kokosöl', en: 'Coconut oil', volText: '1/2 cup', cups: 0.5, g: 113, muster: ['kokosöl', 'coconut oil'] },
    { id: 'kokosmilch', name: 'Kokosmilch (Dose, gut geschüttelt)', en: 'Coconut milk; canned, well shaken', volText: '1 cup', cups: 1, g: 241, fluessig: true, muster: ['kokosmilch', 'coconut milk'] },
    { id: 'melasse', name: 'Melasse', en: 'Molasses', volText: '1/4 cup', cups: 0.25, g: 85, muster: ['melasse', 'zuckerrohrmelasse', 'molasses'] },
    { id: 'maissirup', name: 'Maissirup', en: 'Corn syrup', volText: '1 cup', cups: 1, g: 312, muster: ['maissirup', 'corn syrup'] },
    { id: 'vanilleextrakt', name: 'Vanilleextrakt', en: 'Vanilla Extract', volText: '1 tablespoon', cups: 1 / 16, g: 14, fluessig: true, muster: ['vanilleextrakt', 'vanilla extract'] },
    { id: 'trockenhefe', name: 'Trockenhefe / Trockengerm (Instant)', en: 'Yeast (instant)', volText: '2 1/4 teaspoons', cups: 2.25 / 48, g: 7, muster: ['trockenhefe', 'trockengerm', 'trockenbackhefe', 'instant yeast'] }
  ];
  /*
   * Bewusst ohne Gewichtswert: mehrdeutig oder nicht in der Quelle. Diese Zutaten
   * werden in Milliliter umgerechnet und gekennzeichnet, statt den Grundbegriff zu nehmen.
   */
  var OHNE_WERT = ['rohrzucker', 'vanillezucker', 'hagelzucker', 'gelierzucker', 'dinkelmehl', 'paniermehl', 'semmelbrösel',
    'nussbutter', 'kakaobutter', 'cocoa butter', 'apple butter', 'cashew butter', 'erdnussöl', 'almond milk', 'mandelmilch',
    'hafermilch', 'oat milk', 'soy milk', 'sojamilch', 'kondensmilch', 'condensed milk', 'evaporated milk', 'coconut cream',
    'kokoscreme', 'ice cream', 'whipped cream', 'cream of tartar', 'weinstein', 'sugar substitute', 'zuckerersatz'];

  WAAGE.forEach(function (z) {
    z.gProMl = z.g / (z.cups * US_ML.cup);
    z.gProCup = z.g / z.cups;
    z.quelle = 'ka';
  });

  /* Stückgewichte, jeweils mit Quelle */
  var STUECK = {
    ei: { g: 50, text: '1 großes Ei (ohne Schale) ≈ 50 g', quelle: 'ka' },
    eiklar: { g: 32.5, text: '1 Eiklar ≈ 30–35 g', quelle: 'ka' },
    dotter: { g: 14, text: '1 Dotter ≈ 14 g', quelle: 'ka' },
    stickButter: { g: 113, text: '1 Stick Butter = ½ Cup = 8 EL ≈ 113 g', quelle: 'cabot' },
    backpulverPkg: { g: 16, text: '1 Päckchen Backpulver ≈ 16 g, reicht für 500 g Mehl', quelle: 'oetkerBackpulver' },
    trockenhefePkg: { g: 7, text: '1 Päckchen Trockengerm = 7 g, reicht für ca. 500 g Mehl', quelle: 'oetkerGerm' },
    germWuerfel: { g: 42, text: '1 Würfel Frischgerm = 42 g, reicht für ca. 1 kg Mehl', quelle: 'oetkerGerm' }
  };

  /*
   * Regionale Küchensprache. Jede Zeile: AT, DE, CH. Nur Paare mit Beleg.
   * kompos: darf als Wortanfang in Zusammensetzungen ersetzt werden.
   */
  var REGIONAL = [
    { at: 'Schlagobers', de: 'Schlagsahne', ch: 'Schlagrahm', beleg: 'Duden „Schlagobers“; Wiktionary „Schlagrahm“' },
    { at: 'Sauerrahm', de: 'saure Sahne', ch: 'Sauerrahm', beleg: 'Duden „Sauerrahm“' },
    { at: 'Obers', de: 'Sahne', ch: 'Rahm', beleg: 'Duden „Obers“, „Rahm“' },
    { at: 'Topfen', de: 'Quark', ch: 'Quark', kompos: true, beleg: 'Wiktionary „Topfen“' },
    { at: 'Trockengerm', de: 'Trockenhefe', ch: 'Trockenhefe', beleg: 'Duden „Germ“' },
    { at: 'Germ', de: 'Hefe', ch: 'Hefe', kompos: true, beleg: 'Duden „Germ“' },
    { at: 'Paradeiser', de: 'Tomaten', ch: 'Tomaten', kompos: true, beleg: 'Duden „Paradeiser“' },
    { at: 'Erdäpfel', de: 'Kartoffeln', ch: 'Kartoffeln', beleg: 'Duden „Erdapfel“' },
    { at: 'Erdapfel', de: 'Kartoffel', ch: 'Kartoffel', kompos: true, beleg: 'Duden „Erdapfel“' },
    { at: 'Karfiol', de: 'Blumenkohl', ch: 'Blumenkohl', kompos: true, beleg: 'Duden „Karfiol“' },
    { at: 'Fisolen', de: 'grüne Bohnen', ch: 'grüne Bohnen', beleg: 'Duden „Fisole“' },
    { at: 'Faschiertes', de: 'Hackfleisch', ch: 'Hackfleisch', beleg: 'Wiktionary „Faschiertes“' },
    { at: 'Faschiertem', de: 'Hackfleisch', ch: 'Hackfleisch', beleg: 'Wiktionary „Faschiertes“' },
    { at: 'Marillen', de: 'Aprikosen', ch: 'Aprikosen', kompos: true, beleg: 'Duden „Marille“; Wiktionary „Aprikose“' },
    { at: 'Marille', de: 'Aprikose', ch: 'Aprikose', beleg: 'Duden „Marille“' },
    { at: 'Ribiseln', de: 'Johannisbeeren', ch: 'Johannisbeeren', beleg: 'Duden „Ribisel“' },
    { at: 'Ribisel', de: 'Johannisbeer', ch: 'Johannisbeer', kompos: true, beleg: 'Duden „Ribisel“' },
    { at: 'Zwetschken', de: 'Zwetschgen', ch: 'Zwetschgen', kompos: true, beleg: 'Wiktionary „Zwetschke“' },
    { at: 'Kren', de: 'Meerrettich', ch: 'Meerrettich', kompos: true, beleg: 'Duden „Kren“; Wiktionary „Meerrettich“' },
    { at: 'Melanzani', de: 'Auberginen', ch: 'Auberginen', beleg: 'Wiktionary „Melanzani“, „Aubergine“' },
    { at: 'Kohlsprossen', de: 'Rosenkohl', ch: 'Rosenkohl', beleg: 'Wiktionary „Kohlsprosse“' },
    { at: 'Vogerlsalat', de: 'Feldsalat', ch: 'Nüsslisalat', beleg: 'Duden „Vogerlsalat“, „Nüsslisalat“' },
    { at: 'Eierschwammerl', de: 'Pfifferlinge', ch: 'Eierschwämme', beleg: 'Duden „Eierschwammerl“; Wiktionary „Eierschwamm“' },
    { at: 'Staubzucker', de: 'Puderzucker', ch: 'Puderzucker', beleg: 'Duden „Staubzucker“' },
    { at: 'Semmelbrösel', de: 'Paniermehl', ch: 'Paniermehl', beleg: 'Wiktionary „Brösel“, „Paniermehl“' },
    { at: 'Häuptelsalat', de: 'Kopfsalat', ch: 'Kopfsalat', beleg: 'Duden „Häuptelsalat“' },
    { at: 'Semmeln', de: 'Brötchen', ch: 'Weggli', beleg: 'Wiktionary „Semmel“; Duden „Weggli“' },
    { at: 'Semmel', de: 'Brötchen', ch: 'Weggli', beleg: 'Wiktionary „Semmel“; Duden „Weggli“' },
    { at: 'Karotten', de: 'Karotten', ch: 'Rüebli', beleg: 'Duden „Rüebli“' },
    { at: 'Backrohr', de: 'Backofen', ch: 'Backofen', beleg: 'Duden „Backrohr“' }
  ];

  /* Supermarktbereiche für die Einkaufsliste (Reihenfolge = Laufweg) */
  var BEREICHE = [
    { id: 'obst', name: 'Obst & Gemüse', muster: ['apfel', 'äpfel', 'birne', 'banane', 'zitrone', 'limette', 'orange', 'beeren', 'marille', 'aprikose', 'zwetsch', 'pflaume', 'kirsch', 'ribisel', 'johannisbeer', 'paradeiser', 'tomate', 'erdäpfel', 'erdapfel', 'kartoffel', 'zwiebel', 'knoblauch', 'karotte', 'rüebli', 'möhre', 'lauch', 'porree', 'sellerie', 'paprika', 'zucchini', 'melanzani', 'aubergine', 'karfiol', 'blumenkohl', 'brokkoli', 'kohl', 'kraut', 'salat', 'spinat', 'gurke', 'pilz', 'champignon', 'schwammerl', 'pfifferling', 'fisole', 'bohne', 'erbse', 'kürbis', 'ingwer', 'petersilie', 'schnittlauch', 'basilikum', 'dill', 'kren', 'meerrettich', 'avocado', 'rhabarber', 'rübe', 'kräuter'] },
    { id: 'kuehl', name: 'Milchprodukte & Eier', muster: ['milch', 'obers', 'sahne', 'rahm', 'topfen', 'quark', 'joghurt', 'jogurt', 'butter', 'käse', 'mozzarella', 'parmesan', 'mascarpone', 'ricotta', 'schmand', 'crème', 'creme fraiche', 'ei', 'eier', 'dotter', 'eigelb', 'eiklar', 'germ', 'frischhefe'] },
    { id: 'fleisch', name: 'Fleisch & Fisch', muster: ['fleisch', 'faschiert', 'hack', 'rind', 'schwein', 'kalb', 'lamm', 'huhn', 'hendl', 'hähnchen', 'pute', 'speck', 'schinken', 'wurst', 'lachs', 'fisch', 'thunfisch', 'garnele', 'forelle'] },
    { id: 'brot', name: 'Brot & Gebäck', muster: ['brot', 'semmel', 'brötchen', 'weggli', 'toast', 'baguette', 'brioche', 'zwieback', 'biskotte', 'löffelbiskuit'] },
    { id: 'backen', name: 'Backzutaten', muster: ['mehl', 'zucker', 'backpulver', 'natron', 'trockenhefe', 'trockengerm', 'vanille', 'kakao', 'schokolade', 'kuvertüre', 'gelatine', 'speisestärke', 'stärke', 'puddingpulver', 'mandeln', 'nüsse', 'haselnüsse', 'walnüsse', 'rosinen', 'zibeben', 'grieß', 'griess', 'brösel', 'paniermehl', 'marzipan', 'honig', 'sirup', 'staubzucker', 'puderzucker', 'oblaten', 'kokos'] },
    { id: 'trocken', name: 'Nudeln, Reis & Konserven', muster: ['nudel', 'pasta', 'spaghetti', 'reis', 'linsen', 'kichererbsen', 'couscous', 'bulgur', 'polenta', 'haferflocken', 'dose', 'passata', 'tomatenmark', 'paradeismark', 'mais', 'brühe', 'suppe', 'fond'] },
    { id: 'gewuerz', name: 'Öl, Essig & Gewürze', muster: ['öl', 'essig', 'salz', 'pfeffer', 'paprikapulver', 'zimt', 'muskat', 'kümmel', 'curry', 'chili', 'oregano', 'thymian', 'majoran', 'lorbeer', 'senf', 'ketchup', 'sojasauce', 'gewürz', 'nelken', 'kardamom', 'piment', 'vanillezucker'] },
    { id: 'getraenke', name: 'Getränke', muster: ['wein', 'bier', 'saft', 'mineralwasser', 'sekt', 'rum', 'kaffee', 'tee'] },
    { id: 'tk', name: 'Tiefkühl', muster: ['tiefgekühlt', 'tk-', 'tiefkühl'] },
    { id: 'sonst', name: 'Sonstiges', muster: [] }
  ];

  return { QUELLEN: QUELLEN, US_ML: US_ML, WAAGE: WAAGE, STUECK: STUECK, REGIONAL: REGIONAL, BEREICHE: BEREICHE, OHNE_WERT: OHNE_WERT, STAND: 'Oktober 2026' };
});
