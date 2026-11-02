// Browser-Test mit Playwright: Überlauf, Konsole, Werkzeug-Funktion, Screenshots
// Aufruf: node tests/browser.mjs <ausgabeordner>   (erwartet Server auf http://127.0.0.1:8791)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('/opt/npm-tools/node_modules/playwright'); } catch { pw = require('playwright'); }
const AUS = process.argv[2] || '/tmp/screens';
const BASIS = 'http://127.0.0.1:8791';
const SEITEN = ['', 'rezept-umrechnen/', 'backform-umrechnen/', 'cups-in-gramm/', 'einkaufsliste/', 'kuechenwoerterbuch/', 'springform-umrechnen/', 'germ-umrechnen/', 'ofentemperatur-umrechnen/', 'impressum/', 'datenschutz/', 'dag-in-gramm/'];
const fehler = [];
async function geh(page, url) {
  for (let i = 0; i < 4; i++) {
    try { return await page.goto(url, { waitUntil: 'load' }); } catch (e) { if (i === 3) throw e; await page.waitForTimeout(400); }
  }
}
const browser = await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--no-proxy-server'] });
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
console.log(fehler.length ? fehler.join('\n') : 'Browser-Tests bestanden.');
process.exit(fehler.length ? 1 : 0);
