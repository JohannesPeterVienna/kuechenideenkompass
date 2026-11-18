// Browser-Test der Werkzeuge vom 18.11.2026: Durchklicken, Unsinnseingaben, Links im Fragment, CSV, Anker, Weiterleitungen.
// Aufruf: node tests/werkzeuge-browser.mjs [ausgabeordner]   (eigener Server auf 127.0.0.1:8792, wird wieder beendet)
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('/opt/node-tools/node_modules/playwright'); } catch { try { pw = require('/opt/npm-tools/node_modules/playwright'); } catch { pw = require('playwright'); } }
const DOCS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const AUS = process.argv[2] || '';
const BASIS = 'http://127.0.0.1:8792';
const TYPEN = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const srv = http.createServer((q, a) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(DOCS, p);
  if (!f.startsWith(DOCS) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { a.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }); a.end('404'); return; }
  a.writeHead(200, { 'content-type': TYPEN[path.extname(f)] || 'application/octet-stream' }); a.end(fs.readFileSync(f));
});
await new Promise((ok) => srv.listen(8792, '127.0.0.1', ok));
const fehler = [];
const pruef = (bed, text) => { if (!bed) fehler.push(text); };
const BOESE = ['<img src=x onerror=window.__xss=1>', '"><script>window.__xss=1</script>', "';window.__xss=1;//", '=1+1', '-5', '1e999', '９９', '   ', '0', '99999999999', '70 °C', 'NaN', '{{7*7}}', '../../etc/passwd'];
const SITEMAP = [...fs.readFileSync(path.join(DOCS, 'sitemap.xml'), 'utf8').matchAll(/<loc>https:\/\/kuechenideenkompass\.de\/([^<]*)<\/loc>/g)].map((m) => m[1]);

const browser = await pw.chromium.launch({ executablePath: fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined, args: ['--no-sandbox', '--no-proxy-server'] });
try {
  for (const breite of [390, 1366]) {
    const ctx = await browser.newContext({ viewport: { width: breite, height: 900 }, acceptDownloads: true });
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    const neu = async (pfad) => {
      const page = await ctx.newPage();
      page.on('pageerror', (e) => fehler.push(`${breite}px ${pfad}: JS-Fehler ${e.message}`));
      page.on('dialog', (d) => { fehler.push(`${breite}px ${pfad}: Dialog „${d.message()}“`); d.dismiss(); });
      await page.goto(BASIS + pfad, { waitUntil: 'load' });
      return page;
    };
    const sauber = async (page, wo) => {
      pruef(!(await page.evaluate(() => window.__xss)), `${breite}px ${wo}: eingeschleuster Code lief`);
      pruef(!(await page.evaluate(() => document.querySelector('main img[src="x"], main script:not([src]):not([type])'))), `${breite}px ${wo}: eingeschleustes Element im DOM`);
      const ueber = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      pruef(ueber <= 1, `${breite}px ${wo}: Überlauf ${ueber}px`);
    };

    // 1) Anker und interne Links aller Sitemap-Seiten: jedes #ziel muss auf der Zielseite existieren
    const ids = {};
    for (const s of SITEMAP) { const h = fs.readFileSync(path.join(DOCS, s, 'index.html'), 'utf8'); ids['/' + s] = new Set([...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])); }
    if (breite === 390) for (const s of SITEMAP) {
      const h = fs.readFileSync(path.join(DOCS, s, 'index.html'), 'utf8');
      for (const m of h.matchAll(/href="(\/[^"#?]*)(?:\?[^"#]*)?#([^"]+)"/g)) {
        if (/^[a-z]=/.test(m[2])) continue; // Werkzeug-Zustand, wird unten im Browser geprüft
        pruef(ids[m[1]] && ids[m[1]].has(m[2]), `/${s}: Anker ${m[1]}#${m[2]} fehlt`);
      }
      for (const m of h.matchAll(/href="#([^"]+)"/g)) pruef(ids['/' + s].has(m[1]), `/${s}: Anker #${m[1]} fehlt`);
    }

    // 2) Startseite: Schnellrechner
    let page = await neu('/');
    pruef((await page.locator('#sr-ergebnis table.zutaten tr').count()) >= 5, `${breite}px Start: Beispiel nicht gerechnet`);
    pruef(/375/.test(await page.locator('#sr-ergebnis').innerText()), `${breite}px Start: 25 dag × 1,5 ≠ 375`);
    const oben = await page.evaluate(() => document.getElementById('schnellrechner').getBoundingClientRect().top + scrollY);
    pruef(oben < 900, `${breite}px Start: Werkzeug erst bei ${Math.round(oben)}px`);
    await page.fill('#sr-nach', '12');
    pruef(/Faktor 3/.test(await page.locator('#sr-ergebnis').innerText()), `${breite}px Start: Faktor 3 fehlt`);
    const weiter = await page.locator('#sr-weiter').getAttribute('href');
    pruef(/^\/rezept-umrechnen\/#r=[A-Za-z0-9_-]+$/.test(weiter || ''), `${breite}px Start: Werkbank-Link ${weiter}`);
    for (const b of BOESE) { await page.fill('#sr-zutaten', b + '\n2 EL ' + b); await page.fill('#sr-von', b).catch(() => {}); await page.fill('#sr-nach', b).catch(() => {}); await page.waitForTimeout(20); }
    await sauber(page, 'Start nach Unsinn');
    await page.fill('#sr-zutaten', ''); await page.waitForTimeout(30);
    pruef(/Zutaten einfügen/.test(await page.locator('#sr-ergebnis').innerText()), `${breite}px Start: Leerzustand fehlt`);
    await page.click('#sr-beispiel'); await page.fill('#sr-von', '4'); await page.fill('#sr-nach', '6');
    await page.click('#sr-kopieren'); await page.waitForTimeout(100);
    pruef(/kopiert|markieren/.test(await page.locator('#sr-status').innerText()), `${breite}px Start: Kopieren ohne Rückmeldung`);
    const ziel = await page.locator('#sr-weiter').getAttribute('href');
    if (AUS) await page.screenshot({ path: `${AUS}/w-${breite}-start.png` });
    await page.close();
    page = await neu(ziel);
    await page.waitForTimeout(200);
    pruef(/25 dag glattes Mehl/.test(await page.inputValue('#wb-zutaten')), `${breite}px Werkbank: Rezept aus dem Schnellrechner nicht übernommen`);
    pruef(/375/.test(await page.locator('#wb-ergebnis').innerText()), `${breite}px Werkbank: Ergebnis aus Link fehlt`);
    await page.close();

    // 3) Kerntemperatur
    page = await neu('/kerntemperatur/');
    pruef((await page.locator('#kt-tabelle tbody tr').count()) === (await page.locator('#kt-zeile option').count()), `${breite}px Kern: Tabelle ≠ Auswahl`);
    pruef(!/#/.test(page.url()), `${breite}px Kern: Adresse schon beim Laden verändert`);
    await page.click('[data-beispiel="usda-gefluegel,71,c"]');
    let t = await page.locator('#kt-ergebnis').innerText();
    pruef(/Noch nicht erreicht/i.test(t) && /2,9 °C/.test(t) && /Rechenweg/i.test(t) && /Nächster Schritt/.test(t) && /abgerufen am 18\.11\.2026/.test(t), `${breite}px Kern: Beispiel Geflügel falsch: ${t.slice(0, 200)}`);
    pruef(/#k=usda-gefluegel~71~c$/.test(page.url()), `${breite}px Kern: Adresse ${page.url()}`);
    await page.click('[data-beispiel="usda-stueck,145,f"]');
    t = await page.locator('#kt-ergebnis').innerText();
    pruef(/Zielwert erreicht/i.test(t) && /3 Minuten ruhen/.test(t) && /BfR empfiehlt/.test(t), `${breite}px Kern: Steak 145 °F falsch`);
    for (const b of BOESE) { await page.fill('#kt-wert', b.slice(0, 7)); await page.evaluate((v) => { const e = document.getElementById('kt-wert'); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, b); await page.fill('#kt-suche', b); await page.waitForTimeout(15); }
    await sauber(page, 'Kern nach Unsinn');
    pruef(/Kein Eintrag passt/.test(await page.locator('#kt-info').innerText()), `${breite}px Kern: Leertreffer ohne Hinweis`);
    await page.fill('#kt-suche', 'geflügel usda');
    pruef((await page.locator('#kt-tabelle tbody tr:not([hidden])').count()) === 1, `${breite}px Kern: Suche „geflügel usda“`);
    await page.fill('#kt-suche', '');
    await page.locator('label:has(input[name="kt-gruppe"][value="gebaeck"])').click();
    pruef((await page.locator('#kt-tabelle tbody tr:not([hidden])').count()) === 4, `${breite}px Kern: Gruppe Gebäck`);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#kt-csv')]);
    const csv = fs.readFileSync(await dl.path(), 'utf8');
    pruef(csv.trim().split('\r\n').length === 5 && csv.includes('King Arthur') && csv.includes('18.11.2026'), `${breite}px Kern: CSV-Inhalt`);
    pruef(!csv.split('\r\n').some((z) => z.replace(/^﻿/, '').split(';').some((c) => /^"?[=+\-@]/.test(c))), `${breite}px Kern: CSV-Zelle beginnt mit Formelzeichen`);
    await page.locator('label:has(input[name="kt-gruppe"][value="alle"])').click();
    // Tastatur: Auswahl und Eingabe ohne Maus
    await page.focus('#kt-zeile'); await page.keyboard.press('Tab'); await page.keyboard.type('75');
    pruef(/75/.test(await page.inputValue('#kt-wert')), `${breite}px Kern: Tab führt nicht ins Temperaturfeld`);
    await page.locator('#kt-tabelle [data-nimm="bfr-heisshalten"]').click();
    pruef((await page.inputValue('#kt-zeile')) === 'bfr-heisshalten', `${breite}px Kern: „prüfen“ in der Tabelle`);
    await page.click('#kt-link'); await page.waitForTimeout(100);
    pruef(/kopiert|Adresszeile/.test(await page.locator('#kt-status').innerText()), `${breite}px Kern: Link kopieren ohne Rückmeldung`);
    if (AUS) await page.screenshot({ path: `${AUS}/w-${breite}-kern.png`, fullPage: true });
    await page.close();
    // geteilte und manipulierte Links
    page = await neu('/kerntemperatur/#k=usda-faschiert~160~f');
    t = await page.locator('#kt-ergebnis').innerText();
    pruef(/71,1 °C/.test(t) && /Zielwert erreicht/i.test(t), `${breite}px Kern: geteilter Link`);
    await page.close();
    for (const h of ['#k=<img src=x onerror=window.__xss=1>', '#k=usda-stueck~<script>window.__xss=1</script>', '#k=javascript:alert(1)', '#k=usda-stueck~70~c%22%3E%3Csvg/onload=window.__xss=1%3E', '#h=reste-bfr~2026-11-18', '#k=__proto__~1~c']) {
      page = await neu('/kerntemperatur/' + h);
      await page.waitForTimeout(60);
      await sauber(page, 'Kern mit Link ' + h);
      pruef((await page.locator('#kt-ergebnis .befund').count()) === 1, `${breite}px Kern: kein Grundzustand bei ${h}`);
      await page.close();
    }

    // 4) Kühlschrank-Fristen
    page = await neu('/haltbarkeit-kuehlschrank/');
    pruef(/Verbrauchen bis/.test(await page.locator('#hb-ergebnis').innerText()), `${breite}px Fristen: Startzustand`);
    await page.selectOption('#hb-zeile', 'reste-bfr'); await page.fill('#hb-datum', '2026-11-15');
    t = await page.locator('#hb-ergebnis').innerText();
    pruef(/Dienstag, 17\.11\.2026/.test(t) && /Mittwoch, 18\.11\.2026/.test(t) && /\+ 2 Tage/.test(t) && /höchstens 7 °C/.test(t), `${breite}px Fristen: Gulasch-Beispiel falsch: ${t.slice(0, 200)}`);
    pruef(/#h=reste-bfr~2026-11-15$/.test(page.url()), `${breite}px Fristen: Adresse ${page.url()}`);
    await page.selectOption('#hb-zeile', 'hack-lose-de');
    pruef(/selben Tag/.test(await page.locator('#hb-ergebnis').innerText()), `${breite}px Fristen: Stundenfrist`);
    await page.fill('#hb-datum', ''); await page.waitForTimeout(20);
    pruef(/gültiges Datum/.test(await page.locator('#hb-ergebnis').innerText()), `${breite}px Fristen: leeres Datum`);
    for (const b of BOESE) { await page.evaluate((v) => { const e = document.getElementById('hb-datum'); e.setAttribute('type', 'text'); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, b); await page.fill('#hb-suche', b); await page.waitForTimeout(15); }
    await sauber(page, 'Fristen nach Unsinn');
    await page.fill('#hb-suche', 'hartgekocht');
    pruef((await page.locator('#hb-tabelle tbody tr:not([hidden])').count()) === 2, `${breite}px Fristen: Suche hartgekocht`);
    const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#hb-csv')]);
    const csv2 = fs.readFileSync(await dl2.path(), 'utf8');
    pruef(csv2.trim().split('\r\n').length === 3 && /2 bis 4 Wochen/.test(csv2) && /1 Woche/.test(csv2), `${breite}px Fristen: CSV-Inhalt`);
    await page.fill('#hb-suche', '');
    await page.click('[data-beispiel="suppe-us,4"]');
    pruef(/Jetzt verbrauchen|Frist überschritten/i.test(await page.locator('#hb-ergebnis').innerText()), `${breite}px Fristen: Beispiel Suppe`);
    if (AUS) await page.screenshot({ path: `${AUS}/w-${breite}-fristen.png`, fullPage: true });
    await page.close();
    for (const h of ['#h=reste-bfr~2026-11-15', '#h=<img src=x onerror=window.__xss=1>', '#h=reste-bfr~2026-99-99', '#h=reste-bfr~%3Cscript%3Ewindow.__xss=1%3C/script%3E']) {
      page = await neu('/haltbarkeit-kuehlschrank/' + h);
      await page.waitForTimeout(60);
      await sauber(page, 'Fristen mit Link ' + h);
      pruef((await page.locator('#hb-ergebnis .befund').count()) === 1, `${breite}px Fristen: kein Ergebnis bei ${h}`);
      if (h === '#h=reste-bfr~2026-11-15') pruef(/17\.11\.2026/.test(await page.locator('#hb-ergebnis').innerText()), `${breite}px Fristen: geteilter Link`);
      await page.close();
    }
    // Link im Fließtext derselben Seite (hashchange)
    page = await neu('/haltbarkeit-kuehlschrank/');
    await page.locator('article a[href="/haltbarkeit-kuehlschrank/#h=reste-bfr~2026-11-15"]').click();
    await page.waitForTimeout(150);
    pruef(/17\.11\.2026/.test(await page.locator('#hb-ergebnis').innerText()), `${breite}px Fristen: Beispiel-Link im Text wirkt nicht`);
    await page.close();

    // 5) Zutaten-Waage, Ofen, Germ: Rechenweg, Links, Unsinn
    page = await neu('/cups-in-gramm/#w=zucker~2~el');
    t = await page.locator('#wa-ergebnis').innerText();
    pruef(/25 g/.test(t) && /198 g ÷ 16 = 12,38 g je EL/.test(t), `${breite}px Waage: Link 2 EL Zucker: ${t.slice(0, 160)}`);
    await page.selectOption('#wa-zutat', 'weizenmehl'); await page.selectOption('#wa-einheit', 'g'); await page.fill('#wa-menge', '240');
    t = await page.locator('#wa-ergebnis').innerText();
    pruef(/240 g ÷ 120 g je Cup = 2 Cups/.test(t), `${breite}px Waage: Rückweg Gramm → Cups: ${t.slice(0, 200)}`);
    for (const b of ['-1', '0', '', '1e5000', '999999999']) { await page.evaluate((v) => { const e = document.getElementById('wa-menge'); e.setAttribute('type', 'text'); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, b); await page.waitForTimeout(10); pruef(/größer als 0/.test(await page.locator('#wa-ergebnis').innerText()), `${breite}px Waage: Eingabe „${b}“ nicht abgefangen`); }
    await sauber(page, 'Waage');
    await page.close();
    for (const h of ['#w=<img src=x onerror=window.__xss=1>~1~cup', '#w=zucker~1~<svg onload=window.__xss=1>', '?zutat=%3Cimg%20src=x%20onerror=window.__xss=1%3E']) { page = await neu('/cups-in-gramm/' + h); await page.waitForTimeout(50); await sauber(page, 'Waage ' + h); pruef(/g/.test(await page.locator('#wa-ergebnis').innerText()), `${breite}px Waage: kein Ergebnis bei ${h}`); await page.close(); }
    page = await neu('/ofentemperatur-umrechnen/#o=f~350');
    t = await page.locator('#of-ergebnis').innerText();
    pruef(/175 °C/.test(t) && /\(350 °F − 32\) ÷ 1,8 = 176,7 °C/.test(t), `${breite}px Ofen: Link 350 °F`);
    await page.locator('a[href="/ofentemperatur-umrechnen/#o=umluft~160"]').first().click(); await page.waitForTimeout(120);
    pruef(/160 °C Umluft \+ 20 °C = 180 °C/.test(await page.locator('#of-ergebnis').innerText()), `${breite}px Ofen: Beispiel-Link`);
    await page.fill('#of-wert', '9999'); pruef(/außerhalb/.test(await page.locator('#of-ergebnis').innerText()), `${breite}px Ofen: 9999 nicht abgefangen`);
    await sauber(page, 'Ofen'); await page.close();
    page = await neu('/germ-umrechnen/#g=frisch~21');
    t = await page.locator('#ge-ergebnis').innerText();
    pruef(/21 g Frischgerm ÷ 42 g × 1000 g = 500 g Mehl/.test(t), `${breite}px Germ: Link ½ Würfel`);
    await page.fill('#ge-menge', '-4'); pruef(/größer als 0/.test(await page.locator('#ge-ergebnis').innerText()), `${breite}px Germ: −4 nicht abgefangen`);
    await sauber(page, 'Germ'); await page.close();

    // 6) Zusammengelegte Seiten leiten weiter und stehen nicht in der Sitemap
    for (const [alt, neuP] of [['/fuer-viele-gaeste-kochen/', '/rezept-verdoppeln/'], ['/essloeffel-teeloeffel-gramm/', '/cups-in-gramm/']]) {
      const h = fs.readFileSync(path.join(DOCS, alt, 'index.html'), 'utf8');
      pruef(/noindex/.test(h) && h.includes(`rel="canonical" href="https://kuechenideenkompass.de${neuP}"`) && h.includes(`url=https://kuechenideenkompass.de${neuP}`), `Weiterleitung ${alt}`);
      pruef(!SITEMAP.includes(alt.slice(1)), `${alt} noch in der Sitemap`);
    }
    // 7) Druckansicht der Tabelle: Werkzeug sichtbar, Navigation weg
    page = await neu('/kerntemperatur/');
    await page.emulateMedia({ media: 'print' });
    pruef(await page.locator('#kt-tabelle').isVisible() && !(await page.locator('header.kopf').isVisible()) && !(await page.locator('#kt-link').isVisible()), `${breite}px Kern: Druckansicht`);
    await page.close();
    await ctx.close();
  }
} finally { await browser.close(); srv.close(); }
console.log(fehler.length ? `${fehler.length} FEHLER:\n` + fehler.join('\n') : 'Werkzeug-Browser-Tests bestanden.');
process.exit(fehler.length ? 1 : 0);
