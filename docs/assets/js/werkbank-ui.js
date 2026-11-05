/* Küchenideenkompass – Oberfläche der Rezept-Werkbank */
(function () {
  'use strict';
  var K = window.KIK.kern, D = window.KIK.daten;
  var $ = function (id) { return document.getElementById(id); };
  var wurzel = $('werkbank');
  if (!wurzel) return;

  var BEISPIEL = {
    titel: 'Topfen-Gugelhupf',
    zutaten: 'Teig:\n25 dag glattes Mehl\n1 Pkg. Backpulver\n20 dag Staubzucker\n4 Eier\n25 dag Topfen\n1/8 l Obers\n12 dag Butter\n1 Prise Salz\n1 TL abgeriebene Zitronenschale\nFür die Form:\n1 EL Butter\n2 EL Semmelbrösel',
    schritte: 'Backrohr auf 170 °C Ober-/Unterhitze vorheizen. Butter mit Staubzucker schaumig rühren, Eier einzeln einrühren, Topfen und Obers unterrühren. Mehl mit Backpulver und Salz mischen und unterheben. In die befettete, mit Semmelbröseln ausgestreute Gugelhupfform (Ø 22 cm) füllen und ca. 55 Minuten backen.',
    von: 4, nach: 6
  };

  var FORMEN = { rund: 'rund (Springform)', eckig: 'eckig / quadratisch', kasten: 'Kastenform', gugelhupf: 'Gugelhupf', blech: 'Blech' };

  function h(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function wert(name) { var el = wurzel.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : null; }
  function zahl(id) { var v = parseFloat(String($(id).value).replace(',', '.')); return isFinite(v) && v > 0 ? v : null; }

  function formFelder(praefix) {
    var typ = $(praefix + '-typ').value;
    var box = $(praefix + '-masse');
    var alt = {};
    Array.prototype.forEach.call(box.querySelectorAll('input'), function (i) { alt[i.dataset.k] = i.value; });
    var felder = typ === 'rund' ? [['d', 'Ø cm', 26]] : typ === 'gugelhupf' ? [['d', 'Ø außen cm', 22], ['innen', 'Ø Rohr cm', 8]] : typ === 'kasten' ? [['a', 'Länge cm', 30], ['b', 'Breite cm', 11]] : typ === 'blech' ? [['a', 'Länge cm', 40], ['b', 'Breite cm', 30]] : [['a', 'Länge cm', 24], ['b', 'Breite cm', 24]];
    box.innerHTML = felder.map(function (f) {
      var id = praefix + '-' + f[0];
      return '<div class="feld"><label for="' + id + '">' + f[1] + '</label><input type="number" inputmode="decimal" min="1" step="0.5" id="' + id + '" data-k="' + f[0] + '" value="' + h(alt[f[0]] || f[2]) + '"></div>';
    }).join('');
  }
  function formLesen(praefix) {
    var f = { typ: $(praefix + '-typ').value };
    Array.prototype.forEach.call($(praefix + '-masse').querySelectorAll('input'), function (i) { var v = parseFloat(i.value.replace(',', '.')); f[i.dataset.k] = v; });
    return f;
  }
  function formText(f) {
    if (f.typ === 'rund') return 'Springform Ø ' + K.deZahl(f.d, 1) + ' cm';
    if (f.typ === 'gugelhupf') return 'Gugelhupf Ø ' + K.deZahl(f.d, 1) + ' cm';
    return (f.typ === 'kasten' ? 'Kastenform ' : f.typ === 'blech' ? 'Blech ' : 'eckige Form ') + K.deZahl(f.a, 1) + ' × ' + K.deZahl(f.b, 1) + ' cm';
  }

  function faktorBestimmen() {
    var g = wert('grundlage');
    if (g === 'portionen') {
      var v = zahl('wb-von'), n = zahl('wb-nach');
      if (!v || !n) return { fehler: 'Bitte beide Portionenzahlen angeben.' };
      return { f: n / v, text: 'für ' + K.deZahl(n, 1) + ' statt ' + K.deZahl(v, 1) + ' Portionen' };
    }
    if (g === 'form') {
      var a = formLesen('wb-fv'), b = formLesen('wb-fn');
      var r = K.formFaktor(a, b);
      if (!isFinite(r.flaeche) || r.flaeche <= 0) return { fehler: 'Bitte die Maße beider Formen prüfen.' };
      return { f: r.flaeche, text: formText(b) + ' statt ' + formText(a) };
    }
    var f = zahl('wb-faktor');
    if (!f) return { fehler: 'Bitte einen Faktor größer 0 eingeben.' };
    return { f: f, text: 'Faktor ' + K.deZahl(f, 3) };
  }

  var REG_NAME = { original: 'wie im Rezept', at: 'Österreich', de: 'Deutschland', ch: 'Schweiz' };
  var EIN_NAME = { original: 'wie im Rezept', metrisch: 'metrisch (g/ml)', at: 'österreichisch (dag/l)' };
  var letztes = null;

  function rechnen() {
    var ausgabe = $('wb-ergebnis');
    var fk = faktorBestimmen();
    var text = $('wb-zutaten').value;
    if (!text.trim()) { ausgabe.innerHTML = '<p class="unterzeile">Fügen Sie links ein Rezept ein – eine Zutat pro Zeile – oder laden Sie das Beispiel.</p>'; letztes = null; return; }
    if (fk.fehler) { ausgabe.innerHTML = '<p class="unterzeile">' + h(fk.fehler) + '</p>'; return; }
    var region = wert('region'), einheiten = wert('einheiten');
    var zeilen = K.rezeptLesen(text);
    var erg = K.skalieren(zeilen, { faktor: fk.f, einheiten: einheiten, region: region });
    var titel = K.regionalUebersetzen($('wb-titel').value.trim() || 'Mein Rezept', region).text;
    var html = '<div class="druckbar"><h3>' + h(titel) + '</h3>';
    html += '<p class="unterzeile">' + h(fk.text) + ' · Faktor <b>' + K.deZahl(fk.f, 3) + '</b> · Einheiten: ' + EIN_NAME[einheiten] + ' · Küchensprache: ' + REG_NAME[region] + '</p>';
    html += '<table class="zutaten"><tbody>';
    erg.zeilen.forEach(function (z, i) {
      if (z.ueberschrift) { html += '<tr class="ue"><td colspan="3">' + h(z.name) + '</td></tr>'; return; }
      var notiz = [];
      if (z.unsicher) notiz.push(z.unsicher);
      if (z.eiHinweis) notiz.push(z.eiHinweis);
      if (z.pkgHinweis) notiz.push(z.pkgHinweis);
      if (z.einheitHinweis) notiz.push(z.einheitHinweis);
      if (z.quelle && z.quelle !== 'nist' && D.QUELLEN[z.quelle]) notiz.push('Gewicht: ' + D.QUELLEN[z.quelle].name);
      if (z.ersetzt && z.ersetzt.length) notiz.push('Original: ' + zeilen[i].name);
      var marken = '';
      if (z.flags.indexOf('abschmecken') >= 0) marken += '<span class="marke-klein m-ab">abschmecken</span>';
      if (z.flags.indexOf('ei') >= 0) marken += '<span class="marke-klein m-ei">ganze Eier</span>';
      if (z.flags.indexOf('trieb') >= 0) marken += '<span class="marke-klein m-tr">Triebmittel</span>';
      if (z.ersetzt && z.ersetzt.length) marken += '<span class="marke-klein m-reg">übersetzt</span>';
      if (z.unsicher) marken += '<span class="marke-klein m-ei">prüfen</span>';
      var ein = z.einheit ? K.einheitText(z.einheit, z.menge) : '';
      if (einheiten === 'at' && z.einheit === 'l' && /[⅛¼⅜½⅝¾⅞]/.test(z.text)) ein = 'l';
      html += '<tr><td class="m">' + (z.menge === null ? '' : (z.gerundet ? '<span title="gerundet">≈ </span>' : '') + h(z.text)) + '</td><td class="e">' + h(ein) + '</td><td>' + h(z.name || zeilen[i].roh) + marken + (notiz.length ? '<span class="notiz">' + h(notiz.join(' · ')) + '</span>' : '') + '</td></tr>';
    });
    html += '</tbody></table>';
    if (erg.hinweise.length) {
      html += '<div class="nichtlinear"><h4>Was nicht linear mitwächst</h4><dl>';
      erg.hinweise.forEach(function (hw) { html += '<dt>' + h(hw.titel) + '</dt><dd>' + h(hw.text) + '</dd>'; });
      html += '</dl></div>';
    }
    var schritte = $('wb-schritte').value.trim();
    if (schritte) {
      var s = K.regionalUebersetzen(K.fahrenheitImText(schritte), region).text;
      html += '<div class="schritte-ausgabe"><b>Zubereitung</b>\n' + h(s) + '</div>';
      if (Math.abs(fk.f - 1) > 0.001) html += '<p class="unterzeile">Zeiten in der Zubereitung sind nicht umgerechnet – Garzeit hängt von Teighöhe und Form ab, nicht von der Menge allein.</p>';
    }
    html += '</div>';
    ausgabe.innerHTML = html;
    letztes = { titel: titel, erg: erg };
  }

  function alsText() {
    if (!letztes) return '';
    return letztes.erg.zeilen.map(function (z) {
      if (z.ueberschrift) return z.name + ':';
      var ein = z.einheit ? K.einheitText(z.einheit, z.menge) : '';
      return [z.menge === null ? '' : z.text, ein, z.name].filter(Boolean).join(' ');
    }).join('\n');
  }

  function zustand() {
    return { t: $('wb-titel').value, z: $('wb-zutaten').value, s: $('wb-schritte').value, g: wert('grundlage'), v: $('wb-von').value, n: $('wb-nach').value, f: $('wb-faktor').value, e: wert('einheiten'), r: wert('region'), fv: formLesen('wb-fv'), fn: formLesen('wb-fn') };
  }
  function setzen(o) {
    if (!o) return;
    if (o.t !== undefined) $('wb-titel').value = o.t;
    if (o.z !== undefined) $('wb-zutaten').value = o.z;
    if (o.s !== undefined) { $('wb-schritte').value = o.s; if (o.s) $('wb-schritte-box').open = true; }
    if (o.v) $('wb-von').value = o.v;
    if (o.n) $('wb-nach').value = o.n;
    if (o.f) $('wb-faktor').value = o.f;
    ['g:grundlage', 'e:einheiten', 'r:region'].forEach(function (p) {
      var k = p.split(':'); if (!o[k[0]]) return;
      var el = wurzel.querySelector('input[name="' + k[1] + '"][value="' + o[k[0]] + '"]'); if (el) el.checked = true;
    });
    ['fv', 'fn'].forEach(function (p) {
      if (!o[p]) return;
      $('wb-' + p + '-typ').value = o[p].typ; formFelder('wb-' + p);
      Object.keys(o[p]).forEach(function (k) { var i = $('wb-' + p + '-' + k); if (i) i.value = o[p][k]; });
    });
    grundlageZeigen();
  }

  function grundlageZeigen() {
    var g = wert('grundlage');
    ['portionen', 'form', 'faktor'].forEach(function (x) { $('wb-g-' + x).hidden = x !== g; });
  }

  function status(t) { var s = $('wb-status'); s.textContent = t; setTimeout(function () { if (s.textContent === t) s.textContent = ''; }, 4000); }

  // Ereignisse
  formFelder('wb-fv'); formFelder('wb-fn');
  $('wb-fv-typ').addEventListener('change', function () { formFelder('wb-fv'); rechnen(); });
  $('wb-fn-typ').addEventListener('change', function () { formFelder('wb-fn'); rechnen(); });
  wurzel.addEventListener('input', function () { grundlageZeigen(); rechnen(); });
  wurzel.addEventListener('change', function () { grundlageZeigen(); rechnen(); });
  $('wb-beispiel').addEventListener('click', function () {
    setzen({ t: BEISPIEL.titel, z: BEISPIEL.zutaten, s: BEISPIEL.schritte, v: BEISPIEL.von, n: BEISPIEL.nach, g: 'portionen' });
    rechnen(); status('Beispiel geladen – ändern Sie Portionen, Einheiten oder Küchensprache.');
  });
  $('wb-leeren').addEventListener('click', function () { $('wb-titel').value = ''; $('wb-zutaten').value = ''; $('wb-schritte').value = ''; rechnen(); $('wb-zutaten').focus(); });
  // Ereignis an Google Analytics – wirkt nur nach Einwilligung (einwilligung.js)
  function zaehlen(name, p) { try { if (typeof window.gtag === 'function' && window['ga-disable-G-T00HRG2YVF'] === false) window.gtag('event', name, p || {}); } catch (e) {} }
  $('wb-drucken').addEventListener('click', function () { rechnen(); zaehlen('rezept_drucken'); window.print(); });
  $('wb-karte').addEventListener('click', function () {
    rechnen(); if (!letztes) { status('Erst ein Rezept eingeben.'); return; }
    document.body.classList.add('druck-karte'); zaehlen('rezeptkarte_drucken');
    var fertig = function () { document.body.classList.remove('druck-karte'); window.removeEventListener('afterprint', fertig); };
    window.addEventListener('afterprint', fertig); window.print();
  });

  // „Meine Rezepte“: umgerechnete Rezepte merken – nur im Browser (localStorage „kik-rezepte-v1“), höchstens 30
  var MEINE = 'kik-rezepte-v1';
  function meineLaden() { try { var l = JSON.parse(localStorage.getItem(MEINE) || '[]'); return Array.isArray(l) ? l.filter(function (x) { return x && x.z && typeof x.titel === 'string'; }) : []; } catch (e) { return []; } }
  function meineZeigen() {
    var l = meineLaden(), box = $('wb-meine');
    box.hidden = !l.length;
    $('wb-meine-liste').innerHTML = l.map(function (x, i) {
      return '<li><button type="button" class="link-knopf" data-oeffnen="' + i + '">' + h(x.titel) + '</button><span class="klein">' + h(x.info || '') + '</span><button type="button" class="link-knopf klein" data-loeschen="' + i + '" aria-label="' + h(x.titel) + ' löschen">löschen</button></li>';
    }).join('');
  }
  $('wb-merken').addEventListener('click', function () {
    rechnen(); if (!letztes) { status('Erst ein Rezept eingeben.'); return; }
    var l = meineLaden(), z = zustand(), titel = ($('wb-titel').value.trim() || 'Mein Rezept').slice(0, 60);
    l = l.filter(function (x) { return x.titel !== titel; });
    l.unshift({ titel: titel, info: faktorBestimmen().text || '', z: z, ts: Date.now() });
    try { localStorage.setItem(MEINE, JSON.stringify(l.slice(0, 30))); status('In „Meine Rezepte“ gespeichert – nur in diesem Browser.'); zaehlen('rezept_merken'); }
    catch (e) { status('Speichern ist in diesem Browser nicht möglich.'); }
    meineZeigen();
  });
  $('wb-meine').addEventListener('click', function (e) {
    var o = e.target.getAttribute('data-oeffnen'), d = e.target.getAttribute('data-loeschen'), l = meineLaden();
    if (o !== null && l[+o]) { setzen(l[+o].z); rechnen(); status('„' + l[+o].titel + '“ geöffnet.'); zaehlen('rezept_oeffnen'); $('wb-ergebnis').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (d !== null) { l.splice(+d, 1); try { localStorage.setItem(MEINE, JSON.stringify(l)); } catch (er) {} meineZeigen(); }
  });
  meineZeigen();
  $('wb-teilen').addEventListener('click', function () {
    var url = location.origin + location.pathname + '#r=' + K.kodieren(zustand());
    history.replaceState(null, '', url);
    var fertig = function () { status('Link kopiert. Das Rezept steckt vollständig im Link – gespeichert wird nichts.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(fertig, function () { status('Link steht jetzt in der Adresszeile.'); });
    else status('Link steht jetzt in der Adresszeile.');
  });
  $('wb-liste').addEventListener('click', function () {
    if (!letztes) { status('Erst ein Rezept eingeben.'); return; }
    try {
      var daten = JSON.parse(localStorage.getItem('kik-einkauf-v1') || '{}');
      daten.rezepte = daten.rezepte || [];
      daten.rezepte.push({ titel: letztes.titel, text: alsText() });
      localStorage.setItem('kik-einkauf-v1', JSON.stringify(daten));
      status('Auf die Einkaufsliste gelegt (' + daten.rezepte.length + ' Rezept' + (daten.rezepte.length > 1 ? 'e' : '') + ').'); zaehlen('einkaufsliste_uebernehmen');
    } catch (e) { status('Speichern ist in diesem Browser nicht möglich.'); }
  });

  // Startzustand: geteilter Link > Parameter aus dem Backform-Übersetzer
  var m = location.hash.match(/#r=([A-Za-z0-9_-]+)/);
  if (m) setzen(K.dekodieren(m[1]));
  var q = new URLSearchParams(location.search);
  if (q.get('faktor')) {
    var f = parseFloat(q.get('faktor'));
    if (f > 0) { setzen({ g: 'faktor', f: String(Math.round(f * 1000) / 1000) }); status('Faktor aus dem Backform-Übersetzer übernommen' + (q.get('info') ? ': ' + q.get('info') : '') + '.'); }
  }
  // ohne geteilten Link, Faktor-Übergabe oder vom Browser wiederhergestellte Eingabe: Beispiel als echten Wert vorbelegen
  if (!m && !q.get('faktor') && !$('wb-zutaten').value.trim() && !$('wb-titel').value.trim()) {
    setzen({ t: BEISPIEL.titel, z: BEISPIEL.zutaten, v: BEISPIEL.von, n: BEISPIEL.nach });
  }
  grundlageZeigen();
  rechnen();
})();
