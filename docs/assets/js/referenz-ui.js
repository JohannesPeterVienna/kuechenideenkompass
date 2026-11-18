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
  function herunterladen(name, inhalt) {
    var a = document.createElement('a');
    var url = URL.createObjectURL(new Blob([inhalt], { type: 'text/csv;charset=utf-8' }));
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  /*
   * Die Adresse wird nie verändert: Der Link entsteht erst beim Klick auf „Link kopieren“ und geht in die Zwischenablage.
   * Ein Fragment aus einem geöffneten Link hat das Kopf-Skript der Seite schon nach window.kikFragment gelegt und aus der Adresse entfernt.
   */
  function linkAusgeben(knopf, statusEl, fragment, ok) {
    var url = location.origin + location.pathname + '#' + fragment;
    knopf.setAttribute('data-link', url);
    function fertig() { statusEl.textContent = ok; }
    function zeigen() {
      statusEl.textContent = 'Kopieren nicht möglich – bitte den Link aus dem Feld kopieren: ';
      var f = document.createElement('input'); f.type = 'text'; f.readOnly = true; f.value = url; f.className = 'link-feld'; f.setAttribute('aria-label', 'Link zu diesem Ergebnis');
      statusEl.appendChild(f); f.focus(); f.select();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(fertig, zeigen); else zeigen();
  }
  function startFragment() { var f = window.kikFragment || location.hash; window.kikFragment = ''; return f; }
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
    function rechnen() {
      var id = sel.value, wert = $('kt-wert').value, einheit = $('kt-einheit').value;
      var z = R.KERN.filter(function (x) { return x.id === id; })[0];
      if (!z) return;
      var leer = !String(wert).trim();
      var r = leer && z.c !== null ? null : R.kernPruefen(id, wert, einheit);
      var art = z.art === 'sicherheit' ? 'Mindestwert einer Behörde' : 'Garprobe – Richtwert für die Qualität, keine Sicherheitsaussage';
      var html = '<div class="befund befund-' + (r ? r.status : 'offen') + '"><span class="befund-art">' + art + '</span><b>' + h(r ? r.titel : (z.art === 'sicherheit' ? 'Zielwert' : 'Richtwert')) + '</b><p>' + h(z.name) + ': ' + h(z.wert) + '.</p></div>';
      if (!r) html += '<p class="unterzeile">Gemessene Temperatur eingeben – dann steht hier, wie weit sie vom ' + (z.art === 'sicherheit' ? 'Zielwert' : 'Richtwert') + ' entfernt ist und was als Nächstes zu tun ist.</p>';
      else if (r.status === 'ungueltig') html += '<p class="unterzeile">' + h(r.grund) + '</p>';
      else {
        html += wegHtml(r.schritte) + '<p class="naechster"><b>Nächster Schritt:</b> ' + h(r.naechster) + '</p>';
        if (z.art === 'sicherheit' && r.status === 'erreicht' && z.quelle === 'fsis' && r.c < 70) html += '<p class="unterzeile">Zum Vergleich: Das BfR empfiehlt für Fleisch und Geflügel mindestens 70 °C für 2 Minuten. Ihr Messwert liegt ' + R.zahl(70 - r.c, r.stellen) + ' °C darunter.</p>';
      }
      if (z.hinweis) html += '<p class="unterzeile">' + h(z.hinweis) + '</p>';
      html += quelleHtml(z.quelle);
      $('kt-ergebnis').innerHTML = html;
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
      linkAusgeben($('kt-link'), $('kt-status'), R.kernLink(sel.value, $('kt-wert').value, $('kt-einheit').value), 'Link kopiert. Er enthält nur die Auswahl und den Messwert.');
    });
    function ausLink(f) { var s = R.linkLesen(f); if (s && s.art === 'k') { setzen(s.id, s.wert, s.einheit); return true; } return false; }
    if (!ausLink(startFragment())) rechnen();
    window.addEventListener('kik-fragment', function (e) { if (ausLink(e.detail)) $('kt-pruefer').scrollIntoView({ block: 'start' }); });
    tabelle('kt', R.KERN, R.kernCsv, 'kerntemperaturen-kuechenideenkompass.csv');
  })();

  /* ---------- Kühlschrank-Fristen ---------- */
  (function lager() {
    var sel = $('hb-zeile');
    if (!sel) return;
    optionen(sel, R.LAGER_GRUPPEN, R.LAGER, function (z) { return z.gruppe; });
    function heuteIso() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    function vorTagen(n) { var d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    var KLASSE = { frisch: 'erreicht', fenster: 'darueber', letzter: 'darueber', abgelaufen: 'darunter', zukunft: 'offen' };
    function rechnen() {
      var id = sel.value, datum = $('hb-datum').value;
      var z = R.LAGER.filter(function (x) { return x.id === id; })[0];
      if (!z) return;
      $('hb-datum-label').textContent = 'Tag: ' + z.ab;
      var r = R.fristBerechnen(id, datum, heuteIso());
      var html = '';
      if (r.status === 'ungueltig') html = '<div class="befund befund-offen"><b>' + h(z.name) + ': ' + h(R.fristText(z)) + '</b><p>' + h(r.grund) + '</p></div>';
      else {
        var bis = r.status === 'stunden' ? 'Noch am ' + r.spaetText + ' verbrauchen' : 'Verbrauchen bis ' + (r.frueh === r.spaet ? r.spaetText : r.fruehText + ' – spätestens ' + r.spaetText);
        html = '<div class="befund befund-' + KLASSE[r.lage] + '"><span class="befund-art">' + h(r.titel) + '</span><b>' + h(bis) + '</b><p>' + h(z.name) + ': ' + h(R.fristText(z)) + ', gezählt ab ' + h(R.abText(z)) + '.</p></div>' + wegHtml(r.schritte) +
          '<p class="naechster"><b>Nächster Schritt:</b> ' + h(r.naechster) + '</p>';
      }
      html += '<p class="unterzeile">Ein aufgedrucktes Verbrauchsdatum („zu verbrauchen bis“) geht immer vor. Die Frist setzt voraus, dass das Lebensmittel durchgehend gekühlt war.</p>' + quelleHtml(z.quelle);
      $('hb-ergebnis').innerHTML = html;
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
      linkAusgeben($('hb-link'), $('hb-status'), R.lagerLink(sel.value, $('hb-datum').value), 'Link kopiert. Er enthält nur das Lebensmittel und das Datum.');
    });
    function ausLink(f) { var s = R.linkLesen(f); if (s && s.art === 'h') { setzen(s.id, s.datum); return true; } return false; }
    $('hb-datum').value = heuteIso();
    if (!ausLink(startFragment())) rechnen();
    window.addEventListener('kik-fragment', function (e) { if (ausLink(e.detail)) $('hb-rechner').scrollIntoView({ block: 'start' }); });
    tabelle('hb', R.LAGER, R.lagerCsv, 'kuehlschrank-fristen-kuechenideenkompass.csv');
  })();
})();
