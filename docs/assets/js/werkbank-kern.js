/*
 * Küchenideenkompass – Rechenkern der Rezept-Werkbank
 * Parser, Skalierung, Einheiten, Regionalsprache, Backformen, Einkaufsliste.
 * Keine Abhängigkeiten. Browser: window.KIK.kern · Node: require().
 */
(function (root, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik(require('./kueche-daten.js'));
  else { root.KIK = root.KIK || {}; root.KIK.kern = fabrik(root.KIK.daten); }
})(typeof self !== 'undefined' ? self : this, function (D) {
  'use strict';

  /* ---------- Zahlen ---------- */
  var BRUCH_ZEICHEN = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 1 / 6, '⅚': 5 / 6, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };
  var BZ = '½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞';
  // eine Zahl: "1 1/2", "1½", "1 ½", "1/2", "1,5", "1.5", "½", "12"
  var ZAHL = '(?:\\d+\\s+\\d+\\s*\\/\\s*\\d+|\\d+\\s*\\/\\s*\\d+|\\d+\\s*[' + BZ + ']|\\d+(?:[.,]\\d+)?|[' + BZ + '])';
  var SPANNE = new RegExp('^(?:ca\\.?|circa|etwa|ungefähr|rund|~)?\\s*(' + ZAHL + ')(?:\\s*(?:-|–|—|bis)\\s*(' + ZAHL + '))?');

  function zahlLesen(t) {
    t = String(t).trim();
    var m;
    if ((m = t.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/))) return +m[1] + (+m[2]) / (+m[3]);
    if ((m = t.match(/^(\d+)\s*\/\s*(\d+)$/))) return (+m[1]) / (+m[2]);
    if ((m = t.match(new RegExp('^(\\d+)\\s*([' + BZ + '])$')))) return +m[1] + BRUCH_ZEICHEN[m[2]];
    if (BRUCH_ZEICHEN[t] !== undefined) return BRUCH_ZEICHEN[t];
    if (/^\d+[.,]\d+$/.test(t)) return parseFloat(t.replace(',', '.'));
    if (/^\d+$/.test(t)) return parseInt(t, 10);
    return NaN;
  }

  /* ---------- Einheiten ---------- */
  // art: masse (g), volumen (ml), stueck, sonst
  var EINHEITEN = [
    { k: 'mg', art: 'masse', f: 0.001, a: ['mg', 'milligramm'], e: 'mg' },
    { k: 'kg', art: 'masse', f: 1000, a: ['kg', 'kilo', 'kilogramm'], e: 'kg' },
    { k: 'dag', art: 'masse', f: 10, a: ['dag', 'dkg', 'deka', 'dekagramm', 'dekagr'], e: 'dag' },
    { k: 'g', art: 'masse', f: 1, a: ['g', 'gr', 'gramm'], e: 'g' },
    { k: 'oz', art: 'masse', f: 28.35, a: ['oz', 'ounce', 'ounces', 'unze', 'unzen'], e: 'oz', us: true },
    { k: 'lb', art: 'masse', f: 453.59, a: ['lb', 'lbs', 'pound', 'pounds'], e: 'lb', us: true },
    { k: 'ml', art: 'volumen', f: 1, a: ['ml', 'milliliter'], e: 'ml' },
    { k: 'cl', art: 'volumen', f: 10, a: ['cl', 'zentiliter'], e: 'cl' },
    { k: 'dl', art: 'volumen', f: 100, a: ['dl', 'deziliter'], e: 'dl' },
    { k: 'l', art: 'volumen', f: 1000, a: ['l', 'liter', 'ltr'], e: 'l' },
    { k: 'achterl', art: 'volumen', f: 125, a: ['achterl', 'achtel'], e: 'Achterl' },
    { k: 'cup', art: 'volumen', f: D.US_ML.cup, a: ['cup', 'cups', 'c'], e: 'Cup', ep: 'Cups', us: true },
    { k: 'tasse', art: 'volumen', f: D.US_ML.cup, a: ['tasse', 'tassen'], e: 'Tasse', ep: 'Tassen', annahme: true },
    { k: 'floz', art: 'volumen', f: D.US_ML.floz, a: ['fl oz', 'fl. oz.', 'fl.oz.', 'floz'], e: 'fl oz', us: true },
    { k: 'el', art: 'volumen', f: D.US_ML.el, a: ['el', 'essl', 'esslöffel', 'eßlöffel', 'tbsp', 'tbs', 'tbsp.'], e: 'EL', loeffel: true },
    { k: 'tl', art: 'volumen', f: D.US_ML.tl, a: ['tl', 'teel', 'teelöffel', 'kl', 'kaffeelöffel', 'tsp'], e: 'TL', loeffel: true },
    { k: 'stick', art: 'stueck', a: ['stick', 'sticks'], e: 'Stick', ep: 'Sticks', us: true },
    { k: 'pkg', art: 'stueck', a: ['pkg', 'pck', 'pkt', 'pk', 'päckchen', 'packung', 'packungen', 'pkgs', 'btl', 'beutel', 'sackerl'], e: 'Pkg.', p: true },
    { k: 'wuerfel', art: 'stueck', a: ['würfel'], e: 'Würfel' },
    { k: 'prise', art: 'sonst', a: ['prise', 'prisen'], e: 'Prise', ep: 'Prisen', klein: true },
    { k: 'msp', art: 'sonst', a: ['msp', 'messerspitze', 'messerspitzen'], e: 'Msp.', klein: true },
    { k: 'stk', art: 'stueck', a: ['stk', 'stück'], e: 'Stück' },
    { k: 'zehe', art: 'stueck', a: ['zehe', 'zehen'], e: 'Zehe', ep: 'Zehen' },
    { k: 'scheibe', art: 'stueck', a: ['scheibe', 'scheiben'], e: 'Scheibe', ep: 'Scheiben' },
    { k: 'blatt', art: 'stueck', a: ['blatt', 'blätter'], e: 'Blatt', ep: 'Blatt' },
    { k: 'bund', art: 'stueck', a: ['bund', 'bd'], e: 'Bund' },
    { k: 'dose', art: 'stueck', a: ['dose', 'dosen'], e: 'Dose', ep: 'Dosen' },
    { k: 'becher', art: 'stueck', a: ['becher'], e: 'Becher' },
    { k: 'glas', art: 'stueck', a: ['glas', 'gläser'], e: 'Glas', ep: 'Gläser' },
    { k: 'zweig', art: 'stueck', a: ['zweig', 'zweige'], e: 'Zweig', ep: 'Zweige' },
    { k: 'stange', art: 'stueck', a: ['stange', 'stangen'], e: 'Stange', ep: 'Stangen' },
    { k: 'kopf', art: 'stueck', a: ['kopf', 'köpfe'], e: 'Kopf', ep: 'Köpfe' },
    { k: 'handvoll', art: 'stueck', a: ['handvoll', 'hand voll'], e: 'Handvoll' },
    { k: 'schuss', art: 'sonst', a: ['schuss', 'spritzer'], e: 'Schuss', klein: true }
  ];
  var ALIAS = {};
  EINHEITEN.forEach(function (u) { u.a.forEach(function (a) { ALIAS[a] = u; }); });
  var EINHEIT_NACH_K = {};
  EINHEITEN.forEach(function (u) { EINHEIT_NACH_K[u.k] = u; });
  var ALIAS_LISTE = Object.keys(ALIAS).sort(function (a, b) { return b.length - a.length; });
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  var EINHEIT_RE = new RegExp('^(' + ALIAS_LISTE.map(esc).join('|') + ')\\.?', 'i');

  /* ---------- Zutatenklassen ---------- */
  function klasseVon(name) {
    var n = ' ' + name.toLowerCase().replace(/[(),;:]/g, ' ') + ' ';
    if (/\s(eier|ei|eidotter|dotter|eigelb|eigelbe|eiklar|eiweiß|eiweiss|eiweiße|vollei)\s/.test(n)) {
      if (/\s(eidotter|dotter|eigelb|eigelbe)\s/.test(n)) return 'dotter';
      if (/\s(eiklar|eiweiß|eiweiss|eiweiße)\s/.test(n)) return 'eiklar';
      return 'ei';
    }
    if (/(trockenhefe|trockengerm|trockenbackhefe|instanthefe|instant yeast)/.test(n)) return 'trockenhefe';
    if (/\s(germ|hefe|frischhefe|frischgerm|yeast)\s/.test(n)) return 'frischhefe';
    if (/backpulver|baking powder|weinsteinbackpulver/.test(n)) return 'backpulver';
    if (/natron|baking soda|hirschhornsalz|pottasche/.test(n)) return 'natron';
    if (/\s(salz|meersalz|speisesalz|pfeffer|muskat|muskatnuss|zimt|chili|chiliflocken|cayennepfeffer|paprikapulver|kümmel|curry|currypulver|kreuzkümmel|nelken|piment|kardamom|ingwerpulver|knoblauchpulver|majoran|oregano|gewürz|gewürze|salt|pepper)\s/.test(n) || /gewürz/.test(n)) return 'gewuerz';
    if (/mehl|flour/.test(n) && !/paniermehl|mandelmehl|almond flour|kokosmehl|coconut flour|nussmehl/.test(n)) return 'mehl';
    return 'normal';
  }

  /* ---------- Zeile lesen ---------- */
  function zeileLesen(roh) {
    var z = { roh: roh, menge: null, bis: null, einheit: null, name: '', ueberschrift: false, leer: false };
    var t = String(roh).replace(/\t/g, ' ').replace(/ /g, ' ').trim();
    t = t.replace(/^[-–—•*·▪◦]\s*/, '');
    // Listennummern: "1. ", "1) ", "(1) ", "a) ", "b. " – vor der Mengenerkennung entfernen
    var lm = t.match(/^(?:\(\s*(?:\d{1,2}|[a-z])\s*\)|\d{1,2}\s*[.)]|[a-z]\))\s+(?=\S)/i);
    if (lm) { t = t.slice(lm[0].length); z.listenNr = lm[0].trim(); }
    if (!t) { z.leer = true; return z; }
    if (/:$/.test(t) && !/^[\d½⅓⅔¼¾⅛⅜⅝⅞]/.test(t)) { z.ueberschrift = true; z.name = t.replace(/:$/, ''); return z; }
    var m = t.match(SPANNE);
    var rest = t;
    if (m && m[0].trim()) {
      var a = zahlLesen(m[1].replace(/\s+/g, ' '));
      if (!isNaN(a)) {
        z.menge = a;
        if (m[2]) { var b = zahlLesen(m[2]); if (!isNaN(b) && b > a) z.bis = b; }
        z.ca = /^(ca|circa|etwa|ungefähr|rund|~)/i.test(t);
        rest = t.slice(m[0].length);
      }
    }
    rest = rest.replace(/^\s+/, '');
    if (z.menge !== null) {
      var e = rest.match(EINHEIT_RE);
      if (e) {
        var al = e[1].toLowerCase();
        var unit = ALIAS[al];
        // "c" nur als Einheit, wenn kein Wort folgt das mit c beginnt
        var nach = rest.slice(e[0].length);
        var ganzesWort = /^[\s.,;:()]|^$/.test(nach);
        if (unit && ganzesWort) {
          z.einheit = unit.k;
          z.einheitText = e[1];
          rest = nach.replace(/^\.?\s*/, '');
        }
      }
    } else {
      // "Salz", "etwas Zimt", "Salz, Pfeffer" – ohne Menge
      var p = rest.match(/^(eine?\s+)?(prise|msp\.?|messerspitze|schuss|spritzer)\s+/i);
      if (p) { z.menge = 1; z.einheit = ALIAS[p[2].toLowerCase().replace('.', '')].k; rest = rest.slice(p[0].length); }
    }
    rest = rest.replace(/^(von|of)\s+/i, '');
    z.name = rest.trim();
    // unsicher gelesen: zweite Zahl direkt nach der Menge ("1 250 g Mehl") oder Listennummer ohne folgende Menge
    if (z.menge !== null && !z.einheit && /^\d/.test(z.name)) z.unsicher = 'Zwei Zahlen am Zeilenanfang – Menge bitte prüfen.';
    else if (z.listenNr && z.menge === null) z.unsicher = 'Listennummer „' + z.listenNr + '“ entfernt, keine Menge erkannt – bitte prüfen.';
    z.klasse = klasseVon(z.name || '');
    return z;
  }

  function rezeptLesen(text) {
    return String(text || '').split(/\r?\n/).map(zeileLesen).filter(function (z) { return !z.leer; });
  }

  /* ---------- Formatierung ---------- */
  function deZahl(x, stellen) {
    var s = (Math.round(x * Math.pow(10, stellen)) / Math.pow(10, stellen)).toFixed(stellen);
    if (s.indexOf('.') >= 0) s = s.replace(/\.?0+$/, '');
    return s.replace('.', ',');
  }
  var BRUCH_AUS = [[0, ''], [0.125, '⅛'], [0.25, '¼'], [1 / 3, '1/3'], [0.375, '⅜'], [0.5, '½'], [0.625, '⅝'], [2 / 3, '2/3'], [0.75, '¾'], [0.875, '⅞'], [1, '']];
  function alsBruch(x, schritte) {
    // schritte: erlaubte Nenner, z. B. [2,4] oder [2,3,4,8]
    var ganz = Math.floor(x + 1e-9);
    var r = x - ganz;
    var best = null;
    BRUCH_AUS.forEach(function (b) {
      var nenner = { 0: 1, 0.125: 8, 0.25: 4, 0.375: 8, 0.5: 2, 0.625: 8, 0.75: 4, 0.875: 8, 1: 1 }[b[0]] || 3;
      if (schritte.indexOf(nenner) < 0 && nenner !== 1) return;
      var d = Math.abs(r - b[0]);
      if (!best || d < best.d) best = { d: d, b: b };
    });
    var g = ganz + (best.b[0] === 1 ? 1 : 0);
    var txt = best.b[0] === 1 || best.b[0] === 0 ? String(g) : (g ? g + ' ' : '') + best.b[1];
    var wert = g + (best.b[0] === 1 ? 0 : best.b[0]);
    if (wert === 0 && x > 0) return { text: '< ' + (schritte.indexOf(8) >= 0 ? '⅛' : '¼'), wert: x, gerundet: true };
    return { text: txt, wert: wert, gerundet: Math.abs(wert - x) > 1e-6 };
  }

  // rundet eine Menge "küchentauglich" je Einheit
  function mengeRunden(x, einheit) {
    var u = EINHEIT_NACH_K[einheit] || null;
    if (x <= 0) return { text: '0', wert: 0, gerundet: false };
    if (!u) {
      var b0 = alsBruch(x, [2, 4]);
      if (x >= 10) return mit(Math.round(x));
      return b0;
    }
    if (u.k === 'g' || u.k === 'ml') {
      if (x < 10) return mit(Math.round(x * 2) / 2, 1);
      if (x < 100) return mit(Math.round(x));
      if (x < 1000) return mit(Math.round(x / 5) * 5);
      return mit(Math.round(x / 10) * 10);
    }
    if (u.k === 'kg' || u.k === 'l') return mit(Math.round(x * 100) / 100, 2);
    if (u.k === 'dag') return x >= 10 ? mit(Math.round(x)) : mit(Math.round(x * 2) / 2, 1);
    if (u.k === 'dl' || u.k === 'cl') return mit(Math.round(x * 10) / 10, 1);
    if (u.k === 'mg') return mit(Math.round(x));
    if (u.loeffel) return alsBruch(x, [2, 4]);
    if (u.k === 'cup' || u.k === 'tasse') return alsBruch(x, [2, 3, 4, 8]);
    if (u.k === 'oz' || u.k === 'lb' || u.k === 'floz') return mit(Math.round(x * 4) / 4, 2);
    return alsBruch(x, [2, 4]);
    function mit(w, st) { return { text: deZahl(w, st || 0), wert: w, gerundet: Math.abs(w - x) > 1e-6 }; }
  }

  function einheitText(k, wert) {
    var u = EINHEIT_NACH_K[k];
    if (!u) return '';
    return wert > 1 && u.ep ? u.ep : u.e;
  }

  /* ---------- Waage ---------- */
  // Zutat zuordnen: nur ganze Wörter, längste Übereinstimmung zuerst. Steht vor dem
  // Treffer ein Wort, das die Zutat verändert ("peanut butter", "coconut flour"),
  // gibt es keinen Treffer – nie stillschweigend den Grundbegriff verwenden.
  var NEUTRAL = ('unsalted salted softened melted cold chilled room-temperature warm granulated white plain all-purpose ' +
    'sifted unsifted packed firmly lightly light dark heavy whipping fresh whole full-fat low-fat natural creamy smooth crunchy ' +
    'unsweetened sweetened large extra fine superfine regular cups cup tbsp tsp ' +
    'chopped rolled old-fashioned quick-cooking quick ' +
    'weiche geschmolzene zerlassene flüssige kalte kalter kaltes warme handwarme zimmerwarme ' +
    'glattes griffiges universal feines feiner grobes grober gesiebtes weißer weisser weißes heller helles frische frischer ' +
    'gesalzene ungesalzene ungesüßtes ungesüßter fein grob braun weiß gekühlte gekühlter gehackte gemahlene ganze etwas ' +
    'teelöffel esslöffel tl el g ml').split(' ');
  function woerter(t) {
    return t.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/['’]/g, '').split(/[^a-zäöüß-]+/).filter(Boolean);
  }
  var WAAGE_MUSTER = [];
  D.WAAGE.forEach(function (z) { z.muster.forEach(function (m) { WAAGE_MUSTER.push({ z: z, w: woerter(m) }); }); });
  (D.OHNE_WERT || []).forEach(function (m) { WAAGE_MUSTER.push({ z: null, w: woerter(m) }); });
  WAAGE_MUSTER.sort(function (a, b) { return b.w.join(' ').length - a.w.join(' ').length; });
  function waageFinden(name) {
    var w = woerter(name || '');
    for (var k = 0; k < WAAGE_MUSTER.length; k++) {
      var mu = WAAGE_MUSTER[k].w;
      for (var i = 0; i + mu.length <= w.length; i++) {
        var ok = true;
        for (var j = 0; j < mu.length; j++) if (w[i + j] !== mu[j]) { ok = false; break; }
        if (!ok) continue;
        if (!WAAGE_MUSTER[k].z) return null; // bewusst ohne belegten Wert
        if (i > 0 && NEUTRAL.indexOf(w[i - 1]) < 0) return null; // unbekannter Zusatz vor dem Grundbegriff
        return WAAGE_MUSTER[k].z;
      }
    }
    return null;
  }

  /* ---------- Einheiten umrechnen ---------- */
  // ziel: 'original' | 'metrisch' | 'at'
  function einheitUmrechnen(menge, einheit, name, ziel) {
    var u = EINHEIT_NACH_K[einheit];
    var out = { menge: menge, einheit: einheit, hinweis: null, quelle: null };
    if (!u || ziel === 'original') return out;
    var wz = waageFinden(name || '');
    if (u.k === 'stick') {
      if (/butter/i.test(name)) { out.menge = menge * D.STUECK.stickButter.g; out.einheit = 'g'; out.quelle = 'cabot'; }
    } else if (u.us && u.art === 'masse') {
      out.menge = menge * u.f; out.einheit = 'g'; out.quelle = 'nist';
    } else if (u.art === 'volumen' && (u.us || u.annahme || u.loeffel || u.k === 'achterl')) {
      var ml = menge * u.f;
      if (wz && !wz.fluessig) {
        out.menge = ml * wz.gProMl; out.einheit = 'g'; out.quelle = 'ka'; out.waage = wz.id;
      } else if (u.loeffel && !wz) {
        return out; // Löffel ohne Gewichtswert bleiben Löffel
      } else if (u.loeffel && wz && wz.fluessig) {
        return out;
      } else {
        out.menge = ml; out.einheit = 'ml'; out.quelle = 'nist';
        if (!wz && (u.us || u.annahme)) out.hinweis = 'Kein belegter Gewichtswert – in Milliliter umgerechnet.';
      }
      if (u.annahme) out.hinweis = '„Tasse“ ist kein festes Maß; gerechnet wie ein US-Cup (≈ 237 ml).';
    }
    if (ziel === 'at') {
      if (out.einheit === 'g' && out.menge >= 10) { out.menge = out.menge / 10; out.einheit = 'dag'; }
      else if (out.einheit === 'kg') { out.menge = out.menge * 100; out.einheit = 'dag'; }
      else if (out.einheit === 'ml' && out.menge >= 100) { out.menge = out.menge / 1000; out.einheit = 'l'; }
    } else if (ziel === 'metrisch') {
      if (out.einheit === 'dag') { out.menge = out.menge * 10; out.einheit = 'g'; }
      if (out.einheit === 'achterl') { out.menge = out.menge * 125; out.einheit = 'ml'; }
      if ((out.einheit === 'l' && out.menge < 1) || out.einheit === 'dl' || out.einheit === 'cl') { out.menge = out.menge * EINHEIT_NACH_K[out.einheit].f; out.einheit = 'ml'; }
      if (out.einheit === 'kg' && out.menge < 1) { out.menge = out.menge * 1000; out.einheit = 'g'; }
    }
    return out;
  }

  // Liter in österreichischer Bruchschreibweise (⅛ l, ¼ l …)
  function literAT(l) {
    var achtel = l * 8;
    if (Math.abs(achtel - Math.round(achtel)) < 0.02 && l < 3) {
      var b = alsBruch(l, [2, 4, 8]);
      return b.text + ' l';
    }
    return null;
  }

  /* ---------- Regionalsprache ---------- */
  var REG_LISTE = [];
  D.REGIONAL.forEach(function (r) {
    ['at', 'de', 'ch'].forEach(function (q) {
      REG_LISTE.push({ wort: r[q], eintrag: r, kompos: !!r.kompos });
    });
  });
  REG_LISTE.sort(function (a, b) { return b.wort.length - a.wort.length; });

  function regionalUebersetzen(text, ziel) {
    if (!ziel || ziel === 'original' || !text) return { text: text, ersetzt: [] };
    var ersetzt = [];
    // Platzhalter verhindern Doppelersetzungen
    var marken = [];
    var t = text;
    REG_LISTE.forEach(function (r) {
      var zielwort = r.eintrag[ziel];
      if (!zielwort || r.wort === zielwort) return;
      var muster = r.kompos ? '(^|[^A-Za-zÄÖÜäöüß])(' + esc(r.wort) + ')([a-zäöüß]*)' : '(^|[^A-Za-zÄÖÜäöüß])(' + esc(r.wort) + ')(?![A-Za-zÄÖÜäöüß])()';
      var re = new RegExp(muster, 'gi');
      t = t.replace(re, function (all, vor, wort, nach) {
        var neu = zielwort;
        if (nach && r.kompos) {
          // Zusammensetzung: "Marillenmarmelade" -> "Aprikosenmarmelade"
          neu = zielwort + nach;
        }
        var klein = function (c) { return c === c.toLowerCase() && c !== c.toUpperCase(); };
        if (klein(wort[0]) && !klein(r.wort[0])) neu = neu[0].toLowerCase() + neu.slice(1);
        else if (!klein(wort[0]) && klein(r.wort[0])) neu = neu[0].toUpperCase() + neu.slice(1);
        marken.push(neu);
        ersetzt.push({ von: wort + (nach || ''), nach: neu, beleg: r.eintrag.beleg });
        return vor + '\u0001' + (marken.length - 1) + '\u0002';
      });
    });
    t = t.replace(/\u0001(\d+)\u0002/g, function (_, i) { return marken[+i]; });
    return { text: t, ersetzt: ersetzt };
  }

  /* ---------- Temperatur ---------- */
  function fNachC(f) { return (f - 32) / 1.8; }
  function cNachF(c) { return c * 1.8 + 32; }
  function aufFuenf(x) { return Math.round(x / 5) * 5; }
  // ersetzt "350 °F" / "350F" / "350 Grad Fahrenheit" in Fließtext
  function fahrenheitImText(text) {
    return String(text).replace(/(\d{3})\s*(?:°\s*F\b|° ?Fahrenheit|Grad Fahrenheit|F\b(?=[\s.,;)]|$))/g, function (all, f) {
      return aufFuenf(fNachC(+f)) + ' °C (' + f + ' °F)';
    });
  }

  /* ---------- Backformen ---------- */
  function formFlaeche(f) {
    // f: {typ:'rund'|'eckig'|'kasten'|'gugelhupf'|'blech', d, a, b, innen}
    switch (f.typ) {
      case 'rund': return Math.PI * Math.pow(f.d / 2, 2);
      case 'gugelhupf': return Math.PI * (Math.pow(f.d / 2, 2) - Math.pow((f.innen || 0) / 2, 2));
      case 'eckig': case 'kasten': case 'blech': return f.a * f.b;
      default: return NaN;
    }
  }
  function formFaktor(von, nach) {
    var a1 = formFlaeche(von), a2 = formFlaeche(nach);
    var r = { flaeche: a2 / a1, a1: a1, a2: a2 };
    if (von.h && nach.h) r.volumen = (a2 * nach.h) / (a1 * von.h);
    return r;
  }
  // Durchmesser einer runden Form, die die Fläche A hat
  function durchmesserFuer(a) { return 2 * Math.sqrt(a / Math.PI); }

  /* ---------- Skalierung ---------- */
  /*
   * opts: { faktor, einheiten:'original'|'metrisch'|'at', region:'original'|'at'|'de'|'ch' }
   * Ergebnis: Zeilen + Hinweise (was nicht linear mitwächst)
   */
  function skalieren(zeilen, opts) {
    var f = opts.faktor;
    var hinweise = [];
    var mehlG = 0, mehlBekannt = false;
    var out = zeilen.map(function (z) {
      var r = { roh: z.roh, ueberschrift: z.ueberschrift, klasse: z.klasse, flags: [], unsicher: z.unsicher };
      var nameReg = regionalUebersetzen(z.name, opts.region);
      r.name = skaliereKlammern(nameReg.text, f);
      r.ersetzt = nameReg.ersetzt;
      if (z.ueberschrift) return r;
      if (z.menge === null) { r.menge = null; r.text = ''; if (z.klasse === 'gewuerz') r.flags.push('abschmecken'); return r; }
      var m = z.menge * f, bis = z.bis !== null ? z.bis * f : null;
      var conv = einheitUmrechnen(m, z.einheit, z.name, opts.einheiten);
      var convBis = bis !== null ? einheitUmrechnen(bis, z.einheit, z.name, opts.einheiten) : null;
      r.einheit = conv.einheit; r.quelle = conv.quelle; r.exakt = conv.menge; r.einheitHinweis = conv.hinweis;
      // Mehl zählen (für Triebmittel-Regel)
      if (z.klasse === 'mehl') {
        var gramm = inGramm(z.menge * f, z.einheit, z.name);
        if (gramm !== null) { mehlG += gramm; mehlBekannt = true; }
      }
      // Eier: ganze Stück
      if ((z.klasse === 'ei' || z.klasse === 'dotter' || z.klasse === 'eiklar') && (!z.einheit || z.einheit === 'stk')) {
        var ganz = Math.max(1, Math.round(m));
        r.menge = ganz; r.text = String(ganz);
        if (bis !== null) { r.text = ganz + '–' + Math.max(ganz, Math.round(bis)); }
        if (Math.abs(ganz - m) > 0.01) {
          var basis = z.klasse === 'ei' ? D.STUECK.ei : (z.klasse === 'dotter' ? D.STUECK.dotter : D.STUECK.eiklar);
          r.flags.push('ei');
          r.eiHinweis = 'Rechnerisch ' + deZahl(m, 2) + ' – das sind ≈ ' + deZahl(m * basis.g, 0) + ' g (' + basis.text + '). Ganze Stück: ' + ganz + '; für Genauigkeit verquirlen und abwiegen.';
        }
        return r;
      }
      var rund = mengeRunden(conv.menge, conv.einheit);
      if (opts.einheiten === 'at' && conv.einheit === 'l') { var la = literAT(conv.menge); if (la) { rund = { text: la.replace(' l', ''), wert: conv.menge, gerundet: false }; } }
      r.menge = rund.wert; r.text = rund.text; r.gerundet = rund.gerundet;
      if (convBis) { var rb = mengeRunden(convBis.menge, convBis.einheit); r.text += '–' + rb.text; }
      if (z.klasse === 'gewuerz' || (EINHEIT_NACH_K[z.einheit] && EINHEIT_NACH_K[z.einheit].klein)) r.flags.push('abschmecken');
      if (z.klasse === 'backpulver' || z.klasse === 'natron' || z.klasse === 'frischhefe' || z.klasse === 'trockenhefe') r.flags.push('trieb');
      if (z.einheit === 'pkg' || z.einheit === 'wuerfel') {
        var gp = pkgGramm(z);
        if (gp) r.pkgHinweis = '≈ ' + deZahl(m * gp.g, 1) + ' g (' + gp.text + ')';
      }
      return r;
    });

    // Hinweise
    if (Math.abs(f - 1) > 0.001) {
      if (out.some(function (r) { return r.flags.indexOf('abschmecken') >= 0; })) {
        hinweise.push({ art: 'abschmecken', titel: 'Salz & Gewürze', text: 'Gewürze sind linear hochgerechnet. Das ist ein Startwert: zuerst etwas weniger nehmen und am Ende abschmecken – Prisen und Messerspitzen sind ohnehin keine genauen Maße.' });
      }
      if (out.some(function (r) { return r.flags.indexOf('ei') >= 0; })) {
        hinweise.push({ art: 'ei', titel: 'Eier', text: 'Eier sind auf ganze Stück gerundet. Wo es auf die Masse ankommt (Biskuit, Teige mit wenig Flüssigkeit), das Ei verquirlen und die errechnete Grammzahl abwiegen.' });
      }
      var trieb = out.filter(function (r) { return r.flags.indexOf('trieb') >= 0; });
      if (trieb.length) hinweise.push(triebHinweis(zeilen, f, mehlBekannt ? mehlG : null));
      hinweise.push(geschirrHinweis(f));
    }
    if (out.some(function (r) { return r.unsicher; })) {
      hinweise.push({ art: 'unsicher', titel: 'Bitte prüfen', text: 'Einige Zeilen ließen sich nicht eindeutig lesen (zum Beispiel zwei Zahlen hintereinander oder eine Listennummer ohne Menge). Sie sind markiert; vergleichen Sie diese Zeilen mit dem Originalrezept.' });
    }
    if (out.some(function (r) { return r.einheitHinweis; })) {
      hinweise.push({ art: 'einheit', titel: 'Einheiten', text: 'Bei einigen Zeilen gab es keinen belegten Gewichtswert; sie sind in Milliliter umgerechnet oder als Löffel belassen. Details stehen in der jeweiligen Zeile.' });
    }
    return { zeilen: out, hinweise: hinweise, faktor: f, mehlG: mehlBekannt ? mehlG : null };
  }

  function pkgGramm(z) {
    if (z.einheit === 'pkg' && z.klasse === 'backpulver') return D.STUECK.backpulverPkg;
    if (z.einheit === 'pkg' && z.klasse === 'trockenhefe') return D.STUECK.trockenhefePkg;
    if (z.einheit === 'wuerfel' && z.klasse === 'frischhefe') return D.STUECK.germWuerfel;
    return null;
  }

  function inGramm(menge, einheit, name) {
    var u = EINHEIT_NACH_K[einheit];
    if (!u) return null;
    if (u.art === 'masse') return menge * u.f;
    if (u.art === 'volumen') { var wz = waageFinden(name); if (wz) return menge * u.f * wz.gProMl; }
    return null;
  }

  function triebHinweis(zeilen, f, mehlG) {
    var teile = [];
    if (mehlG) {
      var bp = mehlG / 500;
      var th = (mehlG / 500) * 7;
      var fh = (mehlG / 1000) * 42;
      var hat = function (k) { return zeilen.some(function (z) { return z.klasse === k; }); };
      if (hat('backpulver')) teile.push('Backpulver: Dr. Oetker rechnet 1 Päckchen (≈ 16 g) für 500 g Mehl – bei ' + deZahl(mehlG, 0) + ' g Mehl also ≈ ' + deZahl(bp, 2) + ' Pkg. (≈ ' + deZahl(bp * 16, 0) + ' g).');
      if (hat('trockenhefe')) teile.push('Trockengerm/Trockenhefe: 7 g reichen laut Dr. Oetker für ca. 500 g Mehl – bei ' + deZahl(mehlG, 0) + ' g Mehl ≈ ' + deZahl(th, 1) + ' g.');
      if (hat('frischhefe')) teile.push('Frischer Germ: 1 Würfel (42 g) reicht laut Dr. Oetker für ca. 1 kg Mehl – bei ' + deZahl(mehlG, 0) + ' g Mehl ≈ ' + deZahl(fh, 0) + ' g.');
    }
    if (zeilen.some(function (z) { return z.klasse === 'natron'; })) teile.push('Natron: Für Natron gibt es keine Mehl-Faustregel des Herstellers; es reagiert mit den sauren Zutaten des Rezepts und wird deshalb im selben Verhältnis wie diese mitgerechnet.');
    if (!teile.length) teile.push('Triebmittel sind linear mitgerechnet. Steht im Rezept eine Mehlmenge in Gramm, vergleicht die Werkbank zusätzlich mit den Herstellerangaben.');
    return { art: 'trieb', titel: 'Triebmittel', text: teile.join(' '), quellen: ['oetkerBackpulver', 'oetkerGerm'] };
  }

  function geschirrHinweis(f) {
    var dFaktor = Math.sqrt(f);
    var bsp = [20, 24, 28].map(function (d) { return d + ' cm → ' + deZahl(d * dFaktor, 0) + ' cm'; }).join(', ');
    var txt = 'Bei gleicher Füllhöhe braucht die ' + (f > 1 ? 'größere' : 'kleinere') + ' Menge die ' + deZahl(f, 2) + '-fache Bodenfläche – der Durchmesser von Form, Pfanne oder Topf ändert sich nur um den Faktor ' + deZahl(dFaktor, 2) + ' (' + bsp + ').';
    if (f >= 1.8) txt += ' Was angebraten wird, lieber in mehreren Durchgängen braten, statt die Pfanne zu überfüllen.';
    if (f <= 0.6) txt += ' In zu großem Geschirr verläuft wenig Teig dünn und gart schneller – früher prüfen.';
    return { art: 'geschirr', titel: 'Form, Pfanne & Topf', text: txt };
  }

  // Zahlen+Einheit in Klammern mitskalieren: "Becher Obers (250 ml)" -> "(500 ml)"
  function skaliereKlammern(text, f) {
    if (Math.abs(f - 1) < 1e-9) return text;
    return text.replace(/\((ca\.\s*)?(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|dag)\)/gi, function (all, ca, n, e) {
      var w = parseFloat(n.replace(',', '.')) * f;
      var r = mengeRunden(w, e.toLowerCase());
      return '(' + (ca || '') + r.text + ' ' + e + ')';
    });
  }

  /* ---------- Einkaufsliste ---------- */
  function bereichVon(name) {
    var n = name.toLowerCase();
    var woerter = n.split(/[^a-zäöüß-]+/).filter(Boolean);
    var best = null;
    D.BEREICHE.forEach(function (b) {
      b.muster.forEach(function (m) {
        var hit = m.indexOf(' ') >= 0 ? n.indexOf(m) >= 0 : woerter.some(function (w) {
          return m.length <= 3 ? (w === m || w.slice(-m.length) === m) : w.indexOf(m) >= 0;
        });
        if (hit && (!best || m.length > best.len)) best = { b: b, len: m.length };
      });
    });
    return best ? best.b.id : 'sonst';
  }

  var EINZAHL = { eier: 'ei', zwiebeln: 'zwiebel', zehen: 'zehe', karotten: 'karotte', 'äpfel': 'apfel', tomaten: 'tomate', kartoffeln: 'kartoffel', 'erdäpfel': 'erdapfel', semmeln: 'semmel', marillen: 'marille', zitronen: 'zitrone', dotter: 'dotter', eidotter: 'dotter', eigelb: 'dotter' };
  function schluessel(name) {
    var s = name.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-zäöüß ]/g, ' ').replace(/\s+/g, ' ').trim();
    return s.split(' ').map(function (w) { return EINZAHL[w] || w; }).join(' ');
  }

  // posten: [{name, menge, einheit}] -> zusammengeführt, Vorrat abgezogen, gruppiert
  function listeBauen(posten, vorrat) {
    var map = {};
    posten.forEach(function (p) {
      var basis = basisMenge(p.menge, p.einheit);
      var key = schluessel(p.name) + '|' + basis.art;
      if (!map[key]) map[key] = { name: p.name.replace(/\s*\(.*?\)\s*/g, ' ').trim(), art: basis.art, menge: 0, einheit: basis.einheit, ohneMenge: false, herkunft: [] };
      if (p.menge === null || p.menge === undefined) map[key].ohneMenge = true;
      else map[key].menge += basis.menge;
      if (p.rezept && map[key].herkunft.indexOf(p.rezept) < 0) map[key].herkunft.push(p.rezept);
    });
    (vorrat || []).forEach(function (v) {
      if (v.menge === null || v.menge === undefined) {
        var sk = schluessel(v.name) + '|';
        Object.keys(map).forEach(function (k) { if (k.indexOf(sk) === 0) map[k].vorratGanz = true; });
        return;
      }
      var basis = basisMenge(v.menge, v.einheit);
      var key = schluessel(v.name) + '|' + basis.art;
      if (map[key] && v.menge !== null && v.menge !== undefined) {
        map[key].vorrat = (map[key].vorrat || 0) + basis.menge;
      } else if (map[key]) {
        map[key].vorratGanz = true;
      }
    });
    var gruppen = {};
    Object.keys(map).forEach(function (k) {
      var p = map[k];
      p.bedarf = Math.max(0, p.menge - (p.vorrat || 0));
      p.gedeckt = p.vorratGanz || (p.vorrat !== undefined && p.bedarf <= 0 && !p.ohneMenge);
      var b = bereichVon(p.name);
      (gruppen[b] = gruppen[b] || []).push(p);
    });
    return D.BEREICHE.filter(function (b) { return gruppen[b.id]; }).map(function (b) {
      return { id: b.id, name: b.name, posten: gruppen[b.id].sort(function (x, y) { return x.name.localeCompare(y.name, 'de'); }) };
    });
  }

  function basisMenge(menge, einheit) {
    var u = EINHEIT_NACH_K[einheit];
    if (menge === null || menge === undefined) return { art: u ? u.k : 'stk', menge: 0, einheit: einheit || '' };
    if (u && u.art === 'masse') return { art: 'masse', menge: menge * u.f, einheit: 'g' };
    if (u && u.art === 'volumen' && !u.loeffel && !u.us && !u.annahme) return { art: 'volumen', menge: menge * u.f, einheit: 'ml' };
    return { art: u ? u.k : 'stk', menge: menge, einheit: einheit || '' };
  }

  function basisFormat(menge, einheit) {
    if (einheit === 'g' && menge >= 1000) return deZahl(menge / 1000, 2) + ' kg';
    if (einheit === 'ml' && menge >= 1000) return deZahl(menge / 1000, 2) + ' l';
    var r = mengeRunden(menge, einheit || null);
    var et = einheit ? einheitText(einheit, menge) : '';
    return r.text + (et ? ' ' + et : '');
  }

  /* ---------- Teilen-Link ---------- */
  function kodieren(obj) {
    var json = JSON.stringify(obj);
    var bytes = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(json) : Buffer.from(json, 'utf8');
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    var b64 = typeof btoa !== 'undefined' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64');
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function dekodieren(s) {
    try {
      var b64 = s.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      var bin = typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var json = typeof TextDecoder !== 'undefined' ? new TextDecoder().decode(bytes) : Buffer.from(bytes).toString('utf8');
      return JSON.parse(json);
    } catch (e) { return null; }
  }

  return {
    zahlLesen: zahlLesen, zeileLesen: zeileLesen, rezeptLesen: rezeptLesen, klasseVon: klasseVon,
    mengeRunden: mengeRunden, deZahl: deZahl, alsBruch: alsBruch, einheitText: einheitText,
    einheitUmrechnen: einheitUmrechnen, waageFinden: waageFinden, literAT: literAT,
    regionalUebersetzen: regionalUebersetzen, fNachC: fNachC, cNachF: cNachF, fahrenheitImText: fahrenheitImText,
    formFlaeche: formFlaeche, formFaktor: formFaktor, durchmesserFuer: durchmesserFuer,
    skalieren: skalieren, bereichVon: bereichVon, listeBauen: listeBauen, basisFormat: basisFormat,
    kodieren: kodieren, dekodieren: dekodieren, EINHEITEN: EINHEIT_NACH_K
  };
});
