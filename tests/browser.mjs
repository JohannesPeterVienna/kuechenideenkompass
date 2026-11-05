// Browser-Test mit Playwright: Überlauf, Konsole, Werkzeug-Funktion, Screenshots
// Aufruf: node tests/browser.mjs <ausgabeordner>   (startet selbst einen Server auf http://127.0.0.1:8791, falls keiner läuft)
import { createRequire } from 'node:module';
import http from 'node:http';
import fsx from 'node:fs';
import pathx from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('/opt/npm-tools/node_modules/playwright'); } catch { pw = require('playwright'); }
const AUS = process.argv[2] || '/tmp/screens';
const BASIS = 'http://127.0.0.1:8791';
const SEITEN = ['', 'rezept-umrechnen/', 'backform-umrechnen/', 'cups-in-gramm/', 'einkaufsliste/', 'kuechenwoerterbuch/', 'springform-umrechnen/', 'germ-umrechnen/', 'ofentemperatur-umrechnen/', 'impressum/', 'datenschutz/', 'dag-in-gramm/'];
const fehler = [];
const DOCS = pathx.resolve(pathx.dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const TYPEN = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
let server = null;
await new Promise((ok) => {
  const srv = http.createServer((q, a) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = pathx.join(DOCS, p);
    if (!f.startsWith(DOCS) || !fsx.existsSync(f)) { a.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }); a.end(fsx.readFileSync(pathx.join(DOCS, '404.html'))); return; }
    a.writeHead(200, { 'content-type': TYPEN[pathx.extname(f)] || 'application/octet-stream' }); a.end(fsx.readFileSync(f));
  });
  srv.once('error', () => ok()); // Port belegt: vorhandenen Server verwenden
  srv.listen(8791, '127.0.0.1', () => { server = srv; ok(); });
});
fsx.mkdirSync(AUS, { recursive: true });
const SITEMAP = [...fsx.readFileSync(pathx.join(DOCS, 'sitemap.xml'), 'utf8').matchAll(/<loc>https:\/\/kuechenideenkompass\.de\/([^<]*)<\/loc>/g)].map((m) => m[1]);
async function geh(page, url) {
  for (let i = 0; i < 4; i++) {
    try { return await page.goto(url, { waitUntil: 'load' }); } catch (e) { if (i === 3) throw e; await page.waitForTimeout(400); }
  }
}
const browser = await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--no-proxy-server'] });
// Alle Sitemap-Seiten bei 390 und 1366 px: JS-Fehler, Überlauf, lokale 404, erzwungen sichtbare Werbeplätze ≥ 150 px von Bedienelementen
for (const breite of [390, 1366]) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: 900 } });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort()); // keine externen Dienste im Test
  for (const s of SITEMAP) {
    const page = await ctx.newPage();
    const probs = [];
    page.on('pageerror', (e) => probs.push('JS-Fehler: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) probs.push('Konsole: ' + m.text()); });
    page.on('response', (res) => { if (res.status() === 404 && res.url().startsWith(BASIS)) probs.push('lokale 404: ' + res.url().slice(BASIS.length)); });
    await geh(page, BASIS + '/' + s);
    await page.waitForTimeout(300);
    const info = await page.evaluate(() => {
      const ueber = document.documentElement.scrollWidth - window.innerWidth;
      const plaetze = [...document.querySelectorAll('[data-anzeige]')];
      // Ohne gelieferte Anzeige darf kein Platz sichtbar sein (keine Höhe, kein Schild „Anzeige“)
      const leer = plaetze.filter((a) => a.getBoundingClientRect().height > 0).map((a) => `leerer Platz ${a.dataset.anzeige} sichtbar`);
      // Danach jeden Platz als gefüllt erzwingen (data-ad-status="filled"), um den Abstand zu Bedienelementen zu messen
      for (const a of plaetze) {
        a.hidden = false; a.style.minHeight = '250px';
        let ins = a.querySelector('ins.adsbygoogle');
        if (!ins) { ins = document.createElement('ins'); ins.className = 'adsbygoogle'; a.appendChild(ins); }
        ins.setAttribute('data-ad-status', 'filled');
      }
      const ctl = [...document.querySelectorAll('button, input, select, textarea, summary')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; });
      const nah = [];
      for (const a of plaetze) {
        const r = a.getBoundingClientRect(); if (!r.width || !r.height) continue;
        for (const c of ctl) {
          const q = c.getBoundingClientRect();
          const d = Math.hypot(Math.max(0, q.left - r.right, r.left - q.right), Math.max(0, q.top - r.bottom, r.top - q.bottom));
          if (d < 150) nah.push(`Platz ${a.dataset.anzeige} nur ${Math.round(d)} px von ${c.tagName.toLowerCase()}${c.id ? '#' + c.id : ''} „${(c.textContent || c.name || '').trim().slice(0, 30)}“`);
        }
      }
      return { ueber, nah, leer };
    });
    if (info.ueber > 1) probs.push(`horizontaler Überlauf ${info.ueber}px`);
    probs.push(...info.nah, ...info.leer);
    for (const p of probs) fehler.push(`${breite}px /${s}: ${p}`);
    await page.close();
  }
  await ctx.close();
}

// Leere Anzeigenplätze mit einem adsbygoogle-Stub, der nie etwas füllt: nichts sichtbar; mit data-ad-status="filled"
// erscheint der Platz samt Schild „Anzeige“; "unfilled" bleibt zu.
for (const breite of [390, 1366]) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: 900 } });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* Stub: keine Anzeige */' }));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fehler.push(`${breite}px Stub: JS-Fehler ${e.message}`));
  for (const s of ['germteig-gehzeit/', 'mehltypen-at-de-ch/', 'backzeit-formgroesse/']) {
    await geh(page, BASIS + '/' + s);
    const z = await page.evaluate(async () => {
      const plaetze = [...document.querySelectorAll('.anzeige')];
      const warte = () => new Promise((ok) => setTimeout(ok, 0));   // MutationObserver meldet asynchron
      const sicht = () => plaetze.filter((a) => { const cs = getComputedStyle(a); return cs.display !== 'none' && (a.getBoundingClientRect().height > 0 || parseFloat(cs.marginTop) > 0 || parseFloat(cs.marginBottom) > 0); }).length;
      const ins = [...document.querySelectorAll('.anzeige:not([hidden]) ins.adsbygoogle')];
      const vorher = sicht();
      ins.forEach((i) => i.setAttribute('data-ad-status', 'unfilled'));
      await warte();
      const unfilled = sicht();
      ins.forEach((i) => i.setAttribute('data-ad-status', 'filled'));
      await warte();
      return { vorher, unfilled, ins: ins.length, nachher: sicht(),
               schild: ins.every((i) => getComputedStyle(i.parentElement, '::before').content.includes('Anzeige')),
               klasse: ins.every((i) => i.parentElement.classList.contains('anzeige--geliefert')) };
    });
    if (z.vorher || z.unfilled) fehler.push(`${breite}px /${s}: leerer Anzeigenplatz sichtbar (${z.vorher}/${z.unfilled})`);
    if (!z.ins) fehler.push(`${breite}px /${s}: kein Anzeigenplatz befüllt`);
    if (z.nachher !== z.ins || !z.schild || !z.klasse) fehler.push(`${breite}px /${s}: gefüllter Platz nicht sichtbar (${z.nachher} von ${z.ins}, Schild ${z.schild}, Klasse ${z.klasse})`);
  }
  await ctx.close();
}

for (const breite of [360, 390, 1366]) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: breite < 500 ? 800 : 900 } });
  const page = await ctx.newPage();
  // externe Dienste im Test blockieren
  // externe Dienste werden nicht blockiert (Abbruch per route stört die Navigation)
  page.on('pageerror', (e) => fehler.push(`${breite}px ${page.url()}: ${e.message}`));
  for (const s of SEITEN) {
    await geh(page, BASIS + '/' + s);
    if (s === 'about.html') { const m = await page.locator('meta[http-equiv="refresh"]').getAttribute('content'); if (!/ueber-uns\//.test(m || '')) fehler.push('Weiterleitung about.html'); continue; }
    const ueber = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (ueber > 1) fehler.push(`${breite}px /${s}: horizontaler Überlauf ${ueber}px`);
    if (breite !== 360) await page.screenshot({ path: `${AUS}/${breite}-${(s || 'start').replace(/\W+/g, '_')}.png`, fullPage: breite === 390 ? false : false });
  }
  // Werkbank-Funktion
  await geh(page, BASIS + '/rezept-umrechnen/');
  await page.click('#wb-beispiel');
  const txt = await page.textContent('#wb-ergebnis');
  if (!/Topfen/.test(txt) || !/Was nicht linear mitwächst/.test(txt)) fehler.push('Werkbank-Beispiel ohne Ergebnis');
  // Radios sind visuell versteckt (Pillen) – wie Nutzer auf die Pille klicken
  await page.click('label:has(> input[name="region"][value="de"])');
  await page.click('label:has(> input[name="einheiten"][value="metrisch"])');
  if (!(await page.isChecked('input[name="region"][value="de"]')) || !(await page.isChecked('input[name="einheiten"][value="metrisch"]'))) fehler.push('Pillen-Auswahl wirkt nicht');
  const txt2 = await page.textContent('#wb-ergebnis');
  if (!/Quark/.test(txt2) || !/375/.test(txt2)) fehler.push('Werkbank: Übersetzung/Metrisch fehlerhaft: ' + txt2.slice(0, 200));
  await page.screenshot({ path: `${AUS}/${breite}-werkbank-ergebnis.png`, fullPage: true });
  // Teilen-Link
  await page.click('#wb-teilen');
  const url = page.url();
  if (!/#r=/.test(url)) fehler.push('Teilen-Link fehlt');
  await page.goto('about:blank'); await geh(page, url);
  if ((await page.inputValue('#wb-titel')) !== 'Topfen-Gugelhupf') fehler.push('Teilen-Link stellt Rezept nicht her');
  // Backform
  await geh(page, BASIS + '/backform-umrechnen/');
  const bf = await page.textContent('#bf-ergebnis');
  if (!/1,16/.test(bf)) fehler.push('Backform 26→28 nicht 1,16: ' + bf.slice(0, 80));
  await page.click('[data-schnell="26,blech,40,30"]');
  if (!/2,26/.test(await page.textContent('#bf-ergebnis'))) fehler.push('Backform Blech nicht 2,26');
  if (breite === 1366) await page.screenshot({ path: `${AUS}/${breite}-backform-blech.png` });
  // Einkaufsliste
  await geh(page, BASIS + '/einkaufsliste/');
  await page.click('#ek-beispiel');
  const ek = await page.textContent('#ek-liste');
  if (!/Backzutaten/.test(ek) || !/im Vorrat/.test(ek)) fehler.push('Einkaufsliste fehlerhaft: ' + ek.slice(0, 200));
  await page.screenshot({ path: `${AUS}/${breite}-einkauf.png`, fullPage: true });
  // Wörterbuch
  await geh(page, BASIS + '/kuechenwoerterbuch/');
  await page.fill('#wo-suche', 'hackfleisch');
  const info = await page.textContent('#wo-info');
  if (!/^1 von|^[12] von/.test(info)) fehler.push('Wörterbuchsuche: ' + info);
  await ctx.close();
}
await browser.close();
if (server) server.close();
console.log(fehler.length ? fehler.join('\n') : 'Browser-Tests bestanden.');
process.exit(fehler.length ? 1 : 0);
