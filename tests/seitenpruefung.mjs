// Seitenprüfung: Meta, Canonical, H1, Wortzahl, Links, Werbung, JSON-LD – Aufruf: node tests/seitenpruefung.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEITEN, WEITERLEITUNGEN, DOMAIN } from '../src/seiten.mjs';

const DOCS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const fehler = [];
const f = (s, m) => fehler.push(`${s || '/'}: ${m}`);
const text = (h) => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();
const woerter = (h) => text(h).split(' ').filter((w) => /[A-Za-zÄÖÜäöüß0-9]/.test(w)).length;

for (const s of SEITEN) {
  const datei = path.join(DOCS, s.slug, 'index.html');
  if (!fs.existsSync(datei)) { f(s.slug, 'Datei fehlt'); continue; }
  const h = fs.readFileSync(datei, 'utf8');
  if (!/<html lang="de">/.test(h)) f(s.slug, 'lang="de" fehlt');
  const t = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  if (t.length < 20 || t.length > 95) f(s.slug, `Title-Länge ${t.length}`);
  const d = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  if (d.length < 70 || d.length > 175) f(s.slug, `Description-Länge ${d.length}`);
  const c = (h.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
  if (c !== `${DOMAIN}/${s.slug ? s.slug + '/' : ''}`) f(s.slug, `Canonical falsch: ${c}`);
  const h1 = (h.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) f(s.slug, `${h1} H1`);
  if (!h.includes('<meta name="google-adsense-account" content="ca-pub-7811071715414905">')) f(s.slug, 'AdSense-Meta fehlt');
  if (!h.includes('einwilligung.js')) f(s.slug, 'Einwilligung fehlt');
  const artikel = (h.match(/<article class="artikel[^"]*">([\s\S]*?)<\/article>/) || [])[1] || '';
  const w = woerter(artikel);
  if (s.typ === 'ratgeber' && w < 900) f(s.slug, `Ratgeber nur ${w} Wörter`);
  if (s.typ === 'werkzeug' && w < 800) f(s.slug, `Werkzeug-Erklärteil nur ${w} Wörter`);
  if (['ratgeber', 'werkzeug'].includes(s.typ)) {
    if (!/<section class="quellen"/.test(artikel)) f(s.slug, 'Quellen fehlen');
    if (!/Stand: Oktober 2026/.test(h)) f(s.slug, 'Stand fehlt');
  }
  if (s.typ === 'ratgeber' && !/<section class="faq"/.test(artikel)) f(s.slug, 'FAQ fehlt');
  const werbung = /data-anzeige=/.test(h) || /anzeigen\.js/.test(h) || /adsbygoogle/.test(h);
  if (['pflicht', 'uebersicht', 'info'].includes(s.typ) && werbung) f(s.slug, 'Werbung auf Pflicht-/Übersichtsseite');
  if (['ratgeber', 'werkzeug'].includes(s.typ) && !werbung) f(s.slug, 'Werbeplätze fehlen');
  // Kopf-Anzeigenplatz erst nach H1 + Einleitung, auf Seiten mit Werkzeug nur breit
  const kopfPlatz = h.indexOf('data-anzeige="kopf"');
  if (kopfPlatz >= 0) {
    if (kopfPlatz < h.indexOf('<p class="einleitung"') || kopfPlatz < h.indexOf('<h1')) f(s.slug, 'Kopf-Anzeigenplatz vor H1/Einleitung');
    if (/<section class="werkzeug"/.test(h) && !/data-anzeige="kopf" data-nur-breit/.test(h)) f(s.slug, 'Kopfplatz über Werkzeugblock ohne data-nur-breit');
    if (s.typ === 'werkzeug') f(s.slug, 'Kopfplatz auf Werkzeugseite (direkt über dem Werkzeug)');
  }
  if (s.typ === 'pflicht' && !/<p class="stand">Stand: 2\. November 2026<\/p>/.test(h)) f(s.slug, 'Stand-Zeile der Pflichtseite');
  // Werbung nie im Werkzeugblock
  const werkzeug = (h.match(/<section class="werkzeug"[\s\S]*?<\/section>\s*(?=<div class="(raster-layout|)")/) || [''])[0];
  if (/data-anzeige/.test(werkzeug)) f(s.slug, 'Werbeplatz im Werkzeugblock');
  // JSON-LD
  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(m[1]);
      const typen = j['@graph'].map((x) => x['@type']);
      if (!typen.includes('BreadcrumbList')) f(s.slug, 'BreadcrumbList fehlt');
      if (typen.includes('FAQPage') && !/<section class="faq"/.test(h)) f(s.slug, 'FAQPage ohne sichtbare FAQ');
      if (/<section class="faq"/.test(h) && !typen.includes('FAQPage')) f(s.slug, 'FAQ ohne FAQPage');
    } catch (e) { f(s.slug, 'JSON-LD ungültig'); }
  }
  // interne Links
  for (const m of h.matchAll(/href="(\/[^"#?]*)/g)) {
    const ziel = m[1];
    const p = ziel.endsWith('/') ? path.join(DOCS, ziel, 'index.html') : path.join(DOCS, ziel);
    if (!fs.existsSync(p)) f(s.slug, `toter Link ${ziel}`);
  }
  for (const m of h.matchAll(/<script src="(\/[^"?]+)/g)) if (!fs.existsSync(path.join(DOCS, m[1]))) f(s.slug, `Skript fehlt ${m[1]}`);
  // keine fremden CDNs/Schriften
  if (/fonts\.googleapis|cdnjs|jsdelivr|unpkg/.test(h)) f(s.slug, 'fremdes CDN');
  if (/\b(Tel\.|Telefon|\+43)/.test(text(h))) f(s.slug, 'Telefonangabe gefunden');
  console.log(`${(s.slug || '/').padEnd(30)} ${s.typ.padEnd(10)} ${String(w).padStart(5)} Wörter  ${t.length} T / ${d.length} D`);
}
for (const [alt, neu] of WEITERLEITUNGEN) {
  const h = fs.readFileSync(path.join(DOCS, alt), 'utf8');
  if (!/noindex/.test(h) || !h.includes(`url=${DOMAIN}/${neu ? neu + '/' : ''}`) || !h.includes(`rel="canonical" href="${DOMAIN}/${neu ? neu + '/' : ''}"`)) f(alt, 'Weiterleitung fehlerhaft');
}
for (const d of ['CNAME', '.nojekyll', 'ads.txt', 'robots.txt', 'sitemap.xml', '404.html', 'assets/fonts/OFL-YoungSerif.txt', 'assets/fonts/OFL-Figtree.txt']) if (!fs.existsSync(path.join(DOCS, d))) f(d, 'fehlt');
if (fs.readFileSync(path.join(DOCS, 'ads.txt'), 'utf8').trim() !== 'google.com, pub-7811071715414905, DIRECT, f08c47fec0942fa0') f('ads.txt', 'Inhalt falsch');
if (fs.readFileSync(path.join(DOCS, 'CNAME'), 'utf8').trim() !== 'kuechenideenkompass.de') f('CNAME', 'Inhalt falsch');
const imp = fs.readFileSync(path.join(DOCS, 'impressum/index.html'), 'utf8');
for (const pflicht of ['AdStern', 'Seilerstätte 8', '1010 Wien', 'office@adstern.com', 'ATU54682507', 'Magistratisches Bezirksamt für den 1./8. Bezirk', 'Fachgruppe Werbung und Marktkommunikation', 'Werbeagentur', 'Gewerbeordnung', 'ris.bka.gv.at']) if (!imp.includes(pflicht)) f('impressum', `fehlt: ${pflicht}`);
const ds = fs.readFileSync(path.join(DOCS, 'datenschutz/index.html'), 'utf8');
for (const pflicht of ['GitHub Pages', 'Drittanbieter, einschließlich Google, verwenden Cookies', 'adssettings.google.com', 'youronlinechoices.com', 'aboutads.info', 'G-T00HRG2YVF', 'Barichgasse 40–42', 'localStorage']) if (!ds.includes(pflicht)) f('datenschutz', `fehlt: ${pflicht}`);
console.log(fehler.length ? `\n${fehler.length} FEHLER:\n` + fehler.join('\n') : '\nAlle Prüfungen bestanden.');
process.exit(fehler.length ? 1 : 0);
