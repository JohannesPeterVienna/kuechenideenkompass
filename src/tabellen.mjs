// Tabellen, die direkt aus den Daten des Rechenkerns erzeugt werden –
// so stimmen Text und Werkzeug immer überein.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const D = require('../docs/assets/js/kueche-daten.js');
const K = require('../docs/assets/js/werkbank-kern.js');
const MEHL = require('../docs/assets/js/mehl-daten.js');
const EIER = require('../docs/assets/js/eier-daten.js');
const z = (x, s = 0) => K.deZahl(x, s);
const huelle = (cap, kopf, zeilen) => `<div class="tabelle-huelle"><table><caption>${cap}</caption><thead><tr>${kopf.map((k, i) => `<th scope="col"${i ? ' class="zahl"' : ''}>${k}</th>`).join('')}</tr></thead><tbody>${zeilen.map((r) => `<tr>${r.map((c, i) => (i ? `<td class="zahl">${c}</td>` : `<th scope="row">${c}</th>`)).join('')}</tr>`).join('')}</tbody></table></div>`;
const ka = `<a href="${D.QUELLEN.ka.url}" rel="noopener" target="_blank">King Arthur Ingredient Weight Chart</a>`;

const flaecheRund = (d) => Math.PI * (d / 2) ** 2;

export const TABELLEN = {
  'waage-tabelle': () => huelle(
    'Gewicht je Volumen – Werte nach King Arthur, umgerechnet auf Cup, EL und TL',
    ['Zutat', 'Originalwert', '1 Cup', '1 EL', '1 TL'],
    D.WAAGE.map((w) => [`${w.name}<br><small>${w.en}</small>`, `${w.volText} = ${w.g} g`, `${z(w.gProCup)} g`, `${z(w.gProCup / 16, 1)} g`, `${z(w.gProCup / 48, 1)} g`])
  ) + `<p class="stand">Quelle aller Gewichte: ${ka}, abgerufen im Oktober 2026. Cup, EL und TL nach US-Definition (1 Cup = 16 EL = 48 TL), Milliliter nach <a href="${D.QUELLEN.nist.url}" rel="noopener" target="_blank">NIST</a>. Werte für 1 EL und 1 TL sind aus dem Originalwert errechnet.</p>`,

  'loeffel-tabelle': () => huelle(
    'Gramm je Messlöffel (gestrichen)',
    ['Zutat', '1 EL (≈ 15 ml)', '1 TL (≈ 5 ml)', '½ TL'],
    D.WAAGE.filter((w) => !['reis', 'haselnuesse', 'rosinen', 'schokotropfen', 'walnuesse', 'haferflocken'].includes(w.id))
      .map((w) => [w.name, `${z(w.gProCup / 16, 1)} g`, `${z(w.gProCup / 48, 1)} g`, `${z(w.gProCup / 96, 1)} g`])
  ) + `<p class="stand">Berechnet aus dem ${ka} (abgerufen Oktober 2026); Löffelmaße nach US-Definition, Milliliter gerundet nach <a href="${D.QUELLEN.nist.url}" rel="noopener" target="_blank">NIST</a> (1 EL ≈ 14,79 ml, 1 TL ≈ 4,93 ml).</p>`,

  'springform-tabelle': () => {
    const basis = flaecheRund(26);
    const ds = [16, 18, 20, 22, 24, 26, 28, 30];
    return huelle('Springform-Faktoren bezogen auf Ø 26 cm (gleiche Teighöhe)',
      ['Durchmesser', 'Bodenfläche', 'Faktor', '200 g werden …', '4 Eier werden …'],
      ds.map((d) => { const f = flaecheRund(d) / basis; return [`Ø ${d} cm`, `${z(flaecheRund(d))} cm²`, z(f, 2), `${z(Math.round(200 * f / 5) * 5)} g`, `${z(4 * f, 1)} → ${Math.max(1, Math.round(4 * f))} Stück`]; }));
  },

  'springform-kreuz': () => {
    const ds = [20, 24, 26, 28];
    return huelle('Faktoren zwischen gängigen Springformen (Zeile = Rezept, Spalte = Ihre Form)',
      ['Rezept für', ...ds.map((d) => `Ø ${d}`)],
      ds.map((a) => [`Ø ${a} cm`, ...ds.map((b) => z((b * b) / (a * a), 2))]));
  },

  'eckig-tabelle': () => {
    const basis = flaecheRund(26);
    const formen = [['Quadratisch 20 × 20 cm', 400], ['Quadratisch 24 × 24 cm', 576], ['Rechteckig 20 × 30 cm', 600], ['Kastenform 30 × 11 cm (Boden)', 330], ['Backblech 40 × 30 cm', 1200]];
    return huelle('Eckige Formen im Vergleich zur Springform Ø 26 cm (Bodenfläche)',
      ['Form', 'Bodenfläche', 'Faktor ggü. Ø 26'],
      formen.map(([n, a]) => [n, `${z(a)} cm²`, z(a / basis, 2)]));
  },

  'ofen-tabelle': () => {
    const temps = [140, 150, 160, 170, 180, 190, 200, 220, 250];
    return huelle('Ober-/Unterhitze, Umluft und Fahrenheit',
      ['Ober-/Unterhitze', 'Umluft (≈ −20 °C)', 'Fahrenheit (exakt)', 'Fahrenheit (gerundet)'],
      temps.map((c) => [`${c} °C`, `${c - 20} °C`, `${z(K.cNachF(c), 0)} °F`, `${z(Math.round(K.cNachF(c) / 5) * 5)} °F`]));
  },

  'fahrenheit-tabelle': () => {
    const fs = [300, 325, 350, 375, 400, 425, 450];
    return huelle('Typische US-Backtemperaturen in Celsius',
      ['Fahrenheit', 'Celsius exakt', 'Celsius gerundet (O/U)', 'Umluft (≈ −20 °C)'],
      fs.map((f) => [`${f} °F`, `${z(K.fNachC(f), 1)} °C`, `${z(Math.round(K.fNachC(f) / 5) * 5)} °C`, `${z(Math.round(K.fNachC(f) / 5) * 5 - 20)} °C`]));
  },

  'dag-tabelle': () => {
    const werte = [1, 2.5, 5, 7, 10, 12, 14, 20, 25, 28, 30, 50, 100];
    return huelle('Dekagramm in Gramm und Kilogramm', ['dag', 'Gramm', 'Kilogramm'], werte.map((d) => [`${z(d, 1)} dag`, `${z(d * 10)} g`, `${z(d / 100, 3)} kg`]));
  },

  'liter-tabelle': () => {
    const werte = [[0.125, '⅛ l (Achterl)'], [0.25, '¼ l (Viertel)'], [0.375, '⅜ l'], [0.5, '½ l'], [0.75, '¾ l'], [1, '1 l']];
    return huelle('Österreichische Literangaben', ['Angabe', 'Milliliter', 'Deziliter'], werte.map(([l, n]) => [n, `${z(l * 1000)} ml`, `${z(l * 10, 2)} dl`]));
  },

  'cup-tabelle': () => {
    const ids = ['weizenmehl', 'zucker', 'braunerzucker', 'staubzucker', 'butter', 'milch', 'obers', 'oel', 'kakao', 'haferflocken'];
    const zeilen = ids.map((id) => D.WAAGE.find((w) => w.id === id)).map((w) => [w.name, `${z(w.gProCup)} g`, `${z(w.gProCup / 2)} g`, `${z(w.gProCup / 3)} g`, `${z(w.gProCup / 4)} g`]);
    return huelle('Cups in Gramm für die häufigsten Backzutaten', ['Zutat', '1 Cup', '½ Cup', '1/3 Cup', '¼ Cup'], zeilen) + `<p class="stand">Werte: ${ka}, Oktober 2026; Bruchteile errechnet.</p>`;
  },

  'regional-tabelle': () => huelle('Was die Werkbank automatisch übersetzt', ['Österreich', 'Deutschland', 'Schweiz', 'Beleg'],
    D.REGIONAL.filter((r) => !['Faschiertem', 'Erdapfel', 'Marille', 'Ribisel', 'Semmel'].includes(r.at)).map((r) => [r.at, r.de, r.ch, `<small>${r.beleg}</small>`])),

  'eier-tabelle': () => huelle('USA: Mindestgewicht je Dutzend und daraus je Ei – mit passender EU-Klasse', ['US-Größe', 'je Dutzend (Minimum)', 'je Ei im Schnitt (Minimum)', 'fällt in EU-Klasse'],
      EIER.US.map((k) => [k.name, `${k.ozDutzend} oz = ${z(k.ozDutzend * EIER.UNZE)} g`, `${z(k.minProEi, 1)} g`, EIER.euKlasseFuer(k.minProEi).name]))
    + `<p class="stand">Quelle: <a href="${EIER.QUELLEN.usda.url}" rel="noopener" target="_blank">USDA AMS, Minimum Net Weight for Various Egg Containers</a>; 1 oz = 28,35 g. EU-Klassen nach <a href="${EIER.QUELLEN.eu.url}" rel="noopener" target="_blank">VO (EU) 2023/2465, Art. 5</a>.</p>`,

  'mehl-tabelle': () => ['weizen', 'roggen'].map((korn) => {
    const reihen = MEHL.SORTEN.filter((s) => s.korn === korn).sort((a, b) => a.max - b.max);
    const quelle = (s) => `<a href="${MEHL.QUELLEN[s.q].url}" rel="noopener" target="_blank">${s.q === 'ak' ? 'ÖLMB B 20 / AK' : s.q === 'din' ? 'DIN 10355' : 'VLpH Art. 63'}</a>`;
    return huelle(`${korn === 'weizen' ? 'Weizen' : 'Roggen'}: Mineralstoffgehalt in % der Trockenmasse, nach Bereich sortiert`, ['Sorte', 'Land', 'Bereich', 'Quelle'],
      reihen.map((s) => [s.name, MEHL.LAENDER[s.land], MEHL.bereichText(s), quelle(s)]));
  }).join(''),

  'germ-tabelle': () => {
    const mehl = [250, 500, 750, 1000, 1500];
    return huelle('Germ je Mehlmenge nach Dr.-Oetker-Angaben (Österreich)', ['Mehl', 'Frischgerm', 'Würfel (42 g)', 'Trockengerm', 'Päckchen (7 g)'],
      mehl.map((m) => [`${z(m)} g`, `${z(m / 1000 * 42, 1)} g`, z(m / 1000, 2), `${z(m / 500 * 7, 1)} g`, z(m / 500, 2)]));
  },

  'backpulver-tabelle': () => {
    const mehl = [125, 250, 375, 500, 750, 1000];
    return huelle('Backpulver je Mehlmenge (1 Päckchen ≈ 16 g für 500 g Mehl)', ['Mehl', 'Päckchen', 'Gramm', 'gestrichene TL (≈ 4 g)'],
      mehl.map((m) => [`${z(m)} g`, z(m / 500, 2), `${z(m / 500 * 16, 1)} g`, z(m / 500 * 16 / 4, 1)]));
  },

  'gaeste-tabelle': () => {
    const f = [[4, 8], [4, 12], [4, 20], [6, 20], [4, 30]];
    return huelle('Faktor, Geschirr und Bratfläche', ['Von → nach', 'Faktor', 'Topf-/Pfannen-Ø: 24 cm wird …', 'Bratdurchgänge in der Originalpfanne'],
      f.map(([a, b]) => { const k = b / a; return [`${a} → ${b} Portionen`, z(k, 2), `${z(24 * Math.sqrt(k))} cm`, `${Math.ceil(k)}`]; }));
  }
};
