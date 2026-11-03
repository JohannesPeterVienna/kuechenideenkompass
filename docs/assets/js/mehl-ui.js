/* Küchenideenkompass – Mehltyp-Übersetzer AT · DE · CH */
(function () {
  'use strict';
  var M = window.KIK.mehl;
  var $ = function (id) { return document.getElementById(id); };
  if (!$('me-sorte')) return;
  function h(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pz(x) { return Math.round(x * 100) + ' %'; }
  function asche(x) { return x.toFixed(2).replace('.', ','); }

  var sel = $('me-sorte');
  var gruppen = [['weizen', 'Weizen'], ['roggen', 'Roggen']];
  sel.innerHTML = gruppen.map(function (g) {
    return '<optgroup label="' + g[1] + '">' + M.SORTEN.filter(function (s) { return s.korn === g[0]; }).map(function (s) {
      return '<option value="' + s.id + '">' + h(M.LAENDER[s.land] + ': ' + s.name) + '</option>';
    }).join('') + '</optgroup>';
  }).join('');

  function block(a, land) {
    var e = M.entsprechungen(a.id, land);
    var kopf = '<h3>' + h(M.LAENDER[land]) + '</h3>';
    if (e.keineSorten) return '<div class="kennzahl">' + kopf + '<p>Für ' + (a.korn === 'roggen' ? 'Roggen' : 'diese Getreideart') + ' nennt die Schweizer Verordnung keine eigenen Stufen. Im Handel helfen Angaben wie „hell“, „dunkel“ oder „Vollkorn“.</p></div>';
    if (e.treffer.length) {
      return '<div class="kennzahl">' + kopf + '<ul class="liste-eng">' + e.treffer.map(function (t) {
        var wie = t.anteil >= 0.999 ? 'liegt ganz im Bereich' : 'überschneidet sich zu ' + pz(t.anteil);
        return '<li><strong>' + h(t.sorte.name) + '</strong> <small>(' + h(M.bereichText(t.sorte)) + ')</small><br>' + wie + ' – gemeinsam: ' + asche(t.von) + '–' + asche(t.bis) + ' %</li>';
      }).join('') + '</ul></div>';
    }
    var txt = '<p>Keine ' + (land === 'at' ? 'österreichische' : land === 'de' ? 'deutsche' : 'Schweizer') + ' Sorte deckt diesen Bereich ab.';
    if (e.darunter && !e.darueber) txt += ' Am nächsten darunter: <strong>' + h(e.darunter.name) + '</strong> (' + h(M.bereichText(e.darunter)) + ').';
    if (e.darueber && !e.darunter) txt += ' Am nächsten darüber: <strong>' + h(e.darueber.name) + '</strong> (' + h(M.bereichText(e.darueber)) + ').';
    txt += '</p>';
    if (e.mischung) {
      txt += '<p><strong>Mischen:</strong> ' + pz(e.mischung.anteilTief) + ' ' + h(e.mischung.tief.name) + ' + ' + pz(e.mischung.anteilHoch) + ' ' + h(e.mischung.hoch.name) + ' ergibt rechnerisch die Bereichsmitte von ' + h(a.name) + '.</p>';
    }
    return '<div class="kennzahl">' + kopf + txt + '</div>';
  }

  function rechnen() {
    var a = M.sorte(sel.value);
    if (!a) return;
    var andere = ['at', 'de', 'ch'].filter(function (l) { return l !== a.land; });
    var html = '<p><strong>' + h(a.lang) + '</strong> – Mineralstoffgehalt ' + h(M.bereichText(a)) + ' der Trockenmasse.</p>';
    html += '<div class="kennzahlen mehl-ergebnis">' + andere.map(function (l) { return block(a, l); }).join('') + '</div>';
    var q = M.QUELLEN[a.q];
    html += '<p class="unterzeile">Grundlage: Normbereiche des Mineralstoffgehalts. Wert für ' + h(a.name) + ': <a href="' + q.url + '" rel="noopener" target="_blank">' + h(q.name) + '</a>. Die Körnung (glatt, griffig) ist eine eigene Eigenschaft und hier nicht enthalten.</p>';
    $('me-ergebnis').innerHTML = html;
  }

  var p = new URLSearchParams(location.search).get('sorte');
  if (p && M.sorte(p)) sel.value = p;
  sel.addEventListener('change', rechnen);
  rechnen();
})();
