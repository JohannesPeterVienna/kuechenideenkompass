/* Küchenideenkompass – Schnellrechner auf der Startseite: Zutatenzeilen auf neue Portionen umrechnen */
(function () {
  'use strict';
  var K = window.KIK.kern;
  var $ = function (id) { return document.getElementById(id); };
  if (!$('sr-zutaten')) return;
  function h(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { var x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : null; }
  var BEISPIEL = '25 dag glattes Mehl\n1/8 l Obers\n25 dag Topfen\n3 Eier\n1 Pkg. Backpulver\n1 Prise Salz';
  var letzterText = '';

  function rechnen() {
    var aus = $('sr-ergebnis'), text = $('sr-zutaten').value;
    var von = num($('sr-von').value), nach = num($('sr-nach').value);
    letzterText = '';
    $('sr-weiter').hidden = true;
    if (!text.trim()) { aus.innerHTML = '<p class="unterzeile">Zutaten einfügen – eine pro Zeile – oder das Beispiel laden.</p>'; return; }
    if (text.length > 20000) { aus.innerHTML = '<p class="unterzeile">Der Text ist zu lang für den Schnellrechner (mehr als 20.000 Zeichen).</p>'; return; }
    if (von === null || nach === null || von <= 0 || nach <= 0 || von > 10000 || nach > 10000) { aus.innerHTML = '<p class="unterzeile">Bitte beide Portionenzahlen als Zahl größer als 0 eingeben.</p>'; return; }
    var f = nach / von, region = $('sr-region').value, einheiten = $('sr-einheiten').value;
    var zeilen = K.rezeptLesen(text);
    var erg = K.skalieren(zeilen, { faktor: f, einheiten: einheiten, region: region });
    var html = '<p class="unterzeile"><b>Rechenweg:</b> ' + K.deZahl(nach, 2) + ' ÷ ' + K.deZahl(von, 2) + ' = Faktor ' + K.deZahl(f, 3) + '. Jede Menge wird damit multipliziert und so gerundet, wie man abwiegt; „≈“ kennzeichnet Gerundetes.</p><table class="zutaten"><tbody>';
    var klartext = [];
    erg.zeilen.forEach(function (z, i) {
      if (z.ueberschrift) { html += '<tr class="ue"><td colspan="3">' + h(z.name) + '</td></tr>'; klartext.push(z.name + ':'); return; }
      var ein = z.einheit ? K.einheitText(z.einheit, z.menge) : '';
      if (einheiten === 'at' && z.einheit === 'l' && /[⅛¼⅜½⅝¾⅞]/.test(z.text)) ein = 'l';
      var notiz = [];
      if (z.unsicher) notiz.push(z.unsicher);
      if (z.eiHinweis) notiz.push(z.eiHinweis);
      if (z.pkgHinweis) notiz.push(z.pkgHinweis);
      if (z.flags.indexOf('abschmecken') >= 0) notiz.push('abschmecken');
      var name = z.name || zeilen[i].roh;
      html += '<tr><td class="m">' + (z.menge === null ? '' : (z.gerundet ? '≈ ' : '') + h(z.text)) + '</td><td class="e">' + h(ein) + '</td><td>' + h(name) + (notiz.length ? '<span class="notiz">' + h(notiz.join(' · ')) + '</span>' : '') + '</td></tr>';
      klartext.push([z.menge === null ? '' : z.text, ein, name].filter(Boolean).join(' '));
    });
    html += '</tbody></table>';
    if (erg.hinweise.length) {
      html += '<div class="nichtlinear"><h4>Was nicht linear mitwächst</h4><dl>';
      erg.hinweise.forEach(function (hw) { html += '<dt>' + h(hw.titel) + '</dt><dd>' + h(hw.text) + '</dd>'; });
      html += '</dl></div>';
    }
    aus.innerHTML = html;
    letzterText = klartext.join('\n');
    var w = $('sr-weiter');
    w.href = '/rezept-umrechnen/#r=' + K.kodieren({ z: text, g: 'portionen', v: String(von), n: String(nach), e: einheiten, r: region });
    w.hidden = false;
  }

  $('schnellrechner').addEventListener('input', rechnen);
  $('schnellrechner').addEventListener('change', rechnen);
  $('sr-beispiel').addEventListener('click', function () {
    $('sr-zutaten').value = BEISPIEL; $('sr-von').value = 4; $('sr-nach').value = 6;
    $('sr-status').textContent = 'Beispielzeilen geladen – zum Ausprobieren, kein geprüftes Rezept.';
    rechnen();
  });
  $('sr-leeren').addEventListener('click', function () { $('sr-zutaten').value = ''; $('sr-status').textContent = ''; rechnen(); $('sr-zutaten').focus(); });
  $('sr-kopieren').addEventListener('click', function () {
    var st = $('sr-status');
    if (!letzterText) { st.textContent = 'Noch kein Ergebnis zum Kopieren.'; return; }
    function ok() { st.textContent = 'Umgerechnete Zutaten kopiert.'; }
    function nein() { st.textContent = 'Kopieren nicht möglich – bitte die Liste markieren und kopieren.'; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(letzterText).then(ok, nein); else nein();
  });
  // Tastatur: Strg/Cmd + Enter im Textfeld springt zum Ergebnis
  $('sr-zutaten').addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { rechnen(); $('sr-ergebnis').focus(); }
  });
  if (!$('sr-zutaten').value.trim()) $('sr-zutaten').value = BEISPIEL;
  rechnen();
})();
