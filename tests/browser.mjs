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
      // Ohne Antwort von Google: das <ins> bleibt sichtbar und ungeschnitten (AdSense-Hilfe 10762946),
      // aber kein Schild „Anzeige“, keine Mindesthöhe, kein Abstand
      const leer = [];
      for (const a of plaetze.filter((p) => !p.hidden)) {
        const cs = getComputedStyle(a), ins = a.querySelector('ins.adsbygoogle');
        if (cs.content !== 'none' && getComputedStyle(a, '::before').content.includes('Anzeige')) leer.push(`leerer Platz ${a.dataset.anzeige}: Schild sichtbar`);
        if (parseFloat(cs.marginTop) || parseFloat(cs.marginBottom) || cs.minHeight !== '0px') leer.push(`leerer Platz ${a.dataset.anzeige}: Abstand/Mindesthöhe`);
        if (ins) {
          const ci = getComputedStyle(ins);
          if (ci.display === 'none' || ci.visibility !== 'visible' || !ins.getBoundingClientRect().width) leer.push(`Platz ${a.dataset.anzeige}: ins versteckt`);
          if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || cs.visibility !== 'visible' || a.getBoundingClientRect().height < ins.getBoundingClientRect().height) leer.push(`Platz ${a.dataset.anzeige}: schneidet das ins ab`);
        }
      }
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

// Anzeigenplätze mit einem adsbygoogle-Stub, der nie etwas füllt (AdSense-Hilfe 10762946):
// ohne Status bleibt das <ins> sichtbar und ungeschnitten, nur Schild „Anzeige“ und Abstände fehlen;
// "unfilled" → ins display:none, kein Beiwerk; "filled" und "unfill-optimized" → Platz samt Schild und Abstand.
for (const breite of [390, 1366]) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: 900 } });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* Stub: keine Anzeige */' }));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fehler.push(`${breite}px Stub: JS-Fehler ${e.message}`));
  for (const s of ['germteig-gehzeit/', 'mehltypen-at-de-ch/', 'backzeit-formgroesse/']) {
    for (const status of ['filled', 'unfill-optimized']) {
      await geh(page, BASIS + '/' + s);
      const z = await page.evaluate(async (status) => {
        const warte = () => new Promise((ok) => setTimeout(ok, 0));   // MutationObserver meldet asynchron
        const ins = [...document.querySelectorAll('.anzeige:not([hidden]) ins.adsbygoogle')];
        const lage = () => ins.map((i) => {
          const a = i.parentElement, ca = getComputedStyle(a), ci = getComputedStyle(i), ri = i.getBoundingClientRect();
          return { insDisplay: ci.display, insSicht: ci.visibility, breite: ri.width, insH: ri.height, boxH: a.getBoundingClientRect().height,
                   ueberlauf: ca.overflowX + '/' + ca.overflowY, boxSicht: ca.visibility,
                   schild: getComputedStyle(a, '::before').content.includes('Anzeige'), abstand: parseFloat(ca.marginTop) + parseFloat(ca.marginBottom) };
        });
        const ohne = lage();
        ins.forEach((i) => i.setAttribute('data-ad-status', 'unfilled'));
        await warte();
        const unfilled = lage();
        ins.forEach((i) => i.setAttribute('data-ad-status', status));
        await warte();
        return { ins: ins.length, ohne, unfilled, nachher: lage(),
                 klasse: ins.every((i) => i.parentElement.classList.contains('anzeige--geliefert')) };
      }, status);
      const wo = `${breite}px /${s}`;
      if (!z.ins) fehler.push(`${wo}: kein Anzeigenplatz befüllt`);
      if (!z.ohne.every((x) => x.insDisplay !== 'none' && x.insSicht === 'visible' && x.breite > 0 && x.ueberlauf === 'visible/visible' && x.boxSicht === 'visible' && x.boxH >= x.insH))
        fehler.push(`${wo}: ohne Status ist das ins versteckt oder geschnitten ${JSON.stringify(z.ohne)}`);
      if (z.ohne.some((x) => x.schild || x.abstand)) fehler.push(`${wo}: ohne Status Schild/Abstand sichtbar`);
      if (!z.unfilled.every((x) => x.insDisplay === 'none' && !x.schild && x.boxH === 0)) fehler.push(`${wo}: unfilled nicht ausgeblendet ${JSON.stringify(z.unfilled)}`);
      if (!z.nachher.every((x) => x.schild && x.boxH > 0 && x.abstand > 0) || !z.klasse) fehler.push(`${wo}: ${status} – Platz nicht vollständig sichtbar (Klasse ${z.klasse}) ${JSON.stringify(z.nachher)}`);
    }
  }
  // Browser ohne :has(): :has()-Regeln entfernen, Rückfall-Klasse erzwingen
  await geh(page, BASIS + '/germteig-gehzeit/');
  const r = await page.evaluate(async () => {
    for (const sh of document.styleSheets) { try { for (let k = sh.cssRules.length - 1; k >= 0; k--) if (sh.cssRules[k].cssText.includes(':has(')) sh.deleteRule(k); } catch (e) {} }
    document.documentElement.classList.add('kein-has');
    const ins = [...document.querySelectorAll('.anzeige:not([hidden]) ins.adsbygoogle')];
    const lage = () => ins.map((i) => ({ sicht: getComputedStyle(i).display !== 'none' && i.getBoundingClientRect().width > 0 && getComputedStyle(i.parentElement).overflowY === 'visible',
                                         schild: getComputedStyle(i.parentElement, '::before').content.includes('Anzeige') }));
    const ohne = lage();
    ins.forEach((i) => i.setAttribute('data-ad-status', 'unfill-optimized'));
    await new Promise((ok) => setTimeout(ok, 0));
    return { n: ins.length, ohne, nachher: lage() };
  });
  if (!r.n || !r.ohne.every((x) => x.sicht && !x.schild) || !r.nachher.every((x) => x.schild)) fehler.push(`${breite}px ohne :has(): Rückfall falsch ${JSON.stringify(r)}`);
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
