/* Küchenideenkompass – Bedienung für Kerntemperatur-Prüfer und Kühlschrank-Fristen (Tabellen stehen schon im HTML) */
(function () {
  'use strict';
  var R = window.KIK.referenz;
  var $ = function (id) { return document.getElementById(id); };
  function h(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function jede(liste, fn) { Array.prototype.forEach.call(liste, fn); }

  function quelleHtml(id) {
    var q = R.QUELLEN[id];
    return '<p class="unterzeile">Quelle: <a href="' + h(q.url) + '" rel="noopener" target="_blank">' + h(q.name) + '</a>, abgerufen am ' + R.ABRUF + (q.weg ? ' (' + h(q.weg) + ')' : '') + '.</p>';
  }
  function wegHtml(schritte) {
    return '<div class="rechenweg"><h3>Rechenweg</h3><ol>' + schritte.map(function (s) { return '<li>' + h(s) + '</li>'; }).join('') + '</ol></div>';
  }
  function kopieren(text, statusEl, ok) {
    function fertig() { statusEl.textContent = ok; }
    function ersatz() {
      var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); fertig(); } catch (e) { statusEl.textContent = 'Kopieren nicht möglich – der Link steht in der Adresszeile.'; }
      document.body.removeChild(t);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(fertig, ersatz); else ersatz();
  }
  function herunterladen(name, inhalt) {
    var a = document.createElement('a');
    var url = URL.createObjectURL(new Blob([inhalt], { type: 'text/csv;charset=utf-8' }));
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  // Adresse erst nach einer Eingabe ändern, nicht schon beim Laden
  var bedient = false;
  ['input', 'change', 'click'].forEach(function (e) { document.addEventListener(e, function () { bedient = true; }, true); });
  function hashSetzen(teil) {
    if (!bedient) return;
    try { history.replaceState(null, '', location.pathname + location.search + (teil ? '#' + teil : '')); } catch (e) { /* ohne History weiter */ }
  }
  function optionen(sel, gruppen, liste, gruppeVon) {
    sel.innerHTML = gruppen.map(function (g) {
      var z = liste.filter(function (x) { return gruppeVon(x) === g.id; });
      return z.length ? '<optgroup label="' + h(g.name) + '">' + z.map(function (x) { return '<option value="' + h(x.id) + '">' + h(x.name) + '</option>'; }).join('') + '</optgroup>' : '';
    }).join('');
  }

  /* Suche und Gruppenfilter über eine fertig gerenderte Tabelle; Zeilen tragen data-id */
  function tabelle(praefix, liste, csvFn, dateiname) {
    var feld = $(praefix + '-suche'), info = $(praefix + '-info'), tab = $(praefix + '-tabelle');
    if (!feld || !tab) return;
    var zeilen = tab.querySelectorAll('tbody tr[data-id]');
    function gruppe() { var g = document.querySelector('input[name="' + praefix + '-gruppe"]:checked'); return g ? g.value : 'alle'; }
    function sichtbare() { return R.filtern(liste, feld.value, gruppe()); }
    function filtern() {
      var ids = {}, treffer = sichtbare();
      treffer.forEach(function (z) { ids[z.id] = true; });
      jede(zeilen, function (tr) { tr.hidden = !ids[tr.getAttribute('data-id')]; });
      info.textContent = treffer.length ? treffer.length + ' von ' + liste.length + ' Einträgen' : 'Kein Eintrag passt. Suchwort kürzen oder „alle“ wählen – was hier fehlt, haben wir in den Quellen nicht gefunden.';
      $(praefix + '-leer').hidden = treffer.length > 0;
    }
    feld.addEventListener('input', filtern);
    jede(document.querySelectorAll('input[name="' + praefix + '-gruppe"]'), function (r) { r.addEventListener('change', filtern); });
    $(praefix + '-csv').addEventListener('click', function () {
      var t = sichtbare();
      if (!t.length) { info.textContent = 'Nichts zu exportieren: Die Tabelle ist leer gefiltert.'; return; }
      herunterladen(dateiname, csvFn(t));
      info.textContent = t.length + ' Zeilen als CSV gespeichert (Trennzeichen Semikolon, mit Quelle und Abrufdatum).';
    });
    $(praefix + '-druck').addEventListener('click', function () { window.print(); });
    filtern();
  }

  /* ---------- Kerntemperatur ---------- */
  (function kern() {
    var sel = $('kt-zeile');
    if (!sel) return;
    optionen(sel, R.KERN_GRUPPEN, R.KERN, function (z) { return z.gruppen[0]; });
    var TEXT = { erreicht: 'Zielwert erreicht', darunter: 'Noch nicht erreicht', darueber: 'Über dem Richtbereich', 'ohne-zahl': 'Sichtprobe statt Gradzahl', ungueltig: 'Eingabe prüfen' };
    function rechnen() {
      var id = sel.value, wert = $('kt-wert').value, einheit = $('kt-einheit').value;
      var z = R.KERN.filter(function (x) { return x.id === id; })[0];
      if (!z) return;
      var leer = !String(wert).trim();
      var r = leer && z.c !== null ? null : R.kernPruefen(id, wert, einheit);
      var html = '<div class="befund befund-' + (r ? r.status : 'offen') + '"><span class="befund-art">' + (z.art === 'sicherheit' ? 'Mindestwert einer Behörde' : 'Garprobe – Qualität, keine Sicherheitsaussage') + '</span><b>' + h(r ? TEXT[r.status] : 'Zielwert') + '</b><p>' + h(z.name) + ': ' + h(z.wert) + '.</p></div>';
      if (!r) html += '<p class="unterzeile">Gemessene Temperatur eingeben – dann steht hier, wie weit sie vom Zielwert entfernt ist und was als Nächstes zu tun ist.</p>';
      else if (r.status === 'ungueltig') html += '<p class="unterzeile">' + h(r.grund) + '</p>';
      else {
        html += wegHtml(r.schritte) + '<p class="naechster"><b>Nächster Schritt:</b> ' + h(r.naechster) + '</p>';
        if (z.art === 'sicherheit' && r.status === 'erreicht' && z.quelle === 'fsis' && r.c < 70) html += '<p class="unterzeile">Zum Vergleich: Das BfR empfiehlt für Fleisch und Geflügel mindestens 70 °C für 2 Minuten. Ihr Messwert liegt ' + R.zahl(70 - r.c, 1) + ' °C darunter.</p>';
      }
      if (z.hinweis) html += '<p class="unterzeile">' + h(z.hinweis) + '</p>';
      html += quelleHtml(z.quelle);
      $('kt-ergebnis').innerHTML = html;
      hashSetzen(R.kernLink(id, wert, einheit));
    }
    function setzen(id, wert, einheit) {
      sel.value = id; $('kt-wert').value = wert === null || wert === undefined ? '' : String(wert).replace('.', ','); $('kt-einheit').value = einheit === 'f' ? 'f' : 'c';
      rechnen();
    }
    $('kerntemperatur').addEventListener('input', function (e) { if (e.target.id !== 'kt-suche') rechnen(); });
    $('kerntemperatur').addEventListener('change', function (e) { if (e.target.name !== 'kt-gruppe') rechnen(); });
    $('kerntemperatur').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-beispiel],[data-nimm]') : null;
      if (!b) return;
      if (b.hasAttribute('data-nimm')) { setzen(b.getAttribute('data-nimm'), '', $('kt-einheit').value); sel.focus(); $('kt-pruefer').scrollIntoView({ block: 'start' }); return; }
      var t = b.getAttribute('data-beispiel').split(',');
      setzen(t[0], t[1], t[2]);
      $('kt-status').textContent = 'Beispielwert geladen – kein Messwert von uns, nur zum Ausprobieren.';
    });
    $('kt-link').addEventListener('click', function () {
      kopieren(location.origin + location.pathname + '#' + R.kernLink(sel.value, $('kt-wert').value, $('kt-einheit').value), $('kt-status'), 'Link kopiert. Er enthält nur die Auswahl und den Messwert.');
    });
    function ausLink() { var s = R.linkLesen(location.hash); if (s && s.art === 'k') { setzen(s.id, s.wert, s.einheit); return true; } return false; }
    if (!ausLink()) rechnen();
    window.addEventListener('hashchange', function () { if (ausLink()) $('kt-pruefer').scrollIntoView({ block: 'start' }); });
    tabelle('kt', R.KERN, R.kernCsv, 'kerntemperaturen-kuechenideenkompass.csv');
  })();

  /* ---------- Kühlschrank-Fristen ---------- */
  (function lager() {
    var sel = $('hb-zeile');
    if (!sel) return;
    optionen(sel, R.LAGER_GRUPPEN, R.LAGER, function (z) { return z.gruppe; });
    function heuteIso() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    function vorTagen(n) { var d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    var LAGE = { frisch: 'Innerhalb der Frist', fenster: 'Jetzt verbrauchen', abgelaufen: 'Frist überschritten', zukunft: 'Datum liegt in der Zukunft' };
    function rechnen() {
      var id = sel.value, datum = $('hb-datum').value;
      var z = R.LAGER.filter(function (x) { return x.id === id; })[0];
      if (!z) return;
      $('hb-datum-label').textContent = 'Tag: ' + z.ab;
      var r = R.fristBerechnen(id, datum, heuteIso());
      var html = '';
      if (r.status === 'ungueltig') html = '<div class="befund befund-offen"><b>' + h(z.name) + ': ' + h(R.fristText(z)) + '</b><p>' + h(r.grund) + '</p></div>';
      else if (r.status === 'stunden') html = '<div class="befund befund-darunter"><span class="befund-art">Frist in Stunden</span><b>Noch am selben Tag verbrauchen</b><p>' + h(z.name) + ': ' + h(R.fristText(z)) + '.</p></div>' + wegHtml(r.schritte);
      else {
        var klasse = r.lage === 'abgelaufen' ? 'darunter' : r.lage === 'fenster' ? 'darueber' : 'erreicht';
        html = '<div class="befund befund-' + klasse + '"><span class="befund-art">' + h(LAGE[r.lage] || '') + '</span><b>Verbrauchen bis ' + h(r.frueh === r.spaet ? r.spaetText : r.fruehText + ' – spätestens ' + r.spaetText) + '</b><p>' + h(z.name) + ': ' + h(R.fristText(z)) + ' ab ' + h(z.ab) + '.</p></div>' + wegHtml(r.schritte);
        var n = r.lage === 'abgelaufen' ? 'Die längste Frist der Quelle ist seit ' + (-r.rest) + (r.rest === -1 ? ' Tag' : ' Tagen') + ' vorbei. Nicht mehr essen – auch wenn es noch gut riecht: Krankheitserreger sieht, riecht und schmeckt man nicht.'
          : r.lage === 'fenster' ? 'Die kürzere Frist ist erreicht. Heute verbrauchen und dabei durcherhitzen (BfR: 70 °C für 2 Minuten) – oder wegwerfen.'
          : r.lage === 'zukunft' ? 'Das Datum liegt nach dem heutigen Tag. Für eine Planung stimmt die Rechnung trotzdem.'
          : 'Noch ' + r.rest + (r.rest === 1 ? ' Tag' : ' Tage') + ' bis zum Ende der längsten Frist. Was Sie bis dahin nicht essen, rechtzeitig einfrieren.' + (z.tk ? ' Tiefkühler laut Quelle: ' + z.tk + ' (Qualität, bei −18 °C).' : '');
        html += '<p class="naechster"><b>Nächster Schritt:</b> ' + h(n) + '</p>';
      }
      html += '<p class="unterzeile">Ein aufgedrucktes Verbrauchsdatum („zu verbrauchen bis“) geht immer vor. Die Frist setzt voraus, dass die Speise durchgehend gekühlt war.</p>' + quelleHtml(z.quelle);
      $('hb-ergebnis').innerHTML = html;
      hashSetzen(R.lagerLink(id, datum));
    }
    function setzen(id, datum) { sel.value = id; if (datum) $('hb-datum').value = datum; rechnen(); }
    $('haltbarkeit').addEventListener('input', function (e) { if (e.target.id !== 'hb-suche') rechnen(); });
    $('haltbarkeit').addEventListener('change', function (e) { if (e.target.name !== 'hb-gruppe') rechnen(); });
    $('haltbarkeit').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-beispiel],[data-nimm]') : null;
      if (!b) return;
      if (b.hasAttribute('data-nimm')) { setzen(b.getAttribute('data-nimm')); sel.focus(); $('hb-rechner').scrollIntoView({ block: 'start' }); return; }
      var t = b.getAttribute('data-beispiel').split(',');
      setzen(t[0], vorTagen(parseInt(t[1], 10) || 0));
      $('hb-status').textContent = 'Beispiel geladen: ' + (t[1] === '0' ? 'heute' : 'vor ' + t[1] + ' Tagen') + ' als Starttag.';
    });
    $('hb-link').addEventListener('click', function () {
      kopieren(location.origin + location.pathname + '#' + R.lagerLink(sel.value, $('hb-datum').value), $('hb-status'), 'Link kopiert. Er enthält nur das Lebensmittel und das Datum.');
    });
    function ausLink() { var s = R.linkLesen(location.hash); if (s && s.art === 'h') { setzen(s.id, s.datum); return true; } return false; }
    $('hb-datum').value = heuteIso();
    if (!ausLink()) rechnen();
    window.addEventListener('hashchange', function () { if (ausLink()) $('hb-rechner').scrollIntoView({ block: 'start' }); });
    tabelle('hb', R.LAGER, R.lagerCsv, 'kuehlschrank-fristen-kuechenideenkompass.csv');
  })();
})();
