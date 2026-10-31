// Unit-Tests für den Rechenkern – Aufruf: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const K = require('../docs/assets/js/werkbank-kern.js');
const D = require('../docs/assets/js/kueche-daten.js');

const nah = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

// [Zeile, Menge, Bis, Einheit, Name]
const ZEILEN = [
  ['500 g Mehl', 500, null, 'g', 'Mehl'],
  ['200g Zucker', 200, null, 'g', 'Zucker'],
  ['25 dag Butter', 25, null, 'dag', 'Butter'],
  ['12 dkg Staubzucker', 12, null, 'dag', 'Staubzucker'],
  ['1,5 kg Erdäpfel', 1.5, null, 'kg', 'Erdäpfel'],
  ['1.5 kg Kartoffeln', 1.5, null, 'kg', 'Kartoffeln'],
  ['½ l Milch', 0.5, null, 'l', 'Milch'],
  ['1/8 l Obers', 0.125, null, 'l', 'Obers'],
  ['1/4 TL Natron', 0.25, null, 'tl', 'Natron'],
  ['1 1/2 Tassen Zucker', 1.5, null, 'tasse', 'Zucker'],
  ['1½ EL Honig', 1.5, null, 'el', 'Honig'],
  ['1 ½ TL Salz', 1.5, null, 'tl', 'Salz'],
  ['2–3 Eier', 2, 3, null, 'Eier'],
  ['2-3 EL Öl', 2, 3, 'el', 'Öl'],
  ['2 bis 3 Zehen Knoblauch', 2, 3, 'zehe', 'Knoblauch'],
  ['ca. 200 ml Wasser', 200, null, 'ml', 'Wasser'],
  ['2 cups all-purpose flour', 2, null, 'cup', 'all-purpose flour'],
  ['¾ Cup Zucker', 0.75, null, 'cup', 'Zucker'],
  ['1 Stick Butter', 1, null, 'stick', 'Butter'],
  ['8 oz Frischkäse', 8, null, 'oz', 'Frischkäse'],
  ['1 lb Faschiertes', 1, null, 'lb', 'Faschiertes'],
  ['1 Pkg. Backpulver', 1, null, 'pkg', 'Backpulver'],
  ['1 Päckchen Vanillezucker', 1, null, 'pkg', 'Vanillezucker'],
  ['1 Würfel Germ', 1, null, 'wuerfel', 'Germ'],
  ['1 Prise Salz', 1, null, 'prise', 'Salz'],
  ['1 Msp. Muskat', 1, null, 'msp', 'Muskat'],
  ['3 große Eier', 3, null, null, 'große Eier'],
  ['1 kleine Zwiebel', 1, null, null, 'kleine Zwiebel'],
  ['1 Becher Schlagobers (250 ml)', 1, null, 'becher', 'Schlagobers (250 ml)'],
  ['- 100 g Topfen', 100, null, 'g', 'Topfen'],
  ['• 2 EL Semmelbrösel', 2, null, 'el', 'Semmelbrösel'],
  ['1 Achterl Weißwein', 1, null, 'achterl', 'Weißwein'],
  ['3 dl Rahm', 3, null, 'dl', 'Rahm'],
  ['4 Stück Äpfel', 4, null, 'stk', 'Äpfel'],
  ['1 Dose Paradeiser (400 g)', 1, null, 'dose', 'Paradeiser (400 g)'],
  ['2 tbsp butter', 2, null, 'el', 'butter'],
  ['1 tsp baking soda', 1, null, 'tl', 'baking soda'],
  ['Salz, Pfeffer', null, null, null, 'Salz, Pfeffer'],
  ['etwas Zimt', null, null, null, 'etwas Zimt']
];

test('Parser: mindestens 25 Rezeptzeilen', () => {
  assert.ok(ZEILEN.length >= 25);
  for (const [zeile, menge, bis, einheit, name] of ZEILEN) {
    const z = K.zeileLesen(zeile);
    if (menge === null) assert.equal(z.menge, null, zeile); else nah(z.menge, menge);
    assert.equal(z.bis, bis, zeile + ' (bis)');
    assert.equal(z.einheit, einheit, zeile + ' (Einheit)');
    assert.equal(z.name, name, zeile + ' (Name)');
  }
});

test('Parser: Überschriften und Leerzeilen', () => {
  const r = K.rezeptLesen('Für den Teig:\n\n200 g Mehl\nFülle (für 26 cm):\n');
  assert.equal(r.length, 3);
  assert.equal(r[0].ueberschrift, true);
  assert.equal(r[2].ueberschrift, true);
});

test('Zahlen: Brüche und Dezimalkomma', () => {
  nah(K.zahlLesen('1 1/2'), 1.5);
  nah(K.zahlLesen('3/4'), 0.75);
  nah(K.zahlLesen('2½'), 2.5);
  nah(K.zahlLesen('0,25'), 0.25);
  nah(K.zahlLesen('⅛'), 0.125);
  assert.equal(K.deZahl(100, 0), '100');
  assert.equal(K.deZahl(2.50, 2), '2,5');
});

test('Zutatenklassen', () => {
  assert.equal(K.klasseVon('Eier'), 'ei');
  assert.equal(K.klasseVon('Eidotter'), 'dotter');
  assert.equal(K.klasseVon('Eiklar'), 'eiklar');
  assert.equal(K.klasseVon('Eierschwammerl'), 'normal');
  assert.equal(K.klasseVon('Trockengerm'), 'trockenhefe');
  assert.equal(K.klasseVon('frische Hefe'), 'frischhefe');
  assert.equal(K.klasseVon('Backpulver'), 'backpulver');
  assert.equal(K.klasseVon('Natron'), 'natron');
  assert.equal(K.klasseVon('Salz'), 'gewuerz');
  assert.equal(K.klasseVon('glattes Mehl'), 'mehl');
  assert.equal(K.klasseVon('Paniermehl'), 'normal');
});

test('Skalierung: linear, Eier ganz, Hinweise', () => {
  const r = K.skalieren(K.rezeptLesen('200 g Mehl\n3 Eier\n1 Prise Salz\n1 Pkg. Backpulver'), { faktor: 0.5, einheiten: 'original', region: 'original' });
  assert.equal(r.zeilen[0].text, '100');
  assert.equal(r.zeilen[1].text, '2'); // 1,5 → 2 Stück
  assert.ok(r.zeilen[1].flags.includes('ei'));
  assert.ok(r.zeilen[2].flags.includes('abschmecken'));
  assert.ok(r.zeilen[3].flags.includes('trieb'));
  assert.equal(r.zeilen[3].text, '½');
  const arten = r.hinweise.map(h => h.art);
  for (const a of ['abschmecken', 'ei', 'trieb', 'geschirr']) assert.ok(arten.includes(a), a);
});

test('Skalierung: Triebmittel-Regel nach Mehlmenge', () => {
  const r = K.skalieren(K.rezeptLesen('500 g Mehl\n1 Pkg. Backpulver\n7 g Trockengerm'), { faktor: 2, einheiten: 'original', region: 'original' });
  assert.equal(r.mehlG, 1000);
  const t = r.hinweise.find(h => h.art === 'trieb').text;
  assert.match(t, /1000 g Mehl also ≈ 2 Pkg/);
  assert.match(t, /≈ 14 g/);
});

test('Skalierung: Faktor 1 erzeugt keine Nichtlinear-Hinweise', () => {
  const r = K.skalieren(K.rezeptLesen('3 Eier\n1 Prise Salz'), { faktor: 1, einheiten: 'original', region: 'original' });
  assert.equal(r.hinweise.length, 0);
  assert.equal(r.zeilen[0].text, '3');
});

test('Skalierung: Spannen und Klammermengen', () => {
  const r = K.skalieren(K.rezeptLesen('2-3 EL Öl\n1 Becher Obers (250 ml)\n2–3 Eier'), { faktor: 2, einheiten: 'original', region: 'original' });
  assert.equal(r.zeilen[0].text, '4–6');
  assert.match(r.zeilen[1].name, /\(500 ml\)/);
  assert.equal(r.zeilen[2].text, '4–6');
});

test('Einheiten: Cups nach Gramm mit King-Arthur-Werten', () => {
  const mehl = K.einheitUmrechnen(1, 'cup', 'Mehl', 'metrisch');
  assert.equal(mehl.einheit, 'g'); nah(mehl.menge, 120, 0.01);
  const zucker = K.einheitUmrechnen(1, 'cup', 'Zucker', 'metrisch');
  nah(zucker.menge, 198, 0.01);
  const butter = K.einheitUmrechnen(1, 'stick', 'Butter', 'metrisch');
  nah(butter.menge, 113, 0.01);
  const milch = K.einheitUmrechnen(1, 'cup', 'Milch', 'metrisch');
  assert.equal(milch.einheit, 'ml'); nah(milch.menge, 236.59, 0.01);
  const salz = K.einheitUmrechnen(1, 'el', 'Salz', 'metrisch');
  nah(salz.menge, 18, 0.01);
  const bp = K.einheitUmrechnen(1, 'tl', 'Backpulver', 'metrisch');
  nah(bp.menge, 4, 0.01);
});

test('Einheiten: dag, Liter, Unzen, Österreich-Modus', () => {
  const g = K.einheitUmrechnen(25, 'dag', 'Butter', 'metrisch');
  assert.equal(g.einheit, 'g'); nah(g.menge, 250);
  const at = K.einheitUmrechnen(250, 'g', 'Butter', 'at');
  assert.equal(at.einheit, 'dag'); nah(at.menge, 25);
  const oz = K.einheitUmrechnen(8, 'oz', 'Frischkäse', 'metrisch');
  nah(oz.menge, 226.8, 0.01);
  assert.equal(K.literAT(0.125), '⅛ l');
  assert.equal(K.literAT(0.25), '¼ l');
  assert.equal(K.literAT(0.375), '⅜ l');
  const ml = K.einheitUmrechnen(250, 'ml', 'Milch', 'at');
  assert.equal(ml.einheit, 'l'); nah(ml.menge, 0.25);
  const loeffel = K.einheitUmrechnen(2, 'el', 'Petersilie', 'metrisch');
  assert.equal(loeffel.einheit, 'el');
});

test('Rundung küchentauglich', () => {
  assert.equal(K.mengeRunden(333.33, 'g').text, '335');
  assert.equal(K.mengeRunden(7.3, 'g').text, '7,5');
  assert.equal(K.mengeRunden(0.75, 'tl').text, '¾');
  assert.equal(K.mengeRunden(1.5, 'el').text, '1 ½');
  assert.equal(K.mengeRunden(0.33, 'cup').text, '1/3');
  assert.equal(K.mengeRunden(1.2, null).text, '1 ¼');
});

test('Regionalsprache AT ↔ DE ↔ CH', () => {
  assert.equal(K.regionalUebersetzen('Schlagobers', 'de').text, 'Schlagsahne');
  assert.equal(K.regionalUebersetzen('Obers', 'ch').text, 'Rahm');
  assert.equal(K.regionalUebersetzen('Topfen', 'de').text, 'Quark');
  assert.equal(K.regionalUebersetzen('Quark', 'at').text, 'Topfen');
  assert.equal(K.regionalUebersetzen('Germteig', 'de').text, 'Hefeteig');
  assert.equal(K.regionalUebersetzen('Trockenhefe', 'at').text, 'Trockengerm');
  assert.equal(K.regionalUebersetzen('Marillenknödel', 'de').text, 'Aprikosenknödel');
  assert.equal(K.regionalUebersetzen('Vogerlsalat', 'ch').text, 'Nüsslisalat');
  assert.equal(K.regionalUebersetzen('saure Sahne', 'at').text, 'Sauerrahm');
  assert.equal(K.regionalUebersetzen('Karotten', 'ch').text, 'Rüebli');
  assert.equal(K.regionalUebersetzen('Oberschenkel vom Hendl', 'de').text, 'Oberschenkel vom Hendl');
  assert.equal(K.regionalUebersetzen('Sahne', 'original').text, 'Sahne');
});

test('Temperatur: Fahrenheit', () => {
  nah(K.fNachC(350), 176.666, 0.01);
  nah(K.cNachF(180), 356);
  assert.equal(K.fahrenheitImText('Bake at 350°F for 30 minutes'), 'Bake at 175 °C (350 °F) for 30 minutes');
  assert.equal(K.fahrenheitImText('bei 180 °C backen'), 'bei 180 °C backen');
});

test('Backformen: Flächenfaktoren', () => {
  const f = K.formFaktor({ typ: 'rund', d: 26 }, { typ: 'rund', d: 28 });
  nah(f.flaeche, (28 * 28) / (26 * 26));
  const e = K.formFaktor({ typ: 'rund', d: 26 }, { typ: 'eckig', a: 20, b: 20 });
  nah(e.flaeche, 400 / (Math.PI * 169));
  const g = K.formFlaeche({ typ: 'gugelhupf', d: 22, innen: 8 });
  nah(g, Math.PI * (121 - 16));
  const v = K.formFaktor({ typ: 'kasten', a: 30, b: 11, h: 7 }, { typ: 'kasten', a: 25, b: 11, h: 7 });
  nah(v.volumen, 25 / 30);
  nah(K.durchmesserFuer(Math.PI * 100), 20);
});

test('Einkaufsliste: zusammenführen, Vorrat abziehen, gruppieren', () => {
  const gruppen = K.listeBauen([
    { name: 'Mehl', menge: 250, einheit: 'g', rezept: 'A' },
    { name: 'Mehl', menge: 0.5, einheit: 'kg', rezept: 'B' },
    { name: 'Milch', menge: 0.25, einheit: 'l', rezept: 'A' },
    { name: 'Eier', menge: 3, einheit: null, rezept: 'B' },
    { name: 'Paprikapulver', menge: 1, einheit: 'tl', rezept: 'B' },
    { name: 'Salz', menge: null, einheit: null, rezept: 'A' }
  ], [{ name: 'Mehl', menge: 500, einheit: 'g' }, { name: 'Salz', menge: null, einheit: null }]);
  const alle = gruppen.flatMap(g => g.posten.map(p => ({ ...p, bereich: g.id })));
  const mehl = alle.find(p => p.name === 'Mehl');
  nah(mehl.menge, 750); nah(mehl.bedarf, 250);
  assert.equal(mehl.bereich, 'backen');
  assert.equal(alle.find(p => p.name === 'Paprikapulver').bereich, 'gewuerz');
  assert.equal(alle.find(p => p.name === 'Eier').bereich, 'kuehl');
  assert.equal(alle.find(p => p.name === 'Salz').gedeckt, true);
  assert.equal(K.bereichVon('Vollmilch'), 'kuehl');
  assert.equal(K.bereichVon('Olivenöl'), 'gewuerz');
});

test('Teilen-Link: Hin- und Rückweg mit Umlauten', () => {
  const o = { t: 'Topfenstrudel', z: '250 g Topfen\n½ l Obers', f: 1.5 };
  assert.deepEqual(K.dekodieren(K.kodieren(o)), o);
  assert.equal(K.dekodieren('%%%'), null);
});

test('Daten: jede Waage-Zeile hat Quelle und plausible Dichte', () => {
  for (const z of D.WAAGE) {
    assert.ok(D.QUELLEN[z.quelle], z.id);
    assert.ok(z.gProMl > 0.2 && z.gProMl < 1.5, z.id + ' ' + z.gProMl);
  }
});

/* ---------- Codex Runde 2 ---------- */
const zeile = (txt, f, ein = 'original') => K.skalieren(K.rezeptLesen(txt), { faktor: f, einheiten: ein, region: 'original' }).zeilen[0];

test('Nummerierte Listen: Listennummer ist keine Menge', () => {
  let z = zeile('1. 250 g Mehl', 2);
  assert.equal(z.text, '500'); assert.equal(z.einheit, 'g'); assert.equal(z.name, 'Mehl');
  z = zeile('2. 3 Eier', 2);
  assert.equal(z.text, '6'); assert.equal(z.name, 'Eier');
  for (const t of ['1) 250 g Mehl', '(3) 250 g Mehl', 'a) 250 g Mehl', '• 250 g Mehl', '– 250 g Mehl', '10. 250 g Mehl']) {
    const r = K.zeileLesen(t);
    assert.equal(r.menge, 250, t); assert.equal(r.einheit, 'g', t); assert.equal(r.name, 'Mehl', t);
  }
  assert.equal(K.zeileLesen('1.5 kg Mehl').menge, 1.5);
  assert.equal(K.zeileLesen('3 Eier').unsicher, undefined);
});

test('Unsicher gelesene Zeilen werden gekennzeichnet', () => {
  assert.ok(K.zeileLesen('2. Eier').unsicher);
  assert.ok(K.zeileLesen('1 250 g Mehl').unsicher);
  assert.ok(zeile('1 250 g Mehl', 2).unsicher);
});

test('Zusammengesetzte Zutaten: längster, exakter Treffer oder kein Wert', () => {
  const g = (txt) => { const z = zeile(txt, 1, 'metrisch'); return z.einheit === 'g' ? z.exakt : z.einheit; };
  const FAELLE = [
    ['1 cup peanut butter', 270], ['1 cup coconut flour', 128], ['1 cup almond flour', 96], ['1 cup bread flour', 120],
    ['1 cup brown sugar', 213], ['1 cup light brown sugar, packed', 213], ['1 cup powdered sugar', 113], ['1/2 cup cocoa', 42],
    ['1 cup heavy cream', 'ml'], ['1 cup sour cream', 227], ['1 cup buttermilk', 'ml'], ['1 Tasse Mandelmehl', 96],
    ['1 Tasse Vollkornmehl', 113], ['1 Tasse Staubzucker', 113], ['1 Tasse Rohrzucker', 'ml'], ['1 Tasse Schlagobers', 'ml'],
    ['1 cup all-purpose flour', 120], ['½ cup unsalted butter, softened', 113], ['1 cup Erdnussbutter', 270],
    ['1 cup almond milk', 'ml'], ['1 cup rice flour', 142], ['1 cup Dinkelmehl', 'ml'], ['1 cup cake flour', 120],
    ['1 cup chopped walnuts', 113], ['1 cup flour', 120], ['1 cup coconut sugar', 154]
  ];
  for (const [t, soll] of FAELLE) {
    const ist = g(t);
    if (typeof soll === 'number') nah(ist, soll, 0.5); else assert.equal(ist, soll, t);
  }
  assert.equal(K.waageFinden('apple butter'), null);
  assert.equal(K.waageFinden('Erdnussbutter').id, 'erdnussbutter');
  assert.equal(K.waageFinden('Vanillezucker'), null);
  assert.equal(K.waageFinden('King Arthur flour'), null);
  assert.equal(K.waageFinden('Mehl (glatt)').id, 'weizenmehl');
  assert.ok(zeile('1 cup coconut cream', 1, 'metrisch').einheitHinweis);
});

test('Backform: Volumenmodus verdoppelt die Füllhöhe', () => {
  const r = K.formFaktor({ typ: 'rund', d: 26, h: 5 }, { typ: 'rund', d: 26, h: 10 });
  nah(r.volumen, 2); nah(r.flaeche, 1);
});
