/* Küchenideenkompass – Zutaten-Waage, Wörterbuch-Suche, Einkaufsliste, Ofen-Rechner */
(function () {
  'use strict';
  var K = window.KIK.kern, D = window.KIK.daten;
  var $ = function (id) { return document.getElementById(id); };
  function h(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(v) { var x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : null; }

  /* Gemeinsam: Rechenweg, Link im Fragment (#w=…, #o=…, #g=…) – nur geprüfte Werte, nie freier Text */
  function weg(schritte) { return '<div class="rechenweg"><h3>Rechenweg</h3><ol>' + schritte.map(function (x) { return '<li>' + h(x) + '</li>'; }).join('') + '</ol></div>'; }
  function fragment(kennung) {
    var m = location.hash.match(new RegExp('^#' + kennung + '=([a-z0-9]{1,24})(?:~([0-9.]{1,8}))?(?:~([a-z]{1,8}))?$'));
    return m ? m.slice(1) : null;
  }
  // Adresse erst nach einer Eingabe ändern, nicht schon beim Laden
  var bedient = false;
  ['input', 'change', 'click'].forEach(function (e) { document.addEventListener(e, function () { bedient = true; }, true); });
  function fragmentSetzen(t) { if (!bedient) return; try { history.replaceState(null, '', location.pathname + location.search + '#' + t); } catch (e) { /* ohne History weiter */ } }
  function linkKnopf(knopf, status) {
    if (!knopf) return;
    knopf.addEventListener('click', function () {
      var url = location.href;
      function ok() { status.textContent = 'Link kopiert – er enthält nur die Auswahl und die Zahl.'; }
      function nein() { status.textContent = 'Der Link steht in der Adresszeile.'; }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, nein); else nein();
    });
  }
  function hat(sel, wert) { return Array.prototype.some.call(sel.options, function (o) { return o.value === wert; }); }

  /* ---------- Zutaten-Waage ---------- */
  (function waage() {
    if (!$('wa-zutat')) return;
    var sel = $('wa-zutat');
    sel.innerHTML = D.WAAGE.map(function (z) { return '<option value="' + z.id + '">' + h(z.name) + '</option>'; }).join('');
    function rechnen() {
      var menge = num($('wa-menge').value), einheit = $('wa-einheit').value;
      var r = menge === null ? null : K.waageRechnen(sel.value, menge, einheit);
      if (!r) { $('wa-ergebnis').innerHTML = '<p>Bitte eine Menge größer als 0 eingeben.</p>'; return; }
      var z = r.zutat, html;
      if (r.rueck) html = '<div class="kennzahlen"><div class="kennzahl"><span>Cups</span><b class="faktor-anzeige">' + K.deZahl(r.cups, 2) + '</b></div>' +
        '<div class="kennzahl"><span>Esslöffel</span><b>' + K.deZahl(r.el, 1) + ' EL</b></div>' +
        '<div class="kennzahl"><span>Teelöffel</span><b>' + K.deZahl(r.tl, 1) + ' TL</b></div>' +
        '<div class="kennzahl"><span>Volumen</span><b>' + K.deZahl(r.ml, 0) + ' ml</b></div></div>';
      else html = '<div class="kennzahlen"><div class="kennzahl"><span>Gewicht</span><b class="faktor-anzeige">' + K.deZahl(r.g, r.g < 10 ? 1 : 0) + ' g</b></div>' +
        '<div class="kennzahl"><span>Volumen</span><b>' + K.deZahl(r.ml, 0) + ' ml</b></div>' +
        '<div class="kennzahl"><span>1 Cup</span><b>' + K.deZahl(z.gProCup, 0) + ' g</b></div>' +
        '<div class="kennzahl"><span>1 EL / 1 TL</span><b>' + K.deZahl(z.gProCup / 16, 1) + ' / ' + K.deZahl(z.gProCup / 48, 1) + ' g</b></div></div>';
      html += weg(r.schritte);
      html += '<p class="unterzeile">Quelle des Werts: <a href="' + D.QUELLEN.ka.url + '" rel="noopener" target="_blank">' + h(D.QUELLEN.ka.name) + '</a> – Eintrag „' + h(z.en) + '“: ' + h(z.volText) + ' = ' + z.g + ' g. Volumen nach NIST (1 Cup ≈ 236,6 ml). Gilt für gestrichene Messbecher und Messlöffel.' + (z.fluessig ? ' Flüssigkeiten misst die Werkbank im Rezept in Milliliter.' : '') + '</p>';
      $('wa-ergebnis').innerHTML = html;
      fragmentSetzen('w=' + sel.value + '~' + menge + '~' + einheit);
    }
    var q = new URLSearchParams(location.search);
    if (q.get('zutat') && hat(sel, q.get('zutat'))) sel.value = q.get('zutat');
    function ausFragment() {
      var f = fragment('w');
      if (!f || !hat(sel, f[0])) return false;
      sel.value = f[0]; if (num(f[1]) > 0) $('wa-menge').value = num(f[1]); if (f[2] && hat($('wa-einheit'), f[2])) $('wa-einheit').value = f[2];
      return true;
    }
    ausFragment();
    window.addEventListener('hashchange', function () { if (ausFragment()) { rechnen(); $('waage').scrollIntoView({ block: 'start' }); } });
    $('waage').addEventListener('input', rechnen);
    $('waage').addEventListener('change', rechnen);
    linkKnopf($('wa-link'), $('wa-status'));
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
      var r = w === null ? null : K.ofenRechnen(w, art);
      if (!r) { $('of-ergebnis').innerHTML = w === null ? '' : '<p>Dieser Wert liegt außerhalb üblicher Ofentemperaturen (30–320 °C bzw. 100–600 °F). Einheit prüfen?</p>'; return; }
      $('of-ergebnis').innerHTML = '<div class="kennzahlen"><div class="kennzahl"><span>Ober-/Unterhitze</span><b>' + K.deZahl(r.ouRund, 0) + ' °C</b></div><div class="kennzahl"><span>Umluft (≈ −20 °C)</span><b>' + K.deZahl(r.umluftRund, 0) + ' °C</b></div><div class="kennzahl"><span>Fahrenheit</span><b>' + K.deZahl(r.fRund, 0) + ' °F</b></div></div>' + weg(r.schritte);
      fragmentSetzen('o=' + art + '~' + w);
    }
    function ausFragment() {
      var f = fragment('o');
      if (!f || !hat($('of-art'), f[0]) || num(f[1]) === null) return false;
      $('of-art').value = f[0]; $('of-wert').value = num(f[1]); return true;
    }
    ausFragment();
    window.addEventListener('hashchange', function () { if (ausFragment()) { rechnen(); $('ofen').scrollIntoView({ block: 'start' }); } });
    $('ofen').addEventListener('input', rechnen); $('ofen').addEventListener('change', rechnen);
    linkKnopf($('of-link'), $('of-status'));
    rechnen();
  })();

  /* ---------- Germ-Rechner ---------- */
  (function germ() {
    if (!$('ge-menge')) return;
    function rechnen() {
      var m = num($('ge-menge').value), art = $('ge-art').value;
      var r = m === null ? null : K.germRechnen(m, art);
      if (!r) { $('ge-ergebnis').innerHTML = m === null ? '' : '<p>Bitte eine Menge größer als 0 eingeben.</p>'; return; }
      // Bezug: 7 g Trockengerm ≈ 500 g Mehl; 42 g Frischgerm ≈ 1000 g Mehl (Dr. Oetker AT)
      $('ge-ergebnis').innerHTML = '<div class="kennzahlen"><div class="kennzahl"><span>Mehl</span><b>' + K.deZahl(r.mehl, 0) + ' g</b></div><div class="kennzahl"><span>Frischgerm</span><b>' + K.deZahl(r.frisch, 1) + ' g</b></div><div class="kennzahl"><span>Trockengerm</span><b>' + K.deZahl(r.trocken, 1) + ' g</b></div><div class="kennzahl"><span>Würfel / Pkg.</span><b>' + K.deZahl(r.wuerfel, 2) + ' / ' + K.deZahl(r.pkg, 2) + '</b></div></div>' + weg(r.schritte) +
        '<p class="unterzeile">Bezugsgrößen: 1 Würfel (42 g) für etwa 1 kg Mehl, 1 Päckchen Trockengerm (7 g) für etwa 500 g Mehl – <a href="' + D.QUELLEN.oetkerGerm.url + '" rel="noopener" target="_blank">' + h(D.QUELLEN.oetkerGerm.name) + '</a>.</p>';
      fragmentSetzen('g=' + art + '~' + m);
    }
    function ausFragment() {
      var f = fragment('g');
      if (!f || !hat($('ge-art'), f[0]) || !(num(f[1]) > 0)) return false;
      $('ge-art').value = f[0]; $('ge-menge').value = num(f[1]); return true;
    }
    ausFragment();
    window.addEventListener('hashchange', function () { if (ausFragment()) { rechnen(); $('germ').scrollIntoView({ block: 'start' }); } });
    $('germ').addEventListener('input', rechnen); $('germ').addEventListener('change', rechnen);
    linkKnopf($('ge-link'), $('ge-status'));
    rechnen();
  })();

  /* ---------- Einkaufsliste ---------- */
  (function einkauf() {
    var box = $('einkauf');
    if (!box || !$('ek-rezepte')) return;
    var SCHLUESSEL = 'kik-einkauf-v1';
    var daten = { rezepte: [], vorrat: '', abgehakt: {} };
    var geladen = false;
    try { var g = JSON.parse(localStorage.getItem(SCHLUESSEL) || 'null'); if (g) { daten = Object.assign(daten, g); geladen = true; } } catch (e) { /* ohne Speicher weiter */ }
    if (geladen) $('ek-gespeichert').textContent = 'Gespeicherte Liste aus diesem Browser geladen.';
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
    // Liste als Text aufs Handy: Teilen-Dialog des Geräts, sonst WhatsApp-Link und Zwischenablage. Abgehakte Posten fehlen.
    $('ek-handy').addEventListener('click', function () {
      var zeilen = [];
      Array.prototype.forEach.call($('ek-liste').querySelectorAll('.liste-gruppe'), function (g) {
        var posten = [];
        Array.prototype.forEach.call(g.querySelectorAll('li'), function (li) {
          var c = li.querySelector('input'); if (c && c.checked) return;
          posten.push('☐ ' + Array.prototype.map.call(li.childNodes, function (n) { return (n.textContent || '').trim(); }).filter(Boolean).join(' ').replace(/\s+/g, ' '));
        });
        if (posten.length) zeilen.push(g.querySelector('h3').textContent.toUpperCase(), posten.join('\n'), '');
      });
      var status = $('ek-gespeichert');
      if (!zeilen.length) { status.textContent = 'Die Liste ist leer – oder alles ist schon abgehakt.'; return; }
      var text = 'Einkaufsliste\n\n' + zeilen.join('\n') + '\n(erstellt mit kuechenideenkompass.de)';
      try { if (typeof window.gtag === 'function' && window['ga-disable-G-T00HRG2YVF'] === false) window.gtag('event', 'einkaufsliste_handy'); } catch (e) {}
      if (navigator.share) { navigator.share({ title: 'Einkaufsliste', text: text }).catch(function () {}); return; }
      // Ohne Teilen-Dialog (meist am Computer): nur kopieren. WhatsApp öffnet sich erst, wenn man den Link bewusst anklickt.
      var wa = 'https://wa.me/?text=' + encodeURIComponent(text);
      var zeigen = function (t) { status.innerHTML = ''; status.appendChild(document.createTextNode(t + ' ')); var a = document.createElement('a'); a.href = wa; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'In WhatsApp öffnen'; status.appendChild(a); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { zeigen('Liste kopiert – in SMS oder Notizen einfügen, oder:'); }, function () { zeigen('Kopieren nicht möglich.'); });
      else zeigen('Teilen ist hier nicht verfügbar:');
    });
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
