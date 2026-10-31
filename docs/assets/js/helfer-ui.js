/* Küchenideenkompass – Zutaten-Waage, Wörterbuch-Suche, Einkaufsliste, Ofen-Rechner */
(function () {
  'use strict';
  var K = window.KIK.kern, D = window.KIK.daten;
  var $ = function (id) { return document.getElementById(id); };
  function h(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(v) { var x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : null; }

  /* ---------- Zutaten-Waage ---------- */
  (function waage() {
    if (!$('wa-zutat')) return;
    var sel = $('wa-zutat');
    sel.innerHTML = D.WAAGE.map(function (z) { return '<option value="' + z.id + '">' + h(z.name) + '</option>'; }).join('');
    var ML = { cup: D.US_ML.cup, halb: D.US_ML.cup / 2, viertel: D.US_ML.cup / 4, drittel: D.US_ML.cup / 3, el: D.US_ML.el, tl: D.US_ML.tl };
    function rechnen() {
      var z = D.WAAGE.filter(function (x) { return x.id === sel.value; })[0];
      var menge = num($('wa-menge').value);
      var einheit = $('wa-einheit').value;
      if (!z || menge === null || menge <= 0) { $('wa-ergebnis').innerHTML = '<p>Bitte eine Menge eingeben.</p>'; return; }
      var ml = menge * ML[einheit];
      var g = ml * z.gProMl;
      var html = '<div class="kennzahlen"><div class="kennzahl"><span>Gewicht</span><b class="faktor-anzeige">' + K.deZahl(g, g < 10 ? 1 : 0) + ' g</b></div>' +
        '<div class="kennzahl"><span>Volumen</span><b>' + K.deZahl(ml, 0) + ' ml</b></div>' +
        '<div class="kennzahl"><span>1 Cup</span><b>' + K.deZahl(z.gProCup, 0) + ' g</b></div>' +
        '<div class="kennzahl"><span>1 EL / 1 TL</span><b>' + K.deZahl(z.gProCup / 16, 1) + ' / ' + K.deZahl(z.gProCup / 48, 1) + ' g</b></div></div>';
      html += '<p class="unterzeile">Quelle des Werts: <a href="' + D.QUELLEN.ka.url + '" rel="noopener" target="_blank">' + h(D.QUELLEN.ka.name) + '</a> – Eintrag „' + h(z.en) + '“: ' + h(z.volText) + ' = ' + z.g + ' g. Volumen nach NIST (1 Cup ≈ 236,6 ml).' + (z.fluessig ? ' Flüssigkeiten misst die Werkbank im Rezept in Milliliter.' : '') + '</p>';
      $('wa-ergebnis').innerHTML = html;
    }
    $('waage').addEventListener('input', rechnen);
    $('waage').addEventListener('change', rechnen);
    var q = new URLSearchParams(location.search);
    if (q.get('zutat')) sel.value = q.get('zutat');
    rechnen();
  })();

  /* ---------- Wörterbuch-Suche ---------- */
  (function woerterbuch() {
    var feld = $('wo-suche');
    if (!feld) return;
    var eintraege = document.querySelectorAll('.wort');
    function filtern() {
      var t = feld.value.trim().toLowerCase();
      var reg = document.querySelector('input[name="wo-region"]:checked').value;
      var n = 0;
      Array.prototype.forEach.call(eintraege, function (e) {
        var passt = (!t || e.getAttribute('data-suche').indexOf(t) >= 0) && (reg === 'alle' || e.getAttribute('data-regionen').indexOf(reg) >= 0);
        e.hidden = !passt; if (passt) n++;
      });
      $('wo-info').textContent = n + ' von ' + eintraege.length + ' Einträgen';
    }
    feld.addEventListener('input', filtern);
    Array.prototype.forEach.call(document.querySelectorAll('input[name="wo-region"]'), function (r) { r.addEventListener('change', filtern); });
    filtern();
  })();

  /* ---------- Ofentemperatur ---------- */
  (function ofen() {
    if (!$('of-wert')) return;
    function rechnen() {
      var w = num($('of-wert').value), art = $('of-art').value;
      if (w === null) { $('of-ergebnis').textContent = ''; return; }
      var ou = art === 'f' ? K.fNachC(w) : art === 'umluft' ? w + 20 : w;
      var um = ou - 20, f = K.cNachF(ou);
      $('of-ergebnis').innerHTML = '<div class="kennzahlen"><div class="kennzahl"><span>Ober-/Unterhitze</span><b>' + K.deZahl(Math.round(ou / 5) * 5, 0) + ' °C</b></div><div class="kennzahl"><span>Umluft (≈ −20 °C)</span><b>' + K.deZahl(Math.round(um / 5) * 5, 0) + ' °C</b></div><div class="kennzahl"><span>Fahrenheit</span><b>' + K.deZahl(Math.round(f / 5) * 5, 0) + ' °F</b></div></div><p class="unterzeile">Gerundet auf 5 Grad. Exakt: ' + K.deZahl(ou, 1) + ' °C = ' + K.deZahl(f, 1) + ' °F.</p>';
    }
    $('ofen').addEventListener('input', rechnen); $('ofen').addEventListener('change', rechnen); rechnen();
  })();

  /* ---------- Germ-Rechner ---------- */
  (function germ() {
    if (!$('ge-menge')) return;
    function rechnen() {
      var m = num($('ge-menge').value), art = $('ge-art').value;
      if (m === null || m <= 0) { $('ge-ergebnis').textContent = ''; return; }
      // Bezug: 7 g Trockengerm ≈ 500 g Mehl; 42 g Frischgerm ≈ 1000 g Mehl (Dr. Oetker AT)
      var mehl = art === 'frisch' ? m / 42 * 1000 : art === 'trocken' ? m / 7 * 500 : m;
      var trocken = mehl / 500 * 7, frisch = mehl / 1000 * 42;
      $('ge-ergebnis').innerHTML = '<div class="kennzahlen"><div class="kennzahl"><span>Mehl</span><b>' + K.deZahl(mehl, 0) + ' g</b></div><div class="kennzahl"><span>Frischgerm</span><b>' + K.deZahl(frisch, 1) + ' g</b></div><div class="kennzahl"><span>Trockengerm</span><b>' + K.deZahl(trocken, 1) + ' g</b></div><div class="kennzahl"><span>Würfel / Pkg.</span><b>' + K.deZahl(frisch / 42, 2) + ' / ' + K.deZahl(trocken / 7, 2) + '</b></div></div>';
    }
    $('germ').addEventListener('input', rechnen); $('germ').addEventListener('change', rechnen); rechnen();
  })();

  /* ---------- Einkaufsliste ---------- */
  (function einkauf() {
    var box = $('einkauf');
    if (!box || !$('ek-rezepte')) return;
    var SCHLUESSEL = 'kik-einkauf-v1';
    var daten = { rezepte: [], vorrat: '', abgehakt: {} };
    try { var g = JSON.parse(localStorage.getItem(SCHLUESSEL) || 'null'); if (g) daten = Object.assign(daten, g); } catch (e) { /* ohne Speicher weiter */ }
    if (!daten.rezepte.length) daten.rezepte = [{ titel: '', text: '', faktor: 1 }];
    daten.abgehakt = daten.abgehakt || {};

    function speichern() { try { localStorage.setItem(SCHLUESSEL, JSON.stringify(daten)); $('ek-gespeichert').textContent = 'Lokal in diesem Browser gespeichert.'; } catch (e) { $('ek-gespeichert').textContent = 'Speichern nicht möglich – die Liste gilt nur bis zum Schließen.'; } }

    function kartenZeichnen() {
      $('ek-rezepte').innerHTML = daten.rezepte.map(function (r, i) {
        return '<div class="rezept-karte"><div class="reihe"><div class="feld"><label for="ek-t' + i + '">Rezept ' + (i + 1) + '</label><input type="text" id="ek-t' + i + '" data-i="' + i + '" data-f="titel" value="' + h(r.titel || '') + '" placeholder="z. B. Gulasch"></div>' +
          '<div class="feld"><label for="ek-f' + i + '">Faktor</label><input type="number" inputmode="decimal" min="0.1" step="0.25" id="ek-f' + i + '" data-i="' + i + '" data-f="faktor" value="' + h(r.faktor || 1) + '"></div>' +
          '<div class="feld"><span class="label" aria-hidden="true">&nbsp;</span><button type="button" class="klein-knopf" data-weg="' + i + '" aria-label="Rezept ' + (i + 1) + ' entfernen">Entfernen</button></div></div>' +
          '<div class="feld"><label for="ek-z' + i + '">Zutaten (eine pro Zeile)</label><textarea id="ek-z' + i + '" data-i="' + i + '" data-f="text" rows="6" style="min-height:140px">' + h(r.text || '') + '</textarea></div></div>';
      }).join('');
    }

    function liste() {
      var posten = [];
      daten.rezepte.forEach(function (r, i) {
        var f = num(r.faktor) || 1;
        K.rezeptLesen(r.text).forEach(function (z) {
          if (z.ueberschrift || !z.name) return;
          posten.push({ name: z.name, menge: z.menge === null ? null : z.menge * f, einheit: z.einheit, rezept: r.titel || 'Rezept ' + (i + 1) });
        });
      });
      var vorrat = K.rezeptLesen(daten.vorrat).filter(function (z) { return !z.ueberschrift && z.name; }).map(function (z) { return { name: z.name, menge: z.menge, einheit: z.einheit }; });
      var gruppen = K.listeBauen(posten, vorrat);
      if (!gruppen.length) { $('ek-liste').innerHTML = '<p class="unterzeile">Noch keine Zutaten. Rezepte links einfügen oder aus der Werkbank übernehmen.</p>'; return; }
      var html = '<div class="druckbar"><h3>Einkaufsliste</h3><p class="unterzeile">' + daten.rezepte.filter(function (r) { return r.text.trim(); }).map(function (r, i) { return h(r.titel || 'Rezept ' + (i + 1)); }).join(' · ') + '</p>';
      gruppen.forEach(function (g) {
        html += '<div class="liste-gruppe"><h3>' + h(g.name) + '</h3><ul>';
        g.posten.forEach(function (p) {
          var key = p.name.toLowerCase() + '|' + p.art;
          var menge = p.menge > 0 ? K.basisFormat(p.gedeckt ? p.menge : p.bedarf, p.einheit) : '';
          var info = [];
          if (p.vorrat) info.push('Vorrat ' + K.basisFormat(p.vorrat, p.einheit) + ' abgezogen');
          if (p.gedeckt) info.push('im Vorrat');
          if (p.herkunft.length > 1) info.push(p.herkunft.join(' + '));
          if (p.ohneMenge && p.menge > 0) info.push('plus Mengen ohne Angabe');
          var id = 'ek-c-' + g.id + '-' + Math.abs(hash(key));
          html += '<li class="' + (p.gedeckt ? 'gedeckt' : '') + '"><input type="checkbox" id="' + id + '" data-key="' + h(key) + '"' + (daten.abgehakt[key] || p.gedeckt ? ' checked' : '') + '><span class="lm">' + h(menge) + '</span><label for="' + id + '" class="ln">' + h(p.name) + (info.length ? '<span class="lh">' + h(info.join(' · ')) + '</span>' : '') + '</label></li>';
        });
        html += '</ul></div>';
      });
      html += '</div>';
      $('ek-liste').innerHTML = html;
    }
    function hash(s) { var x = 0; for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return x; }

    box.addEventListener('input', function (e) {
      var t = e.target;
      if (t.dataset.i !== undefined) { daten.rezepte[+t.dataset.i][t.dataset.f] = t.value; }
      if (t.id === 'ek-vorrat') daten.vorrat = t.value;
      speichern(); liste();
    });
    box.addEventListener('change', function (e) {
      if (e.target.dataset.key) { daten.abgehakt[e.target.dataset.key] = e.target.checked; speichern(); }
    });
    box.addEventListener('click', function (e) {
      var weg = e.target.getAttribute('data-weg');
      if (weg !== null) { daten.rezepte.splice(+weg, 1); if (!daten.rezepte.length) daten.rezepte.push({ titel: '', text: '', faktor: 1 }); kartenZeichnen(); speichern(); liste(); }
    });
    $('ek-neu').addEventListener('click', function () { daten.rezepte.push({ titel: '', text: '', faktor: 1 }); kartenZeichnen(); speichern(); var n = daten.rezepte.length - 1; $('ek-z' + n).focus(); });
    $('ek-drucken').addEventListener('click', function () { window.print(); });
    $('ek-leeren').addEventListener('click', function () { daten = { rezepte: [{ titel: '', text: '', faktor: 1 }], vorrat: daten.vorrat, abgehakt: {} }; kartenZeichnen(); speichern(); liste(); });
    $('ek-beispiel').addEventListener('click', function () {
      daten.rezepte = [
        { titel: 'Gulasch', faktor: 1, text: '1 kg Rindfleisch (Wadschinken)\n1 kg Zwiebeln\n3 EL Paprikapulver\n2 EL Tomatenmark\n1 Zehe Knoblauch\n1 TL Kümmel\n1 EL Majoran\nSalz' },
        { titel: 'Topfenpalatschinken', faktor: 2, text: '200 g Mehl\n1/4 l Milch\n2 Eier\n250 g Topfen\n50 g Staubzucker\n1 Pkg. Vanillezucker\n2 EL Rosinen\n1 Prise Salz' }
      ];
      daten.vorrat = '500 g Mehl\nSalz\n2 EL Paprikapulver';
      $('ek-vorrat').value = daten.vorrat; kartenZeichnen(); speichern(); liste();
    });
    $('ek-vorrat').value = daten.vorrat || '';
    kartenZeichnen(); liste();
  })();
})();
