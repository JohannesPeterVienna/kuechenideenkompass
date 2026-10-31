/* Küchenideenkompass – Backform-Übersetzer mit maßstabsgetreuer Skizze */
(function () {
  'use strict';
  var K = window.KIK.kern;
  var $ = function (id) { return document.getElementById(id); };
  var wurzel = $('backform');
  if (!wurzel) return;

  var VORGABE = {
    rund: [['d', 'Durchmesser (cm)', 26]],
    eckig: [['a', 'Länge (cm)', 24], ['b', 'Breite (cm)', 24]],
    kasten: [['a', 'Länge (cm)', 30], ['b', 'Breite (cm)', 11]],
    gugelhupf: [['d', 'Ø außen (cm)', 22], ['innen', 'Ø Rohr (cm)', 8]],
    blech: [['a', 'Länge (cm)', 40], ['b', 'Breite (cm)', 30]]
  };
  var NAME = { rund: 'Springform', eckig: 'eckige Form', kasten: 'Kastenform', gugelhupf: 'Gugelhupfform', blech: 'Blech' };
  function h(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function felder(p, start) {
    var typ = $(p + '-typ').value;
    var alt = {};
    Array.prototype.forEach.call($(p + '-masse').querySelectorAll('input[data-k]'), function (i) { alt[i.dataset.k] = i.value; });
    $(p + '-masse').innerHTML = VORGABE[typ].map(function (f) {
      var id = p + '-' + f[0];
      var v = (start && start[f[0]]) || alt[f[0]] || f[2];
      return '<div class="feld"><label for="' + id + '">' + f[1] + '</label><input type="number" inputmode="decimal" min="1" max="200" step="0.5" id="' + id + '" data-k="' + f[0] + '" value="' + h(v) + '"></div>';
    }).join('');
  }
  function lesen(p) {
    var f = { typ: $(p + '-typ').value };
    Array.prototype.forEach.call($(p + '-masse').querySelectorAll('input[data-k]'), function (i) { f[i.dataset.k] = parseFloat(String(i.value).replace(',', '.')); });
    var hh = parseFloat(String($(p + '-h').value).replace(',', '.'));
    if (hh > 0) f.h = hh;
    return f;
  }
  function beschreibung(f) {
    if (f.typ === 'rund') return 'Springform Ø ' + K.deZahl(f.d, 1) + ' cm';
    if (f.typ === 'gugelhupf') return 'Gugelhupf Ø ' + K.deZahl(f.d, 1) + ' cm (Rohr ' + K.deZahl(f.innen, 1) + ' cm)';
    return NAME[f.typ] + ' ' + K.deZahl(f.a, 1) + ' × ' + K.deZahl(f.b, 1) + ' cm';
  }

  function umriss(f, cx, cy, s, farbe, strich) {
    var attr = ' fill="none" stroke="' + farbe + '" stroke-width="3"' + (strich ? ' stroke-dasharray="9 6"' : '');
    if (f.typ === 'rund') return '<circle cx="' + cx + '" cy="' + cy + '" r="' + (f.d / 2 * s) + '"' + attr + '/>';
    if (f.typ === 'gugelhupf') return '<circle cx="' + cx + '" cy="' + cy + '" r="' + (f.d / 2 * s) + '"' + attr + '/><circle cx="' + cx + '" cy="' + cy + '" r="' + ((f.innen || 0) / 2 * s) + '"' + attr + '/>';
    var w = f.a * s, hh = f.b * s;
    return '<rect x="' + (cx - w / 2) + '" y="' + (cy - hh / 2) + '" width="' + w + '" height="' + hh + '" rx="' + (f.typ === 'blech' ? 2 : 4) + '"' + attr + '/>';
  }
  function ausdehnung(f) { return f.typ === 'rund' || f.typ === 'gugelhupf' ? [f.d, f.d] : [f.a, f.b]; }

  function skizze(a, b) {
    var W = 520, H = 340, rand = 34;
    var ea = ausdehnung(a), eb = ausdehnung(b);
    var maxW = Math.max(ea[0], eb[0]), maxH = Math.max(ea[1], eb[1]);
    var s = Math.min((W - 2 * rand) / maxW, (H - 2 * rand) / maxH);
    var cx = W / 2, cy = H / 2;
    // 10-cm-Raster als Maßstab
    var raster = '';
    var schritt = 10 * s;
    for (var x = cx % schritt; x < W; x += schritt) raster += '<line x1="' + x.toFixed(1) + '" y1="0" x2="' + x.toFixed(1) + '" y2="' + H + '"/>';
    for (var y = cy % schritt; y < H; y += schritt) raster += '<line x1="0" y1="' + y.toFixed(1) + '" x2="' + W + '" y2="' + y.toFixed(1) + '"/>';
    var mx = 16, my = H - 14;
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-labelledby="bf-svg-t"><title id="bf-svg-t">Maßstabsgetreue Skizze: ' + h(beschreibung(a)) + ' (grün, gestrichelt) und ' + h(beschreibung(b)) + ' (rot) übereinander</title>' +
      '<g stroke="#2E4A3A" stroke-opacity=".08" stroke-width="1">' + raster + '</g>' +
      umriss(a, cx, cy, s, '#2E4A3A', true) + umriss(b, cx, cy, s, '#B4441E', false) +
      '<line x1="' + mx + '" y1="' + my + '" x2="' + (mx + schritt) + '" y2="' + my + '" stroke="#1C2A22" stroke-width="2"/>' +
      '<line x1="' + mx + '" y1="' + (my - 5) + '" x2="' + mx + '" y2="' + (my + 5) + '" stroke="#1C2A22" stroke-width="2"/>' +
      '<line x1="' + (mx + schritt) + '" y1="' + (my - 5) + '" x2="' + (mx + schritt) + '" y2="' + (my + 5) + '" stroke="#1C2A22" stroke-width="2"/>' +
      '<text x="' + (mx + schritt + 8) + '" y="' + (my + 4) + '" font-size="13" font-family="Figtree, sans-serif" fill="#1C2A22">10 cm</text></svg>';
  }

  function rechnen() {
    var a = lesen('bf-von'), b = lesen('bf-nach');
    var ok = ['d', 'a', 'b'].every(function (k) { return a[k] === undefined || a[k] > 0; }) && ['d', 'a', 'b'].every(function (k) { return b[k] === undefined || b[k] > 0; });
    if (a.typ === 'gugelhupf' && !(a.innen < a.d)) ok = false;
    if (b.typ === 'gugelhupf' && !(b.innen < b.d)) ok = false;
    if (!ok) { $('bf-ergebnis').innerHTML = '<p>Bitte gültige Maße eingeben (Rohr kleiner als Außendurchmesser).</p>'; return; }
    var r = K.formFaktor(a, b);
    var f = r.volumen || r.flaeche;
    var basis = r.volumen ? 'Volumen (Fläche × Höhe)' : 'Bodenfläche';
    var html = '<div class="kennzahlen">' +
      '<div class="kennzahl"><span>Faktor</span><b class="faktor-anzeige">' + K.deZahl(f, 2) + '</b></div>' +
      '<div class="kennzahl"><span>Fläche alt</span><b>' + K.deZahl(r.a1, 0) + ' cm²</b></div>' +
      '<div class="kennzahl"><span>Fläche neu</span><b>' + K.deZahl(r.a2, 0) + ' cm²</b></div>' +
      '<div class="kennzahl"><span>Änderung</span><b>' + (f >= 1 ? '+' : '−') + K.deZahl(Math.abs(f - 1) * 100, 0) + ' %</b></div></div>';
    html += '<p>Alle Zutatenmengen mit <b>' + K.deZahl(f, 2) + '</b> multiplizieren (Grundlage: ' + basis + '). Aus 200 g werden ' + K.deZahl(200 * f, 0) + ' g, aus 3 Eiern rechnerisch ' + K.deZahl(3 * f, 1) + '.</p>';
    // Backzeit-Hinweis über die Teighöhe
    var hoehe = r.a1 / r.a2; // gleiche Teigmenge in neuer Form
    html += '<div class="nichtlinear"><h4>Backzeit & Teighöhe</h4><dl>';
    var hVerh = r.volumen ? b.h / a.h : 1; // Teighöhe neu/alt bei umgerechneter Menge
    if (Math.abs(hVerh - 1) < 0.05) {
      html += '<dt>Mit umgerechneter Menge</dt><dd>Die Teighöhe bleibt ' + (r.volumen ? 'praktisch ' : '') + 'gleich wie im Original – die Backzeit liegt deshalb meist nahe am Rezept. Bei deutlich größerer Fläche gart die Mitte etwas später: ab der angegebenen Zeit mit der Stäbchenprobe prüfen.</dd>';
    } else {
      html += '<dt>Mit umgerechneter Menge</dt><dd>Gerechnet über das Volumen: Der Teig steht mit ' + K.deZahl(b.h, 1) + ' statt ' + K.deZahl(a.h, 1) + ' cm Füllhöhe ' + (hVerh > 1 ? K.deZahl((hVerh - 1) * 100, 0) + ' % höher' : K.deZahl((1 - hVerh) * 100, 0) + ' % niedriger') + ' als im Original (Höhenverhältnis ' + K.deZahl(hVerh, 2) + '). ' + (hVerh > 1 ? 'Höherer Teig braucht deutlich länger und bei Bedarf etwas weniger Hitze; die Backzeit lässt sich nicht aus dem Faktor ableiten – mit der Stäbchenprobe prüfen.' : 'Flacherer Teig ist früher fertig – deutlich vor Ende der Rezeptzeit prüfen.') + '</dd>';
    }
    html += '<dt>Gleiche Menge in der neuen Form</dt><dd>Der Teig steht ' + (hoehe > 1 ? K.deZahl((hoehe - 1) * 100, 0) + ' % höher' : K.deZahl((1 - hoehe) * 100, 0) + ' % niedriger') + ' als im Original. ' + (hoehe > 1.05 ? 'Höherer Teig braucht länger und bei Bedarf etwas weniger Hitze, damit die Oberfläche nicht zu dunkel wird.' : hoehe < 0.95 ? 'Flacherer Teig ist früher fertig – deutlich vor Ende der Rezeptzeit prüfen.' : 'Der Unterschied ist gering.') + '</dd>';
    if (b.typ === 'rund' || a.typ === 'rund') {
      var dGleich = K.durchmesserFuer(r.a2);
      html += '<dt>Runde Form mit gleicher Fläche</dt><dd>Die neue Form entspricht einer Springform mit Ø ' + K.deZahl(dGleich, 1) + ' cm.</dd>';
    }
    html += '</dl></div>';
    var info = beschreibung(a) + ' → ' + beschreibung(b);
    html += '<div class="knopf-reihe"><a class="knopf akzent" href="/rezept-umrechnen/?faktor=' + encodeURIComponent(f.toFixed(4)) + '&amp;info=' + encodeURIComponent(info) + '">Faktor ' + K.deZahl(f, 2) + ' in die Werkbank übernehmen</a></div>';
    $('bf-ergebnis').innerHTML = html;
    $('bf-skizze').innerHTML = skizze(a, b);
    $('bf-legende').innerHTML = '<span class="l-von">' + h(beschreibung(a)) + ' (gestrichelt)</span><span class="l-nach">' + h(beschreibung(b)) + '</span>';
  }

  var q = new URLSearchParams(location.search);
  felder('bf-von'); felder('bf-nach', { d: 28 });
  ['bf-von', 'bf-nach'].forEach(function (p) {
    $(p + '-typ').addEventListener('change', function () { felder(p); rechnen(); });
  });
  wurzel.addEventListener('input', rechnen);
  Array.prototype.forEach.call(wurzel.querySelectorAll('[data-schnell]'), function (k) {
    k.addEventListener('click', function () {
      var t = k.getAttribute('data-schnell').split(',');
      $('bf-von-typ').value = 'rund'; felder('bf-von', { d: t[0] });
      $('bf-nach-typ').value = t[1]; felder('bf-nach', t[1] === 'rund' ? { d: t[2] } : { a: t[2], b: t[3] });
      $('bf-von-d').value = t[0];
      if (t[1] === 'rund') $('bf-nach-d').value = t[2]; else { $('bf-nach-a').value = t[2]; $('bf-nach-b').value = t[3]; }
      rechnen();
    });
  });
  if (q.get('von')) { $('bf-von-typ').value = 'rund'; felder('bf-von', { d: q.get('von') }); }
  rechnen();
})();
