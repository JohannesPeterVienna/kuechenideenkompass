/*
 * Küchenideenkompass – Anzeigenplätze
 * Ein Platz wird erst reserviert und befüllt, wenn unten eine Slot-ID eingetragen ist.
 * Leere ID = Platz bleibt verborgen, es entsteht keine Lücke. Auch mit ID bleibt der Platz zu, bis Google
 * wirklich eine Anzeige liefert (data-ad-status="filled", siehe werkbank.css).
 * Plätze nur in Kopf, Seitenleiste und Fließtext – nie im Werkzeugblock.
 */
(function () {
  'use strict';
  var KUNDE = 'ca-pub-7811071715414905';
  var SLOTS = {
    billboard: '7497607759',   // 970×250, ab 1024 px, unter dem Kopf (responsiver Block in fester Größe)
    leaderboard: '5774811012', // 728×90, ab 768 px, unter dem Kopf
    mobil: '5396758258',       // 320×100, unter 768 px, unter dem Kopf
    halfpage: '1292301217',    // 300×600, Seitenleiste ab 1200 px (responsiver Block in fester Größe)
    skyscraper: '5064364572',  // 160×600, Ersatz für die Seitenleiste
    inartikel: '9522484334'    // 300×250, nach dem 3. Absatz langer Ratgeber
  };
  var FORMATE = {
    billboard: [970, 250], leaderboard: [728, 90], mobil: [320, 100],
    halfpage: [300, 600], skyscraper: [160, 600], inartikel: [300, 250]
  };

  if (document.body.getAttribute('data-werbung') !== 'ja') return;

  function wahl(platz, el) {
    var b = window.innerWidth;
    if (platz === 'kopf') {
      // Werkzeugseiten: auf dem Handy kein Kopfplatz (Werkzeug folgt direkt darunter)
      if (b < 768 && el && el.hasAttribute('data-nur-breit')) return null;
      if (b >= 1024 && SLOTS.billboard) return 'billboard';
      if (b >= 768 && SLOTS.leaderboard) return 'leaderboard';
      if (b < 768 && b >= 360 && SLOTS.mobil) return 'mobil'; // 320 px Banner braucht Platz für den Seitenrand
      return null;
    }
    if (platz === 'seite') {
      if (b < 1200) return null;
      return SLOTS.halfpage ? 'halfpage' : (SLOTS.skyscraper ? 'skyscraper' : null);
    }
    if (platz === 'artikel') return SLOTS.inartikel ? 'inartikel' : null;
    return null;
  }

  var plaetze = document.querySelectorAll('[data-anzeige]');
  var befuellt = 0;
  Array.prototype.forEach.call(plaetze, function (el) {
    var format = wahl(el.getAttribute('data-anzeige'), el);
    if (!format) { el.hidden = true; return; }
    var masz = FORMATE[format];
    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'inline-block';
    ins.style.width = masz[0] + 'px';
    ins.style.height = masz[1] + 'px';
    ins.setAttribute('data-ad-client', KUNDE);
    ins.setAttribute('data-ad-slot', SLOTS[format]);
    el.style.minHeight = (masz[1] + 20) + 'px';
    el.appendChild(ins);
    el.hidden = false;
    erstMitAnzeigeZeigen(el, ins);
    befuellt++;
  });

  // Rückfall für Browser ohne :has(): Der Platz bekommt .anzeige--geliefert (werkbank.css zeigt ihn dann)
  // erst, wenn Google data-ad-status="filled" setzt. "unfilled" oder keine Antwort: bleibt zu.
  function erstMitAnzeigeZeigen(el, ins) {
    if (!(window.CSS && CSS.supports && CSS.supports('selector(:has(a))'))) document.documentElement.classList.add('kein-has');
    var pruefen = function () {
      if (ins.getAttribute('data-ad-status') === 'filled') el.classList.add('anzeige--geliefert');
      else el.classList.remove('anzeige--geliefert');
    };
    pruefen();
    if (typeof MutationObserver === 'function') new MutationObserver(pruefen).observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });
  }

  // Die Bibliothek steht statisch im head jeder indexierbaren Seite (Kontoprüfung durch AdSense);
  // Anzeigen erscheinen nur in befüllten Plätzen.
  // Der Loader steht statisch im head; nur falls er fehlt, wird er hier einmal nachgeladen.
  if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + KUNDE;
    document.head.appendChild(s);
  }
  for (var i = 0; i < befuellt; i++) { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
})();
