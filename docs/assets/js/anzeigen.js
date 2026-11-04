/*
 * Küchenideenkompass – Anzeigenplätze
 * Ein Platz wird erst reserviert und befüllt, wenn unten eine Slot-ID eingetragen ist.
 * Leere ID = Platz bleibt verborgen, es entsteht keine Lücke.
 * Plätze nur in Kopf, Seitenleiste und Fließtext – nie im Werkzeugblock.
 */
(function () {
  'use strict';
  var KUNDE = 'ca-pub-7811071715414905';
  var SLOTS = {
    billboard: '',   // 970×250, ab 1024 px, unter dem Kopf
    leaderboard: '', // 728×90, ab 768 px, unter dem Kopf
    mobil: '',       // 320×100, unter 768 px, unter dem Kopf
    halfpage: '',    // 300×600, Seitenleiste ab 1200 px (nicht klebend)
    skyscraper: '',  // 160×600, Ersatz für die Seitenleiste
    inartikel: ''    // 300×250, nach dem 3. Absatz langer Ratgeber
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
      if (b < 768 && SLOTS.mobil) return 'mobil';
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
    befuellt++;
  });

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
