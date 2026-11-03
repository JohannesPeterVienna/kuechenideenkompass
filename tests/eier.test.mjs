// Eier-Rechner: Klassen und Austausch – Aufruf: node --test tests/eier.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const E = createRequire(import.meta.url)('../docs/assets/js/eier-daten.js');

test('EU-Grenzen nach VO (EU) 2023/2465', () => {
  assert.deepEqual(E.EU.map((k) => [k.min, k.max]), [[null, 53], [53, 63], [63, 73], [73, null]]);
  assert.equal(E.euKlasseFuer(53).id, 'eu-m');
  assert.equal(E.euKlasseFuer(52.9).id, 'eu-s');
  assert.equal(E.euKlasseFuer(73).id, 'eu-xl');
});

test('USDA: 24 oz je Dutzend → 56,7 g je Ei, US large fällt in EU M', () => {
  const l = E.klasse('us-large');
  assert.equal(l.minProEi.toFixed(1), '56.7');
  assert.equal(E.euKlasseFuer(l.minProEi).id, 'eu-m');
  assert.equal(E.euKlasseFuer(E.klasse('us-xl').minProEi).id, 'eu-l');
  assert.equal(E.euKlasseFuer(E.klasse('us-medium').minProEi).id, 'eu-s');
});

test('Austausch wie im Ratgeber-Beispiel', () => {
  const r = E.ersetzen('us-large', 3, 'eu-l');
  assert.equal(Math.round(r.masseOhneSchale), 150);
  assert.equal(r.stueck.toFixed(1), '2.5');
  const b = E.ersetzen('eu-l', 4, 'eu-m');
  assert.equal(b.stueck.toFixed(1), '4.7');
  assert.equal(Math.round(b.masseOhneSchale), 240);
  assert.equal(E.ersetzen('eu-s', 2, 'eu-m').annahme, true);
  assert.equal(E.ersetzen('eu-m', 0, 'eu-l'), null);
});
