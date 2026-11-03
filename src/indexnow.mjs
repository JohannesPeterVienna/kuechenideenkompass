// Meldet alle URLs der Live-Sitemap an IndexNow (Bing, Yandex u. a.) – Aufruf nach dem Deploy: node src/indexnow.mjs
// Liest die veröffentlichte Sitemap, damit nur tatsächlich live erreichbare Adressen gemeldet werden.
const HOST = 'kuechenideenkompass.de';
const KEY = (await import('node:fs')).readFileSync(new URL('./build.mjs', import.meta.url), 'utf8').match(/INDEXNOW_KEY = '([0-9a-f]{32})'/)[1];

const pruef = await fetch(`https://${HOST}/${KEY}.txt`);
if (!pruef.ok || (await pruef.text()).trim() !== KEY) { console.error('Schlüsseldatei ist noch nicht live – erst deployen.'); process.exit(1); }
const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => new URL(u).host === HOST);
const antwort = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList })
});
console.log(`IndexNow: ${urlList.length} URLs gemeldet, HTTP ${antwort.status}`);
if (![200, 202].includes(antwort.status)) process.exit(1);
