/*
 * Küchenideenkompass – Einwilligung & Reichweitenmessung
 * 1. Lädt die Datenschutzmitteilung von Google (Funding Choices, IAB TCF).
 * 2. Startet Google Analytics 4 (G-T00HRG2YVF) erst, wenn Zweck 1 und Anbieter 755
 *    zugestimmt wurden – oder direkt, wenn die DSGVO laut CMP nicht gilt.
 * 3. „Datenschutz-Einstellungen“ öffnet die Widerrufsmitteilung.
 */
(function () {
  'use strict';
  var PUB = 'pub-7811071715414905';
  var GA_ID = 'G-T00HRG2YVF';
  var gaGestartet = false;

  function skript(src) {
    var s = document.createElement('script');
    s.async = true; s.src = src;
    document.head.appendChild(s);
    return s;
  }

  // Signal-iframe, an dem Funding Choices erkennt, dass die Seite bereit ist
  function signalSetzen() {
    if (window.frames.googlefcPresent) return;
    if (!document.body) { setTimeout(signalSetzen, 30); return; }
    var f = document.createElement('iframe');
    f.style.cssText = 'width:0;height:0;border:0;display:none';
    f.name = 'googlefcPresent';
    f.title = '';
    f.setAttribute('aria-hidden', 'true');
    f.tabIndex = -1;
    document.body.appendChild(f);
  }

  function gaStarten() {
    if (gaGestartet) return;
    gaGestartet = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
    skript('https://www.googletagmanager.com/gtag/js?id=' + GA_ID);
  }

  function pruefen(tc) {
    if (!tc) return;
    if (tc.gdprApplies === false) { gaStarten(); return; }
    if (tc.eventStatus !== 'tcloaded' && tc.eventStatus !== 'useractioncomplete') return;
    var zweck1 = tc.purpose && tc.purpose.consents && tc.purpose.consents[1];
    var anbieter = tc.vendor && tc.vendor.consents && tc.vendor.consents[755];
    if (zweck1 && anbieter) gaStarten();
  }

  function aufTcf(versuche) {
    if (typeof window.__tcfapi === 'function') {
      window.__tcfapi('addEventListener', 2, function (tc, ok) { if (ok) pruefen(tc); });
      return;
    }
    if (versuche > 0) setTimeout(function () { aufTcf(versuche - 1); }, 250);
  }

  window.googlefc = window.googlefc || {};
  window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];

  skript('https://fundingchoicesmessages.google.com/i/' + PUB + '?ers=1');
  signalSetzen();
  aufTcf(80);

  // Widerruf / Einstellungen
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-datenschutz-einstellungen]');
    if (!t) return;
    e.preventDefault();
    window.googlefc.callbackQueue.push(function () {
      if (window.googlefc.showRevocationMessage) window.googlefc.showRevocationMessage();
    });
  });
})();
