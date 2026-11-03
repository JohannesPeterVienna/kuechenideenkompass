/* Küchenideenkompass – Eier-Rechner EU · USA */
(function () {
  'use strict';
  var E = window.KIK.eier;
  var $ = function (id) { return document.getElementById(id); };
  if (!$('ei-rezept')) return;
  function h(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function z(x, st) { return x.toLocaleString('de-AT', { minimumFractionDigits: st || 0, maximumFractionDigits: st || 0 }); }
  function optionen() {
    return '<optgroup label="EU (Österreich, Deutschland)">' + E.EU.map(function (k) { return '<option value="' + k.id + '">EU ' + h(k.name) + '</option>'; }).join('') + '</optgroup>' +
      '<optgroup label="USA">' + E.US.map(function (k) { return '<option value="' + k.id + '">US ' + h(k.name) + '</option>'; }).join('') + '</optgroup>';
  }
  $('ei-rezept').innerHTML = optionen();
  $('ei-habe').innerHTML = optionen();
  $('ei-rezept').value = 'us-large';
  $('ei-habe').value = 'eu-m';

  function rechnen() {
    var n = parseFloat(String($('ei-anzahl').value).replace(',', '.'));
    var r = E.ersetzen($('ei-rezept').value, n, $('ei-habe').value);
    if (!r) { $('ei-ergebnis').innerHTML = '<p>Bitte eine Anzahl größer als 0 eingeben.</p>'; return; }
    var ganz = Math.max(1, Math.round(r.stueck));
    var html = '<div class="kennzahlen"><div class="kennzahl"><span>Sie brauchen</span><b>' + z(r.stueck, 1) + ' Eier</b></div>' +
      '<div class="kennzahl"><span>Ganze Eier</span><b>' + z(ganz) + '</b></div>' +
      '<div class="kennzahl"><span>Masse mit Schale</span><b>' + z(r.masseMitSchale) + ' g</b></div>' +
      '<div class="kennzahl"><span>ohne Schale ≈</span><b>' + z(r.masseOhneSchale) + ' g</b></div></div>';
    var abw = Math.abs(ganz - r.stueck) / r.stueck;
    html += '<p class="unterzeile">' + (abw > 0.12 ? 'Mit ' + z(ganz) + ' ganzen Eiern weichen Sie um gut ' + z(abw * 100) + ' % ab. Für Biskuit, Brandteig und Soufflé lieber verquirlen und auf ' + z(r.masseOhneSchale) + ' g abwiegen.' : 'Die Abweichung mit ganzen Eiern liegt unter 12 % – für die meisten Teige unkritisch.') +
      (r.annahme ? ' Für S und XL nennt die EU-Norm nur eine Grenze; der Rechner nimmt 50 g bzw. 76 g an.' : '') + '</p>';
    $('ei-ergebnis').innerHTML = html;
  }
  ['ei-anzahl', 'ei-rezept', 'ei-habe'].forEach(function (id) { $(id).addEventListener('input', rechnen); $(id).addEventListener('change', rechnen); });
  rechnen();
})();
