// Tests für Kerntemperatur-Prüfer, Fristen-Rechner, Suche, CSV und teilbare Links – Aufruf: node --test tests/referenz.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../docs/assets/js/referenz-kern.js');

test('Daten: jede Zeile hat eine bekannte Quelle mit https-Link, eindeutige id, Gruppen aus der Liste', () => {
  const ids = new Set();
  const kg = R.KERN_GRUPPEN.map((g) => g.id), lg = R.LAGER_GRUPPEN.map((g) => g.id);
  for (const z of [...R.KERN, ...R.LAGER]) {
    assert.ok(R.QUELLEN[z.quelle], z.id);
    assert.match(R.QUELLEN[z.quelle].url, /^https:\/\//);
    assert.match(z.id, /^[a-z0-9-]{1,40}$/);
    assert.ok(!ids.has(z.id), 'doppelt: ' + z.id); ids.add(z.id);
  }
  for (const z of R.KERN) { assert.ok(z.gruppen.every((g) => kg.includes(g)), z.id); assert.ok(['sicherheit', 'garprobe'].includes(z.art)); }
  for (const z of R.LAGER) { assert.ok(lg.includes(z.gruppe), z.id); assert.ok(z.von <= z.bis && z.von > 0, z.id); assert.ok(['h', 'd', 'w'].includes(z.e)); }
  for (const g of kg) assert.ok(R.KERN.some((z) => z.gruppen.includes(g)), 'leere Gruppe ' + g);
  for (const g of lg) assert.ok(R.LAGER.some((z) => z.gruppe === g), 'leere Gruppe ' + g);
});

test('Daten: Fahrenheit-Originalwerte und Celsius-Angaben stimmen überein (auf 0,1 °C)', () => {
  for (const z of R.KERN) {
    if (z.f) assert.ok(Math.abs(R.fNachC(z.f) - z.c) < 0.06, `${z.id}: ${z.f} °F ≠ ${z.c} °C`);
    if (z.fBis) assert.ok(Math.abs(R.fNachC(z.fBis) - z.cBis) < 0.06, z.id);
  }
});

test('Kernwerte der Behörden wie in den Quellen', () => {
  const k = (id) => R.KERN.find((z) => z.id === id);
  assert.deepEqual([k('bfr-tierisch').c, k('bfr-tierisch').halteMin], [70, 2]);
  assert.deepEqual([k('usda-stueck').f, k('usda-stueck').ruheMin], [145, 3]);
  assert.equal(k('usda-faschiert').f, 160);
  assert.equal(k('usda-gefluegel').f, 165);
  assert.equal(k('usda-fisch').f, 145);
  assert.equal(k('usda-ei').f, 160);
  assert.equal(k('bfr-heisshalten').c, 60);
});

test('kernPruefen: darunter, erreicht mit Haltezeit, Ruhezeit, Fahrenheit, Sichtprobe', () => {
  let r = R.kernPruefen('bfr-tierisch', '64,5', 'c');
  assert.equal(r.status, 'darunter'); assert.equal(r.diff, -5.5); assert.match(r.naechster, /5,5 °C/);
  r = R.kernPruefen('bfr-tierisch', 70, 'c');
  assert.equal(r.status, 'erreicht'); assert.match(r.naechster, /2 Minuten/);
  r = R.kernPruefen('usda-stueck', 145, 'f');
  assert.equal(r.status, 'erreicht'); assert.match(r.naechster, /3 Minuten ruhen/); assert.match(r.schritte[0], /145,0 °F − 32\) ÷ 1,8 = 62,8 °C/);
  r = R.kernPruefen('usda-gefluegel', 73, 'c');
  assert.equal(r.status, 'darunter');
  assert.equal(R.kernPruefen('bfr-fisch', 80, 'c').status, 'ohne-zahl');
  assert.equal(R.kernPruefen('ka-ruehrkuchen', 96, 'c').status, 'erreicht');
  assert.equal(R.kernPruefen('ka-ruehrkuchen', 90, 'c').status, 'darunter');
  assert.equal(R.kernPruefen('ka-kaesekuchen', 80, 'c').status, 'darueber');
});

test('kernPruefen: Unsinnseingaben werden abgewiesen, nie durchgereicht', () => {
  for (const v of ['', 'abc', '<script>alert(1)</script>', '1e9', '70 °C', null, undefined, NaN, Infinity, '99999', '-500', '7.123']) {
    const r = R.kernPruefen('bfr-tierisch', v, 'c');
    assert.equal(r.status, 'ungueltig', String(v));
    assert.ok(!/</.test(r.grund));
  }
  assert.equal(R.kernPruefen('gibt-es-nicht', 70, 'c').status, 'ungueltig');
  assert.equal(R.kernPruefen('__proto__', 70, 'c').status, 'ungueltig');
});

test('fristBerechnen: Tage, Wochen, Stunden, Monats- und Jahreswechsel, Schaltjahr', () => {
  let r = R.fristBerechnen('reste-bfr', '2026-11-18', '2026-11-19');
  assert.deepEqual([r.frueh, r.spaet, r.rest, r.lage], ['2026-11-20', '2026-11-21', 2, 'frisch']);
  assert.match(r.schritte[1], /Mittwoch, 18\.11\.2026 \+ 2 Tage = Freitag, 20\.11\.2026/);
  r = R.fristBerechnen('reste-bfr', '2026-12-30');
  assert.deepEqual([r.frueh, r.spaet], ['2027-01-01', '2027-01-02']);
  r = R.fristBerechnen('reste-bfr', '2028-02-27');
  assert.deepEqual([r.frueh, r.spaet], ['2028-02-29', '2028-03-01']);
  r = R.fristBerechnen('ei-hart-de', '2026-11-01');
  assert.deepEqual([r.frueh, r.spaet], ['2026-11-15', '2026-11-29']);
  r = R.fristBerechnen('hack-lose-de', '2026-11-18');
  assert.equal(r.status, 'stunden'); assert.equal(r.spaet, '2026-11-18');
  assert.equal(R.fristBerechnen('reste-bfr', '2026-11-18', '2026-11-22').lage, 'abgelaufen');
  assert.equal(R.fristBerechnen('reste-bfr', '2026-11-18', '2026-11-20').lage, 'fenster');
  assert.equal(R.fristBerechnen('reste-bfr', '2026-11-18', '2026-11-17').lage, 'zukunft');
});

test('fristBerechnen: ungültige Daten', () => {
  for (const d of ['', '2026-02-30', '18.11.2026', '2026-13-01', '1999-01-01', '2026-11-18T00:00', '<b>', null]) assert.equal(R.fristBerechnen('reste-bfr', d).status, 'ungueltig', String(d));
  assert.equal(R.fristBerechnen('nix', '2026-11-18').status, 'ungueltig');
});

test('fristText', () => {
  const l = (id) => R.fristText(R.LAGER.find((z) => z.id === id));
  assert.equal(l('reste-bfr'), '2 bis 3 Tage');
  assert.equal(l('speck-us'), '1 Woche');
  assert.equal(l('ei-hart-us'), '1 Woche');
  assert.equal(l('hack-lose-de'), '6 bis 8 Stunden');
  assert.equal(l('ei-roh-us'), '3 bis 5 Wochen');
});

test('filtern: Umlaute, mehrere Wörter, Gruppe, Quelle, kein Treffer', () => {
  assert.ok(R.filtern(R.KERN, 'geflügel', '').length >= 2);
  assert.deepEqual(R.filtern(R.KERN, 'GEFLUEGEL usda', '').map((z) => z.id), ['usda-gefluegel']);
  assert.ok(R.filtern(R.KERN, '', 'gebaeck').every((z) => z.art === 'garprobe'));
  assert.equal(R.filtern(R.KERN, '', 'alle').length, R.KERN.length);
  assert.equal(R.filtern(R.LAGER, 'xyzzy', '').length, 0);
  assert.ok(R.filtern(R.LAGER, 'bzfe', '').length >= 2);
  assert.ok(R.filtern(R.LAGER, 'hartgekocht', 'ei').length === 2);
  assert.equal(R.filtern(R.LAGER, '<img src=x onerror=1>', '').length, 0);
});

test('CSV: Formelzeichen entschärft, Anführungszeichen verdoppelt, Semikolon gekapselt', () => {
  assert.equal(R.csvZelle('=SUMME(A1)'), "'=SUMME(A1)");
  assert.equal(R.csvZelle('+43'), "'+43");
  assert.equal(R.csvZelle('-2 °C'), "'-2 °C");
  assert.equal(R.csvZelle('@x'), "'@x");
  assert.equal(R.csvZelle('a;b'), '"a;b"');
  assert.equal(R.csvZelle('sagt "ja"'), '"sagt ""ja"""');
  assert.equal(R.csvZelle(null), '');
  const k = R.kernCsv(R.KERN), l = R.lagerCsv(R.LAGER);
  assert.equal(k.trim().split('\r\n').length, R.KERN.length + 1);
  assert.equal(l.trim().split('\r\n').length, R.LAGER.length + 1);
  for (const zeile of (k + l).split('\r\n')) for (const zelle of zeile.replace(/^﻿/, '').split(';')) assert.ok(!/^"?[=+\-@]/.test(zelle), zelle);
});

test('Links: Hin- und Rückweg, Fremdes wird verworfen', () => {
  assert.equal(R.kernLink('usda-gefluegel', '72,5', 'c'), 'k=usda-gefluegel~72.5~c');
  assert.deepEqual(R.linkLesen('#k=usda-gefluegel~72.5~c'), { art: 'k', id: 'usda-gefluegel', wert: 72.5, einheit: 'c' });
  assert.deepEqual(R.linkLesen('#k=usda-stueck~145~f'), { art: 'k', id: 'usda-stueck', wert: 145, einheit: 'f' });
  assert.deepEqual(R.linkLesen('k=bfr-fisch'), { art: 'k', id: 'bfr-fisch', wert: null, einheit: 'c' });
  assert.equal(R.lagerLink('reste-bfr', '2026-11-18'), 'h=reste-bfr~2026-11-18');
  assert.deepEqual(R.linkLesen('#h=reste-bfr~2026-11-18'), { art: 'h', id: 'reste-bfr', datum: '2026-11-18' });
  assert.deepEqual(R.linkLesen('#h=reste-bfr~2026-02-31'), { art: 'h', id: 'reste-bfr', datum: null });
  assert.equal(R.kernLink('boese', 70, 'c'), '');
  assert.equal(R.lagerLink('boese', '2026-11-18'), '');
  for (const h of ['', '#', '#k=', '#k=unbekannt~70~c', '#k=<script>', '#h=reste-bfr~<img>', '#x=reste-bfr', '#k=usda-stueck~70~c~extra', '#k=usda-stueck%22onload', 'javascript:alert(1)', null]) assert.equal(R.linkLesen(h), null, String(h));
});
