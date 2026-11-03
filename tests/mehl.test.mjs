// Mehltyp-Übersetzer: Normwerte und Entsprechungen – Aufruf: node --test tests/mehl.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const M = createRequire(import.meta.url)('../docs/assets/js/mehl-daten.js');
const namen = (id, land) => M.entsprechungen(id, land).treffer.map((t) => t.sorte.name);

test('Normwerte wie in den Quellen', () => {
  const w = (id) => { const s = M.sorte(id); return [s.min, s.max]; };
  assert.deepEqual(w('at-w480'), [0.33, 0.58]);
  assert.deepEqual(w('at-w700'), [0.66, 0.79]);
  assert.deepEqual(w('at-w1600'), [1.50, 1.75]);
  assert.deepEqual(w('de-405'), [null, 0.50]);
  assert.deepEqual(w('ch-ruch'), [0.91, 1.69]);
  for (const s of M.SORTEN) { assert.ok(s.min === null || s.min < s.max, s.id); assert.ok(M.QUELLEN[s.q], s.id); }
});

test('W 700 entspricht nach Norm Type 812 und Halbweissmehl, nicht 550', () => {
  assert.deepEqual(namen('at-w700', 'de'), ['Type 812']);
  assert.deepEqual(namen('at-w700', 'ch'), ['Halbweissmehl']);
});

test('W 480: überwiegend 405, teilweise 550', () => {
  const e = M.entsprechungen('at-w480', 'de').treffer;
  assert.equal(e[0].sorte.name, 'Type 405');
  assert.equal(Math.round(e[0].anteil * 100), 68);
  assert.equal(e[1].sorte.name, 'Type 550');
});

test('W 1600 entspricht Type 1600; Type 1050 hat in AT nur eine Mischung', () => {
  assert.deepEqual(namen('at-w1600', 'de'), ['Type 1600']);
  const e = M.entsprechungen('de-1050', 'at');
  assert.equal(e.treffer.length, 0);
  assert.equal(e.mischung.tief.name, 'W 700');
  assert.equal(e.mischung.hoch.name, 'W 1600');
  const mitte = e.mischung.anteilTief * 0.725 + e.mischung.anteilHoch * 1.625;
  assert.ok(Math.abs(mitte - 1.055) < 1e-9);
});

test('Schweiz ohne Roggenstufen; R 2500 ohne deutsche Entsprechung', () => {
  assert.equal(M.entsprechungen('at-r960', 'ch').keineSorten, true);
  const e = M.entsprechungen('at-r2500', 'de');
  assert.equal(e.treffer.length, 0);
  assert.equal(e.darunter.name, 'Type 1740');
  assert.equal(e.mischung, null);
});
