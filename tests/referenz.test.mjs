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
  assert.equal(r.status, 'darunter'); assert.ok(Math.abs(r.diff + 5.5) < 1e-9); assert.match(r.naechster, /5,5 °C/);
  r = R.kernPruefen('bfr-tierisch', 70, 'c');
  assert.equal(r.status, 'erreicht'); assert.equal(r.titel, 'Temperatur erreicht – 2 Minuten halten'); assert.match(r.naechster, /2 Minuten/);
  r = R.kernPruefen('usda-stueck', 145, 'f');
  assert.equal(r.status, 'erreicht'); assert.equal(r.diff, 0); assert.match(r.titel, /3 Minuten ruhen/); assert.match(r.schritte[0], /\(145 °F − 32\) ÷ 1,8 = 62,8 °C/);
  r = R.kernPruefen('usda-gefluegel', 73, 'c');
  assert.equal(r.status, 'darunter');
  assert.equal(R.kernPruefen('bfr-fisch', 80, 'c').status, 'ohne-zahl');
  assert.equal(R.kernPruefen('ka-ruehrkuchen', 96, 'c').titel, 'Im Richtbereich');
  assert.equal(R.kernPruefen('ka-ruehrkuchen', 90, 'c').status, 'darunter');
  assert.equal(R.kernPruefen('ka-kaesekuchen', 80, 'c').status, 'darueber');
});

test('kernPruefen: knapp unter dem Mindestwert ist nie „erreicht“ (Vergleich ungerundet, USDA gegen °F-Original)', () => {
  for (const [id, v, e] of [['bfr-tierisch', 69.95, 'c'], ['bfr-aufwaermen', '69,95', 'c'], ['bfr-heisshalten', 59.95, 'c'], ['usda-stueck', 62.75, 'c'], ['usda-fisch', 62.75, 'c'], ['usda-faschiert', 71.05, 'c'], ['usda-ei', 71.05, 'c'], ['usda-gefluegel', 73.86, 'c'], ['usda-reste', 73.86, 'c'], ['usda-stueck', 144.96, 'f'], ['usda-faschiert', 159.99, 'f'], ['usda-gefluegel', 164.99, 'f']]) {
    const r = R.kernPruefen(id, v, e);
    assert.equal(r.status, 'darunter', `${id} ${v} ${e}`);
    assert.ok(r.diff < 0);
    // die Anzeige widerspricht dem Ergebnis nicht: kein „0,0“, Messwert und Ziel nicht gleichlautend
    const vgl = r.schritte.at(-1).match(/Vergleich: ([\d,]+) °C − ([\d,]+) °C = −([\d,]+) °C/);
    assert.ok(vgl, r.schritte.at(-1));
    assert.notEqual(vgl[1], vgl[2], r.schritte.at(-1));
    assert.ok(parseFloat(vgl[3].replace(',', '.')) > 0, r.schritte.at(-1));
    assert.ok(!/fehlen 0,0+ °C/.test(r.naechster), r.naechster);
  }
  for (const [id, v, e] of [['bfr-tierisch', 70, 'c'], ['bfr-heisshalten', 60, 'c'], ['usda-stueck', 62.8, 'c'], ['usda-stueck', 145, 'f'], ['usda-faschiert', 71.2, 'c'], ['usda-faschiert', 160, 'f'], ['usda-gefluegel', 73.9, 'c'], ['usda-gefluegel', 165, 'f']]) assert.equal(R.kernPruefen(id, v, e).status, 'erreicht', `${id} ${v} ${e}`);
  // 71,1 °C sind 159,98 °F – die USDA druckt aber selbst „160 °F (71,1 °C)“, deshalb gilt die gedruckte Celsius-Zahl als erreicht
  assert.equal(R.kernPruefen('usda-faschiert', 71.1, 'c').status, 'erreicht');
  assert.equal(R.kernPruefen('usda-faschiert', 71.09, 'c').status, 'darunter');
});

test('kernPruefen: Garprobe – Bereich, Obergrenze, Zeile ohne Obergrenze', () => {
  assert.equal(R.kernPruefen('ka-ruehrkuchen', 210, 'f').status, 'erreicht');
  assert.equal(R.kernPruefen('ka-ruehrkuchen', 210.5, 'f').status, 'darueber');
  assert.equal(R.kernPruefen('ka-ruehrkuchen', 99.5, 'c').status, 'darueber');
  let r = R.kernPruefen('ka-brot', 120, 'c');
  assert.equal(r.titel, 'Richtwert überschritten'); assert.ok(!/Richtbereich/.test(r.titel + r.naechster)); assert.match(r.naechster, /Obergrenze nennt die Quelle nicht/);
  r = R.kernPruefen('ka-brot', 190, 'f');
  assert.equal(r.titel, 'Richtwert erreicht');
  assert.match(R.kernPruefen('ka-brot', 85, 'c').titel, /Richtwert noch nicht erreicht/);
  assert.match(R.kernPruefen('ka-brot', 85, 'c').schritte[0], /^Richtwert laut King Arthur/);
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
  assert.equal(R.fristBerechnen('reste-bfr', '2026-11-18', '2026-11-22').lage, 'abgelaufen');
  assert.equal(R.fristBerechnen('reste-bfr', '2026-11-18', '2026-11-20').lage, 'fenster');
  assert.equal(R.fristBerechnen('reste-bfr', '2026-11-18', '2026-11-21').lage, 'letzter');
  assert.equal(R.fristBerechnen('reste-bfr', '2026-11-18', '2026-11-17').lage, 'zukunft');
});

test('fristBerechnen: Stundenzeilen melden ab dem Folgetag „Frist überschritten“', () => {
  let r = R.fristBerechnen('hack-lose-de', '2026-11-18', '2026-11-18');
  assert.deepEqual([r.status, r.lage, r.spaet, r.titel], ['stunden', 'letzter', '2026-11-18', 'Noch heute verbrauchen']);
  r = R.fristBerechnen('hack-lose-de', '2026-11-10', '2026-11-18');
  assert.deepEqual([r.status, r.lage, r.rest, r.titel], ['stunden', 'abgelaufen', -8, 'Frist überschritten']);
  assert.match(r.naechster, /vor 8 Tagen\. Nicht mehr essen/);
  r = R.fristBerechnen('hack-lose-de', '2026-11-17', '2026-11-18');
  assert.equal(r.lage, 'abgelaufen'); assert.match(r.naechster, /vor 1 Tag\./);
  assert.equal(R.fristBerechnen('hack-lose-de', '2026-11-19', '2026-11-18').lage, 'zukunft');
});

test('fristBerechnen: Text im Fristfenster passt zur Spanne; „70 °C“ nur bei der BfR-Reste-Zeile', () => {
  // hartgekochte Eier, Tag 14 von 14–28: kürzere Frist erreicht, 14 Tage bis zur längeren – kein „heute verbrauchen“
  let r = R.fristBerechnen('ei-hart-de', '2026-11-04', '2026-11-18');
  assert.equal(r.lage, 'fenster'); assert.equal(r.titel, 'Kürzere Frist erreicht');
  assert.match(r.naechster, /kürzere Angabe \(14 Tage\) ist erreicht, die längere \(28 Tage\) endet in 14 Tagen am Mittwoch, 2\.12\.2026/);
  assert.ok(!/Heute verbrauchen|70 °C|erhitz/i.test(r.naechster), r.naechster);
  for (const id of ['ei-roh-us', 'kaese-stueck-de', 'esl-de', 'stueck-us']) {
    const z = R.LAGER.find((x) => x.id === id), tage = z.e === 'w' ? z.von * 7 : z.von;
    const start = new Date(Date.UTC(2026, 10, 18) - tage * 86400000).toISOString().slice(0, 10);
    r = R.fristBerechnen(id, start, '2026-11-18');
    assert.equal(r.lage, 'fenster', id); assert.ok(!/70 °C|erhitz|Heute verbrauchen/i.test(r.naechster), id);
  }
  r = R.fristBerechnen('reste-bfr', '2026-11-16', '2026-11-18');
  assert.equal(r.lage, 'fenster'); assert.match(r.naechster, /endet in 1 Tag am Donnerstag, 19\.11\.2026/); assert.match(r.naechster, /laut BfR: mindestens 70 °C für 2 Minuten/);
  r = R.fristBerechnen('reste-bfr', '2026-11-15', '2026-11-18');
  assert.equal(r.titel, 'Letzter Tag der Frist'); assert.match(r.naechster, /Heute endet die längere Frist/);
  r = R.fristBerechnen('speck-us', '2026-11-11', '2026-11-18');
  assert.equal(r.lage, 'letzter'); assert.match(r.naechster, /Heute endet die Frist der Quelle/); assert.ok(!/70 °C/.test(r.naechster));
  assert.equal(R.LAGER.filter((z) => z.erhitzen).map((z) => z.id).join(), 'reste-bfr');
});

test('Startpunkt der Zählung: Annahmen sind gekennzeichnet', () => {
  const belegt = R.LAGER.filter((z) => !z.abAnnahme).map((z) => z.id).sort();
  assert.deepEqual(belegt, ['auflauf-ei-us', 'aufschnitt-us', 'esl-de', 'frischmilch-de', 'hack-lose-de', 'hmilch-de', 'kaese-scheiben-de', 'quiche-us']);
  assert.match(R.abText(R.LAGER.find((z) => z.id === 'gefluegel-us')), /unsere Annahme/);
  assert.equal(R.abText(R.LAGER.find((z) => z.id === 'frischmilch-de')), 'Öffnen');
  assert.match(R.fristBerechnen('stueck-us', '2026-11-18').schritte[0], /gezählt ab Einkauf \(unsere Annahme/);
  // Fisch: drei Quellzeilen bleiben drei Zeilen
  assert.deepEqual(R.LAGER.filter((z) => z.gruppe === 'fisch' && /Fisch/.test(z.name)).map((z) => z.tk), ['2 bis 3 Monate', '6 bis 8 Monate', '4 bis 8 Monate']);
  assert.equal(R.KERN.find((z) => z.id === 'usda-ei').name, 'Eier – USDA');
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
