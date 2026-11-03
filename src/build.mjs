// Baut die statische Website nach docs/ – Aufruf: node src/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { SEITEN, WEITERLEITUNGEN, DOMAIN } from './seiten.mjs';
import { TABELLEN } from './tabellen.mjs';
import { woerterbuchHtml, WOERTER } from './woerterbuch.mjs';
TABELLEN['woerterbuch'] = woerterbuchHtml;
TABELLEN['woerter-anzahl'] = () => String(WOERTER.length);

const require = createRequire(import.meta.url);
const HIER = path.dirname(fileURLToPath(import.meta.url));
const WURZEL = path.resolve(HIER, '..');
const DOCS = path.join(WURZEL, 'docs');
const VERSION = '20261103a';
export const INDEXNOW_KEY = '4f32b38e7905cc7a450953a78778a3f6';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const url = (slug) => `${DOMAIN}/${slug ? slug + '/' : ''}`;
const href = (slug) => `/${slug ? slug + '/' : ''}`;
const nurText = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const ankerId = (t) => nurText(t).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

const LOGO = `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle cx="24" cy="24" r="21" fill="#1F3328" stroke="#E9B53C" stroke-width="3"/><g stroke="#F3F5EF" stroke-width="2" stroke-linecap="round"><path d="M24 7v4M24 37v4M7 24h4M37 24h4"/><path d="M12 12l2.5 2.5M33.5 33.5L36 36M36 12l-2.5 2.5M14.5 33.5L12 36" stroke-width="1.4"/></g><path d="M24 24L33 13" stroke="#B4441E" stroke-width="3.2" stroke-linecap="round"/><circle cx="24" cy="24" r="3.2" fill="#E9B53C"/></svg>`;

const NAV = [
  ['rezept-umrechnen', 'Werkbank'],
  ['backform-umrechnen', 'Backform'],
  ['cups-in-gramm', 'Zutaten-Waage'],
  ['kuechenwoerterbuch', 'Wörterbuch'],
  ['einkaufsliste', 'Einkaufsliste'],
  ['', 'Ratgeber', '#ratgeber']
];

function kopf(seite) {
  const nav = NAV.map(([slug, name, anker]) => {
    const aktiv = slug === seite.slug && !anker ? ' aria-current="page"' : '';
    return `<li><a href="${href(slug)}${anker || ''}"${aktiv}>${name}</a></li>`;
  }).join('');
  return `<a class="uebersprung" href="#inhalt">Zum Inhalt springen</a>
<header class="kopf"><div class="kopf-innen">
<a class="marke" href="/" aria-label="Küchenideenkompass – Startseite">${LOGO}<span class="marke-text">Küchenideenkompass<small>Rezept-Werkbank AT · DE · CH</small></span></a>
<nav class="nav nav-breit" aria-label="Hauptnavigation"><ul>${nav}</ul></nav>
<details class="menue"><summary>☰ Menü</summary><nav class="nav" aria-label="Hauptnavigation mobil"><ul>${nav}</ul></nav></details>
</div></header>`;
}

function fuss() {
  const werkzeuge = SEITEN.filter((s) => s.typ === 'werkzeug').map((s) => `<li><a href="${href(s.slug)}">${esc(s.kurz)}</a></li>`).join('');
  const ratgeber = SEITEN.filter((s) => s.typ === 'ratgeber').map((s) => `<li><a href="${href(s.slug)}">${esc(s.kurz)}</a></li>`).join('');
  return `<footer class="fuss"><div class="rahmen"><div class="fuss-raster">
<div><h2>Werkzeuge</h2><ul>${werkzeuge}</ul></div>
<div><h2>Ratgeber</h2><ul>${ratgeber}</ul></div>
<div><h2>Projekt</h2><ul><li><a href="/so-rechnet-die-werkbank/">So rechnet die Werkbank</a></li><li><a href="/ueber-uns/">Über uns</a></li><li><a href="/kontakt/">Kontakt</a></li><li><a href="/impressum/">Impressum</a></li><li><a href="/datenschutz/">Datenschutz</a></li><li><button type="button" class="link-knopf" data-datenschutz-einstellungen>Datenschutz-Einstellungen</button></li></ul></div>
</div>
<p class="klein">© 2026 AdStern, Wien · Alle Rechenwerte mit Quellenangabe, Stand: Oktober 2026 · Rezepte und Listen bleiben in Ihrem Browser.</p>
</div></footer>`;
}

function jsonLd(seite, faq, howto) {
  const graph = [];
  const krumen = [{ '@type': 'ListItem', position: 1, name: 'Startseite', item: url('') }];
  if (seite.slug) krumen.push({ '@type': 'ListItem', position: 2, name: seite.kurz, item: url(seite.slug) });
  graph.push({ '@type': 'BreadcrumbList', itemListElement: krumen });
  if (faq.length) graph.push({ '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
  if (howto.length) graph.push({ '@type': 'HowTo', name: seite.howto, step: howto.map(([n, t], i) => ({ '@type': 'HowToStep', position: i + 1, name: n, text: t })) });
  if (seite.typ === 'werkzeug') graph.push({ '@type': 'WebApplication', name: seite.kurz, url: url(seite.slug), applicationCategory: 'UtilitiesApplication', operatingSystem: 'Browser', inLanguage: 'de', offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' } });
  if (!seite.slug) graph.push({ '@type': 'WebSite', name: 'Küchenideenkompass', url: url(''), inLanguage: 'de' });
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
}

function seiteBauen(seite) {
  let roh = fs.readFileSync(path.join(HIER, 'content', (seite.slug || 'start') + '.html'), 'utf8');
  roh = roh.replace(/\{\{([a-z-]+)\}\}/g, (_, k) => { if (!TABELLEN[k]) throw new Error('Tabelle fehlt: ' + k); return TABELLEN[k](); });
  const teile = roh.split('<!--@artikel-->');
  const werkzeug = teile.length > 1 ? teile[0].replace('<!--@werkzeug-->', '').trim() : '';
  let artikel = (teile.length > 1 ? teile[1] : teile[0]).trim();

  // Überschriften verankern, Inhaltsverzeichnis
  const toc = [];
  artikel = artikel.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/g, (all, attr, inner) => {
    const id = (attr && (attr.match(/id="([^"]+)"/) || [])[1]) || ankerId(inner);
    toc.push([id, nurText(inner)]);
    return `<h2 id="${id}">${inner}</h2>`;
  });
  // FAQ und HowTo auslesen (nur sichtbare Inhalte)
  const faq = [];
  const faqTeil = artikel.match(/<section class="faq"[\s\S]*?<\/section>/);
  if (faqTeil) for (const m of faqTeil[0].matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)) faq.push([nurText(m[1]), nurText(m[2])]);
  const howto = [];
  const howTeil = (werkzeug + artikel).match(/<ol class="howto">([\s\S]*?)<\/ol>/);
  if (seite.howto && howTeil) for (const m of howTeil[1].matchAll(/<li><b>([\s\S]*?)<\/b>([\s\S]*?)<\/li>/g)) howto.push([nurText(m[1]).replace(/[.:]$/, ''), nurText(m[2])]);

  const werbung = seite.typ === 'werkzeug' || seite.typ === 'ratgeber';
  const woerter = nurText(artikel).split(' ').filter((w) => /[A-Za-zÄÖÜäöüß0-9]/.test(w)).length;
  // In-Article-Platz nach dem 3. Absatz langer Ratgeber
  if (werbung && seite.typ === 'ratgeber' && woerter >= 900) {
    let n = 0;
    artikel = artikel.replace(/<\/p>/g, (m) => (++n === 3 ? m + '\n<div class="anzeige" data-anzeige="artikel" hidden></div>' : m));
  }

  const mitSeitenleiste = werbung || toc.length >= 4;
  const seitenleiste = mitSeitenleiste ? `<aside class="seitenleiste" aria-label="Seitenleiste">${toc.length >= 3 ? `<nav class="inhalt-liste" aria-label="Auf dieser Seite"><h2>Auf dieser Seite</h2><ol>${toc.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}</ol></nav>` : ''}${werbung ? '<div class="anzeige" data-anzeige="seite" hidden></div>' : ''}</aside>` : '';

  const krumen = seite.slug ? `<nav class="brotkrumen" aria-label="Brotkrumen"><ol><li><a href="/">Startseite</a></li><li aria-current="page">${esc(seite.kurz)}</li></ol></nav>` : '';
  const skripte = (seite.skripte || []).map((s) => `<script src="/assets/js/${s}?v=${VERSION}" defer></script>`).join('\n');
  const robots = seite.noindex ? '<meta name="robots" content="noindex, follow">' : '<meta name="robots" content="index, follow, max-image-preview:large">';
  const kopfZeile = seite.slug ? `${krumen}<h1>${esc(seite.h1)}</h1><p class="einleitung">${seite.einleitung}</p><p class="stand">${seite.typ === 'pflicht' ? 'Stand: 2. November 2026' : `Stand: Oktober 2026 · ${seite.typ === 'werkzeug' ? 'Werkzeug läuft vollständig in Ihrem Browser' : 'Werte mit Quellenangabe'}`}</p>` : '';
  // Kopf-Anzeigenplatz erst nach H1 + Einleitung. Werkzeugseiten: kein Kopfplatz – das Werkzeug beginnt dort
  // weniger als 150 px darunter (erster Platz kommt nach dem Erklärtext). Ratgeber mit Werkzeugblock: nur ab 768 px.
  const kopfAnzeige = werbung && seite.typ !== 'werkzeug' ? `<div class="anzeige" data-anzeige="kopf"${werkzeug ? ' data-nur-breit' : ''} hidden></div>` : '';

  const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(seite.titel)}</title>
<meta name="description" content="${esc(seite.beschreibung)}">
<link rel="canonical" href="${url(seite.slug)}">
${robots}
<meta name="google-adsense-account" content="ca-pub-7811071715414905">
<meta property="og:type" content="website">
<meta property="og:locale" content="de_AT">
<meta property="og:site_name" content="Küchenideenkompass">
<meta property="og:title" content="${esc(seite.titel)}">
<meta property="og:description" content="${esc(seite.beschreibung)}">
<meta property="og:url" content="${url(seite.slug)}">
<meta name="theme-color" content="#2E4A3A">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/figtree-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/werkbank.css?v=${VERSION}">
${jsonLd(seite, faq, howto)}
<script src="/assets/js/einwilligung.js?v=${VERSION}" defer></script>
${werbung ? `<script src="/assets/js/anzeigen.js?v=${VERSION}" defer></script>` : ''}
${skripte}
</head>
<body data-werbung="${werbung ? 'ja' : 'nein'}" data-seitentyp="${seite.typ}">
${kopf(seite)}
<main id="inhalt" class="rahmen">
${kopfZeile}
${kopfAnzeige}
${werkzeug}
<div class="${mitSeitenleiste ? 'raster-layout' : ''}">
<article class="artikel${seite.typ === 'werkzeug' ? ' erklaerung' : ''}">
${artikel}
</article>
${seitenleiste}
</div>
</main>
${fuss()}
</body>
</html>
`;
  const ziel = path.join(DOCS, seite.slug, 'index.html');
  fs.mkdirSync(path.dirname(ziel), { recursive: true });
  fs.writeFileSync(ziel, html);
  return { slug: seite.slug, woerter, typ: seite.typ };
}

function weiterleitung(alt, neu) {
  const ziel = url(neu);
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Weitergeleitet – Küchenideenkompass</title>
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="${ziel}">
<meta http-equiv="refresh" content="0; url=${ziel}">
<meta name="google-adsense-account" content="ca-pub-7811071715414905">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{font-family:system-ui,sans-serif;background:#F3F5EF;color:#1C2A22;margin:0;padding:3rem 16px}a{color:#93361A}</style>
</head>
<body><p>Diese Seite ist umgezogen: <a href="${ziel}">${esc(ziel)}</a></p></body>
</html>
`;
}

// --- Bauen ---
const ergebnis = SEITEN.map(seiteBauen);
for (const [alt, neu] of WEITERLEITUNGEN) {
  const datei = path.join(DOCS, alt);
  fs.mkdirSync(path.dirname(datei), { recursive: true });
  fs.writeFileSync(datei, weiterleitung(alt, neu));
}
const heute = '2026-10-31';
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SEITEN.filter((s) => !s.noindex).map((s) => `  <url><loc>${url(s.slug)}</loc><lastmod>${heute}</lastmod></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(DOCS, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(DOCS, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${DOMAIN}/sitemap.xml\n`);
fs.writeFileSync(path.join(DOCS, 'ads.txt'), 'google.com, pub-7811071715414905, DIRECT, f08c47fec0942fa0\n');
fs.writeFileSync(path.join(DOCS, 'CNAME'), 'kuechenideenkompass.de');
// IndexNow-Schlüssel (öffentlich, Bing/Yandex u. a.) – Meldung neuer URLs: node src/indexnow.mjs
fs.writeFileSync(path.join(DOCS, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY);
fs.writeFileSync(path.join(DOCS, '.nojekyll'), '');
fs.writeFileSync(path.join(DOCS, 'favicon.svg'), LOGO.replace('aria-hidden="true" focusable="false"', 'xmlns="http://www.w3.org/2000/svg"'));

// 404
const s404 = fs.readFileSync(path.join(DOCS, 'index.html'), 'utf8');
const start404 = s404.indexOf('<main'), ende404 = s404.indexOf('</main>') + 7;
const seite404 = s404.slice(0, start404) + `<main id="inhalt" class="rahmen"><h1>Diese Seite gibt es nicht (mehr)</h1><p class="einleitung">Vielleicht hilft eines der Werkzeuge weiter:</p><div class="karten">${SEITEN.filter((s) => s.typ === 'werkzeug').map((s) => `<a class="karte werk" href="${href(s.slug)}"><b>${esc(s.kurz)}</b><span>${esc(s.beschreibung)}</span></a>`).join('')}</div></main>` + s404.slice(ende404);
fs.writeFileSync(path.join(DOCS, '404.html'), seite404.replace(/<title>[^<]*<\/title>/, '<title>Seite nicht gefunden – Küchenideenkompass</title>').replace(/<link rel="canonical"[^>]*>\n/, '').replace(/<meta name="robots"[^>]*>/, '<meta name="robots" content="noindex">').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n/, ''));

console.log(ergebnis.map((e) => `${(e.slug || '/').padEnd(30)} ${e.typ.padEnd(10)} ${e.woerter} Wörter`).join('\n'));
