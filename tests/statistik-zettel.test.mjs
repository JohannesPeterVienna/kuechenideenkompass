// Küchenzettel (Übergangsfenster nur für die Statistik) in docs/assets/js/einwilligung.js – Aufruf: node --test tests/
// Die Seite läuft in einer eigenen VM mit kleinem Schein-DOM; Uhr und Timer sind künstlich,
// damit „nach 3 s“ und „nach 12 Monaten“ ohne Warten prüfbar sind.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const JS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'assets', 'js');
const QUELLE = path.join(JS, 'einwilligung.js');
const CODE = fs.readFileSync(QUELLE, 'utf8');
const R = require(QUELLE);
const TAG = 864e5;
const JETZT = Date.UTC(2026, 10, 5, 10, 0, 0);
const GA_AUS = 'ga-disable-G-T00HRG2YVF';

const HIDDEN = { eventStatus: 'cmpuishown', displayStatus: 'hidden', gdprApplies: true };
const JA_GOOGLE = { eventStatus: 'useractioncomplete', gdprApplies: true, tcString: 'CP-ja', purpose: { consents: { 1: true } }, vendor: { consents: { 755: true } } };
const NEIN_GOOGLE = { eventStatus: 'useractioncomplete', gdprApplies: true, tcString: 'CP-nein', purpose: { consents: {} }, vendor: { consents: {} } };

function seite({ tcf = 'still', gpc = false, gespeichert, kekse = [], speicherGesperrt = false, statistikAus = false, host = 'kuechenideenkompass.de', cm = 0 } = {}) {
  const uhr = { jetzt: JETZT, timer: [] };
  const speicher = new Map(gespeichert !== undefined ? [[R.SCHLUESSEL, typeof gespeichert === 'string' ? gespeichert : JSON.stringify(gespeichert)]] : []);
  const jar = new Map(kekse.map((k) => [k, '1']));
  const keksSchreiben = [];
  const skripte = [];
  const klick = [];
  const tcfHoerer = [];
  const api = { widerruf: 0 };

  const titel = { focus() { doc.activeElement = titel; } };
  function element(tag) {
    return {
      tagName: tag.toUpperCase(), attrs: {}, hidden: false, hoerer: {}, _html: '', style: {}, parentNode: null, textContent: '',
      setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
      hasAttribute(k) { return k in this.attrs; },
      addEventListener(t, f) { (this.hoerer[t] = this.hoerer[t] || []).push(f); },
      set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; },
      querySelector(sel) { return sel === '#kik-zettel-titel' && this._html.includes('id="kik-zettel-titel"') ? titel : null; },
      contains(x) { return x === this || (x === titel && this._html.includes('kik-zettel-titel')); },
      after(...els) { els.forEach((e) => { e.parentNode = body; body.kinder.push(e); }); },
      focus() { doc.activeElement = this; },
      getBoundingClientRect() { return { height: 280 }; }
    };
  }
  const body = Object.assign(element('body'), { kinder: [], appendChild(e) { e.parentNode = body; body.kinder.push(e); } });
  if (statistikAus) body.setAttribute('data-statistik', 'aus');
  const sprung = element('a'); sprung.className = 'uebersprung'; sprung.parentNode = body;
  const knopf = element('button');
  const inhalt = element('main'); inhalt.id = 'inhalt';
  const doc = {
    head: { appendChild(s) { skripte.push(s.src); } }, body, activeElement: null,
    createElement: element,
    querySelector: (s) => (s === '.uebersprung' ? sprung : null),
    getElementById: (id) => (id === 'inhalt' ? inhalt : null),
    addEventListener: (t, f) => { if (t === 'click') klick.push(f); },
    contains: (x) => x === knopf || body.kinder.includes(x),
    get cookie() { return [...jar].map(([k, v]) => `${k}=${v}`).join('; '); },
    set cookie(v) {
      keksSchreiben.push(v);
      const [paar, ...rest] = v.split(';').map((s) => s.trim());
      const [k, w] = paar.split('=');
      if (rest.some((r) => r === 'max-age=0')) jar.delete(k); else jar.set(k, w);
    }
  };
  const gesperrt = () => { throw new Error('SecurityError'); };
  const win = {
    document: doc, navigator: { globalPrivacyControl: gpc }, location: { hostname: host }, frames: {},
    localStorage: speicherGesperrt ? { getItem: gesperrt, setItem: gesperrt, removeItem: gesperrt } : {
      getItem: (k) => (speicher.has(k) ? speicher.get(k) : null),
      setItem: (k, v) => speicher.set(k, String(v)), removeItem: (k) => speicher.delete(k)
    },
    googlefc: {
      callbackQueue: { push(x) { if (typeof x === 'function') x(); } },
      getGoogleConsentModeValues: () => ({ analyticsStoragePurposeConsentStatus: api.cm }),
      showRevocationMessage: () => { api.widerruf++; }
    },
    addEventListener() {},
    setTimeout: (f, ms) => { uhr.timer.push({ f, um: uhr.jetzt + (ms || 0) }); return uhr.timer.length; },
    console
  };
  api.cm = cm;
  if (tcf !== null) {
    win.__tcfapi = (cmd, v, cb) => { if (cmd === 'addEventListener') { tcfHoerer.push(cb); if (tcf !== 'still') cb(tcf, true); } };
  }
  win.window = win;
  const ctx = vm.createContext(win);
  ctx.__uhr = uhr;
  vm.runInContext('Date.now = () => __uhr.jetzt;', ctx);
  vm.runInContext(CODE, ctx, { filename: 'einwilligung.js' });

  Object.assign(api, {
    win, doc, inhalt, speicher, jar, keksSchreiben, skripte, knopf,
    vorspulen(ms) {
      const ziel = uhr.jetzt + ms;
      for (;;) {
        uhr.timer.sort((a, b) => a.um - b.um);
        const t = uhr.timer[0];
        if (!t || t.um > ziel) break;
        uhr.timer.shift(); uhr.jetzt = t.um; t.f();
      }
      uhr.jetzt = ziel;
    },
    melden(tc) { tcfHoerer.forEach((cb) => cb(tc, true)); },
    zettel() { return body.kinder.find((e) => e.className === 'kik-zettel') || null; },
    offen() { const z = api.zettel(); return !!(z && !z.hidden); },
    waehlen(w) { api.zettel().hoerer.click[0]({ target: { closest: () => ({ getAttribute: () => w }) } }); },
    taste(key) { api.zettel().hoerer.keydown[0]({ key, preventDefault() {} }); },
    einstellungen() { klick.forEach((f) => f({ target: { closest: (s) => (s === '[data-datenschutz-einstellungen]' ? knopf : null) }, preventDefault() {} })); },
    gtag() { return win.dataLayer.map((a) => JSON.parse(JSON.stringify(Array.from(a)))); },
    updates() { return api.gtag().filter((a) => a[0] === 'consent' && a[1] === 'update').map((a) => a[2]); },
    gaSkripte() { return skripte.filter((s) => /googletagmanager\.com\/gtag\/js/.test(s)).length; },
    eintrag() { const r = speicher.get(R.SCHLUESSEL); return r ? JSON.parse(r) : null; },
    gaAus() { return win[GA_AUS]; }
  });
  return api;
}

const keineWerbefreigabe = (s) => s.updates().forEach((u) => {
  for (const k of ['ad_storage', 'ad_user_data', 'ad_personalization']) assert.notEqual(u[k], 'granted', `${k} darf nie granted werden`);
});

// --- Regeln ---
test('Regeln: Google-Entscheidung, sichtbarer Dialog, hidden/disabled zählen nicht', () => {
  assert.equal(R.googleEntschieden(null), false);
  assert.equal(R.googleEntschieden(HIDDEN), false);
  assert.equal(R.googleEntschieden({ eventStatus: 'tcloaded', tcString: '' }), false);
  assert.equal(R.googleEntschieden({ eventStatus: 'tcloaded', tcString: 'CP' }), true);
  assert.equal(R.googleEntschieden({ eventStatus: 'useractioncomplete' }), true);
  assert.equal(R.googleEntschieden({ eventStatus: 'cmpuishown', gdprApplies: false }), true);
  assert.equal(R.googleDialogSichtbar(HIDDEN), false);
  assert.equal(R.googleDialogSichtbar({ eventStatus: 'cmpuishown', displayStatus: 'disabled' }), false);
  assert.equal(R.googleDialogSichtbar({ eventStatus: 'cmpuishown', displayStatus: 'visible' }), true);
  assert.equal(R.lage({ tc: HIDDEN, gpc: false, eintrag: null, jetzt: JETZT }), 'fragen');
  assert.equal(R.lage({ tc: null, gpc: false, eintrag: null, jetzt: JETZT }), 'fragen');
  assert.equal(R.lage({ tc: JA_GOOGLE, gpc: true, eintrag: null, jetzt: JETZT }), 'gpc');
});

test('Regeln: 12 Monate gültig, Zukunft und fremde Formate verworfen', () => {
  const e = (zeit, wahl = 'ja', v = 1) => ({ v, wahl, zeit });
  assert.equal(R.gueltigeWahl(e(JETZT - 11 * 30 * TAG), JETZT), 'ja');
  assert.equal(R.gueltigeWahl(e(JETZT - 366 * TAG), JETZT), null);
  assert.equal(R.gueltigeWahl(e(JETZT + 2 * TAG), JETZT), null);
  assert.equal(R.gueltigeWahl(e(JETZT + 30000, 'nein'), JETZT), 'nein'); // kleine Uhrabweichung
  assert.equal(R.gueltigeWahl(e(JETZT, 'ja', 2), JETZT), null);
  assert.equal(R.gueltigeWahl(e(JETZT, 'vielleicht'), JETZT), null);
  assert.equal(R.gueltigeWahl({ v: 1, wahl: 'ja', zeit: 'gestern' }, JETZT), null);
});

test('Regeln: Analytics-Cookies und Domain-Varianten', () => {
  assert.deepEqual(R.gaKekse('_ga=1; _ga_T00HRG2YVF=2; _gat=3; andere=4; _gaX=5'), ['_ga', '_ga_T00HRG2YVF']);
  assert.deepEqual(R.domainVarianten('www.kuechenideenkompass.de'), ['', 'www.kuechenideenkompass.de', '.www.kuechenideenkompass.de', 'kuechenideenkompass.de', '.kuechenideenkompass.de']);
  assert.deepEqual(R.domainVarianten('localhost'), ['']);
});

// --- Ablauf im Schein-Browser ---
test('CMP hidden: nach 3 s erscheint der Zettel, vorher nicht; Statistik bleibt bis zur Wahl aus', () => {
  const s = seite({ tcf: HIDDEN });
  s.vorspulen(2900);
  assert.equal(s.offen(), false);
  s.vorspulen(200);
  assert.equal(s.offen(), true);
  const z = s.zettel();
  assert.equal(z.getAttribute('role'), 'dialog');
  assert.equal(z.getAttribute('aria-modal'), 'false');
  assert.match(z.innerHTML, /id="kik-zettel-titel" tabindex="-1"/);
  assert.match(z.innerHTML, /keine<\/b> Einwilligung in Werbung/);
  assert.match(z.innerHTML, /href="\/datenschutz\/#statistik-fenster"/);
  assert.match(z.innerHTML, /data-zettel="ja">Zustimmen<\/button><button type="button" class="kik-zettel__knopf" data-zettel="nein">Ablehnen/);
  assert.equal(s.gaSkripte(), 0);
  assert.equal(s.gaAus(), true);
});

test('Ohne __tcfapi: Zettel nach 3 s', () => {
  const s = seite({ tcf: null });
  s.vorspulen(3000);
  assert.equal(s.offen(), true);
});

test('Sichtbarer Google-Dialog: kein Zettel', () => {
  const s = seite({ tcf: { eventStatus: 'cmpuishown', displayStatus: 'visible', gdprApplies: true } });
  s.vorspulen(5000);
  assert.equal(s.offen(), false);
});

test('Google-Entscheidung (Zustimmung): kein Zettel, bestehende Logik lädt GA einmal', () => {
  const s = seite({ tcf: JA_GOOGLE, cm: 1, gespeichert: { v: 1, wahl: 'nein', zeit: JETZT - TAG } });
  s.vorspulen(5000);
  assert.equal(s.offen(), false);
  assert.equal(s.eintrag(), null, 'eigene Wahl wird gelöscht');
  assert.equal(s.gaSkripte(), 1);
  assert.equal(s.gaAus(), false);
  keineWerbefreigabe(s);
});

test('gdprApplies false: kein Zettel, eigene Wahl gelöscht', () => {
  const s = seite({ tcf: { eventStatus: 'tcloaded', gdprApplies: false, tcString: '' }, gespeichert: { v: 1, wahl: 'ja', zeit: JETZT - TAG } });
  s.vorspulen(5000);
  assert.equal(s.offen(), false);
  assert.equal(s.eintrag(), null);
  assert.equal(s.gaSkripte(), 0); // CM-Wert unbekannt → keine Messung
});

test('GPC: kein Zettel, kein GA, _ga gelöscht; Einstellungen zeigen nur den GPC-Hinweis', () => {
  const s = seite({ tcf: HIDDEN, gpc: true, kekse: ['_ga', '_ga_T00HRG2YVF'], gespeichert: { v: 1, wahl: 'ja', zeit: JETZT - TAG } });
  s.vorspulen(5000);
  assert.equal(s.offen(), false);
  assert.equal(s.gaSkripte(), 0);
  assert.equal(s.jar.size, 0);
  s.einstellungen();
  assert.equal(s.zettel().getAttribute('data-art'), 'gpc');
  assert.doesNotMatch(s.zettel().innerHTML, /data-zettel="ja"/);
});

test('Zustimmen: nur analytics_storage granted, gtag.js genau einmal, Signale aus, Wahl gespeichert', () => {
  const s = seite({ tcf: HIDDEN });
  s.vorspulen(3000);
  s.waehlen('ja');
  assert.equal(s.offen(), false);
  assert.equal(s.gaAus(), false);
  assert.deepEqual(s.updates().at(-1), { analytics_storage: 'granted' });
  keineWerbefreigabe(s);
  assert.equal(s.gaSkripte(), 1);
  const cfg = s.gtag().find((a) => a[0] === 'config');
  assert.deepEqual(cfg[2], { allow_google_signals: false, allow_ad_personalization_signals: false });
  const e = s.eintrag();
  assert.deepEqual([e.v, e.wahl, e.zeit], [1, 'ja', JETZT + 3000]);
  // Widerruf und erneute Zustimmung: kein zweites Skript
  s.einstellungen();
  assert.equal(s.offen(), true);
  assert.match(s.zettel().innerHTML, /zugestimmt am/);
  s.waehlen('nein');
  s.einstellungen();
  s.waehlen('ja');
  assert.equal(s.gaSkripte(), 1);
  keineWerbefreigabe(s);
});

test('Ablehnen: GA aus, analytics_storage denied, _ga/_ga_* aller Domain-Varianten gelöscht', () => {
  const s = seite({ tcf: HIDDEN, host: 'www.kuechenideenkompass.de', kekse: ['_ga', '_ga_T00HRG2YVF', 'kik-andere'] });
  s.vorspulen(3000);
  s.waehlen('nein');
  assert.equal(s.gaAus(), true);
  assert.equal(s.gaSkripte(), 0);
  assert.deepEqual([...s.jar.keys()], ['kik-andere']);
  for (const d of ['; domain=kuechenideenkompass.de', '; domain=.kuechenideenkompass.de', '; domain=www.kuechenideenkompass.de']) {
    assert.ok(s.keksSchreiben.some((k) => k.startsWith('_ga=;') && k.endsWith(d)), 'fehlt ' + d);
  }
  assert.ok(s.keksSchreiben.some((k) => k === '_ga=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=/'));
  assert.equal(s.eintrag().wahl, 'nein');
  keineWerbefreigabe(s);
});

test('Widerruf nach Zustimmung: GA abgeschaltet, denied, Cookies weg', () => {
  const s = seite({ tcf: HIDDEN, gespeichert: { v: 1, wahl: 'ja', zeit: JETZT - 10 * TAG } });
  s.vorspulen(3000);
  assert.equal(s.offen(), false, 'gültige Wahl → nicht erneut fragen');
  assert.equal(s.gaAus(), false);
  s.jar.set('_ga', 'GA1'); s.jar.set('_ga_T00HRG2YVF', 'GS1');
  s.einstellungen();
  assert.equal(s.doc.activeElement !== null, true, 'Überschrift erhält den Fokus');
  s.waehlen('nein');
  assert.equal(s.gaAus(), true);
  assert.deepEqual(s.updates().at(-1), { analytics_storage: 'denied' });
  assert.equal(s.jar.size, 0);
});

test('Gespeichertes „nein“ löscht _ga schon beim Laden', () => {
  const s = seite({ tcf: 'still', kekse: ['_ga', '_ga_T00HRG2YVF'], gespeichert: { v: 1, wahl: 'nein', zeit: JETZT - TAG } });
  assert.equal(s.jar.size, 0);
  s.vorspulen(5000);
  assert.equal(s.offen(), false);
});

test('12 Monate: abgelaufene Wahl → erneut fragen, frische Wahl gilt', () => {
  const alt = seite({ tcf: HIDDEN, gespeichert: { v: 1, wahl: 'ja', zeit: JETZT - 13 * 30 * TAG } });
  alt.vorspulen(3000);
  assert.equal(alt.offen(), true);
  assert.equal(alt.gaSkripte(), 0);
  const frisch = seite({ tcf: HIDDEN, gespeichert: { v: 1, wahl: 'ja', zeit: JETZT - 11 * 30 * TAG } });
  frisch.vorspulen(3000);
  assert.equal(frisch.offen(), false);
  assert.equal(frisch.gaSkripte(), 1);
});

test('Zeitstempel in der Zukunft wird verworfen', () => {
  const s = seite({ tcf: HIDDEN, gespeichert: { v: 1, wahl: 'ja', zeit: JETZT + 5 * TAG } });
  s.vorspulen(3000);
  assert.equal(s.offen(), true);
  assert.equal(s.gaSkripte(), 0);
});

test('Kaputter Speicherinhalt und gesperrter localStorage werfen nicht', () => {
  const kaputt = seite({ tcf: HIDDEN, gespeichert: '{kein json' });
  kaputt.vorspulen(3000);
  assert.equal(kaputt.offen(), true);
  const s = seite({ tcf: HIDDEN, speicherGesperrt: true });
  assert.doesNotThrow(() => s.vorspulen(3000));
  assert.equal(s.offen(), true);
  assert.doesNotThrow(() => s.waehlen('ja'));
  assert.equal(s.gaSkripte(), 1, 'Wahl gilt für diesen Seitenaufruf');
});

test('„×“ und Escape: schließen ohne Wahl, Statistik bleibt aus, nichts gespeichert', () => {
  const s = seite({ tcf: HIDDEN });
  s.vorspulen(3000);
  s.waehlen('zu');
  assert.equal(s.offen(), false);
  assert.equal(s.eintrag(), null);
  assert.equal(s.gaSkripte(), 0);
  s.einstellungen();
  assert.equal(s.offen(), true);
  assert.match(s.zettel().innerHTML, /Noch keine Auswahl/);
  s.taste('Escape');
  assert.equal(s.offen(), false);
  assert.equal(s.doc.activeElement, s.knopf, 'Fokus zurück zum Auslöser');
  assert.equal(s.gaAus(), true);
});

test('Späte Google-Entscheidung hat Vorrang: Zettel zu, eigene Wahl gelöscht, Google-Nein löscht _ga', () => {
  const s = seite({ tcf: HIDDEN });
  s.vorspulen(3000);
  s.waehlen('ja');
  assert.equal(s.gaAus(), false);
  s.jar.set('_ga', 'GA1');
  s.einstellungen(); // Zettel offen, dann kommt Google doch noch
  s.melden(NEIN_GOOGLE);
  assert.equal(s.offen(), false);
  assert.equal(s.eintrag(), null);
  assert.equal(s.gaAus(), true);
  s.vorspulen(300);
  assert.equal(s.jar.size, 0);
  s.vorspulen(10000);
  assert.equal(s.offen(), false, 'erscheint nicht wieder');
  s.einstellungen();
  assert.equal(s.widerruf, 1, 'Einstellungen öffnen jetzt die Google-CMP');
  assert.equal(s.offen(), false);
});

test('Späte Google-Entscheidung schließt den noch unbeantworteten Zettel', () => {
  const s = seite({ tcf: HIDDEN, cm: 1 });
  s.vorspulen(3000);
  assert.equal(s.offen(), true);
  s.melden(JA_GOOGLE);
  assert.equal(s.offen(), false);
  assert.equal(s.gaSkripte(), 1);
});

test('Google-Nein ohne je aktiven Zettel löscht _ga', () => {
  const s = seite({ tcf: { ...NEIN_GOOGLE, eventStatus: 'tcloaded' }, kekse: ['_ga', '_ga_T00HRG2YVF'] });
  s.vorspulen(300);
  assert.equal(s.jar.size, 0);
  s.vorspulen(5000);
  assert.equal(s.offen(), false);
});

test('Seiten ohne Statistik (Impressum, Datenschutz, Kontakt, 404): kein Zettel von selbst, nie GA', () => {
  const s = seite({ tcf: HIDDEN, statistikAus: true });
  s.vorspulen(5000);
  assert.equal(s.offen(), false);
  s.einstellungen();
  assert.equal(s.offen(), true);
  assert.match(s.zettel().innerHTML, /Auf dieser Seite wird nie gemessen/);
  s.waehlen('ja');
  assert.equal(s.gaSkripte(), 0);
  assert.equal(s.eintrag().wahl, 'ja');
  const g = seite({ tcf: JA_GOOGLE, cm: 1, statistikAus: true });
  g.vorspulen(5000);
  assert.equal(g.gaSkripte(), 0);
});

test('GA-Ereignisse nur mit ga-disable === false (alle Skripte)', () => {
  for (const f of fs.readdirSync(JS).filter((n) => n.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(JS, f), 'utf8');
    for (const m of src.matchAll(/gtag\(\s*'event'/g)) {
      const davor = src.slice(Math.max(0, m.index - 160), m.index);
      assert.match(davor, /\['ga-disable-G-T00HRG2YVF'\] === false/, `${f}: Ereignis ohne Schalterprüfung`);
    }
  }
});

test('Escape im selbst erschienenen Zettel: Fokus geht an den Hauptinhalt, nicht auf body', () => {
  const s = seite({ tcf: HIDDEN });
  s.vorspulen(3000);
  s.doc.activeElement = s.zettel(); // Nutzer ist per Tab in den Zettel gegangen
  s.taste('Escape');
  assert.equal(s.offen(), false);
  assert.equal(s.doc.activeElement, s.inhalt);
  assert.equal(s.inhalt.getAttribute('tabindex'), '-1');
  const t = seite({ tcf: HIDDEN });
  t.vorspulen(3000);
  t.taste('Escape'); // Fokus war nicht im Zettel → bleibt, wo er war
  assert.equal(t.doc.activeElement, null);
});

test('GPC-Hinweis schließt sich, sobald Google entscheidet', () => {
  const s = seite({ tcf: HIDDEN, gpc: true });
  s.einstellungen();
  assert.equal(s.zettel().getAttribute('data-art'), 'gpc');
  assert.equal(s.offen(), true);
  s.melden(NEIN_GOOGLE);
  assert.equal(s.offen(), false);
});

test('Druck: Zettel und Platzhalter-Abstand ausgeblendet', () => {
  const css = fs.readFileSync(path.resolve(JS, '..', 'css', 'werkbank.css'), 'utf8');
  assert.match(css, /@media print \{ \.kik-zettel, \.kik-zettel-ansage \{ display: none !important; \} body \{ padding-bottom: 0 !important; \} \}/);
});
