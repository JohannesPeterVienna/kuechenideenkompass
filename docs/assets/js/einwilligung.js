/*
 * Küchenideenkompass – Einwilligung & Reichweitenmessung
 * 1. Setzt sofort die Consent-Mode-Grundwerte (alles abgelehnt, 500 ms Wartezeit),
 *    noch bevor irgendein Google-Skript geladen wird.
 * 2. Lädt die Datenschutzmitteilung von Google (Funding Choices, IAB TCF).
 * 3. Google Analytics 4 (G-T00HRG2YVF) misst nur, wenn BEIDE Signale zustimmen:
 *    a) TCF: Zweck 1 und Anbieter 755 (Google) erlaubt,
 *    b) Consent Mode der Google-CMP: analytics_storage = GRANTED.
 *    UNKNOWN, fehlende Werte oder ein noch offener Dialog zählen als Nein.
 *    Gilt die DSGVO laut CMP nicht (gdprApplies === false) und meldet die CMP
 *    keine Ablehnung, darf gemessen werden.
 * 4. Ablehnung oder Widerruf: consent update „denied“, ga-disable-Schalter an,
 *    keine weiteren Treffer. Erneute Zustimmung schaltet die Messung wieder ein.
 * 5. „Datenschutz-Einstellungen“ öffnet die Widerrufsmitteilung (callbackQueue).
 */
(function () {
  'use strict';
  var PUB = 'pub-7811071715414905';
  var GA_ID = 'G-T00HRG2YVF';
  var AUS_SCHALTER = 'ga-disable-' + GA_ID;
  var CM = { UNBEKANNT: 0, ERTEILT: 1, ABGELEHNT: 2 };

  // --- 1. dataLayer, gtag-Stub und Grundwerte vor jedem Google-Skript ---
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function () { window.dataLayer.push(arguments); };
  }
  window[AUS_SCHALTER] = true; // bis zur Zustimmung keine Messung
  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500
  });

  window.googlefc = window.googlefc || {};
  window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];

  var letzteTcDaten = null;
  var messStatus = 'offen';   // 'offen' | 'an' | 'aus'
  var skriptGeladen = false;

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

  // Analytics-Status aus dem Consent Mode der Google-CMP (0 = unbekannt)
  function statistikWert() {
    try {
      var fc = window.googlefc;
      if (!fc || typeof fc.getGoogleConsentModeValues !== 'function') return CM.UNBEKANNT;
      var werte = fc.getGoogleConsentModeValues();
      var w = werte && werte.analyticsStoragePurposeConsentStatus;
      var e = fc.ConsentModePurposeStatusEnum;
      if (e && w === e.GRANTED) return CM.ERTEILT;
      if (e && w === e.DENIED) return CM.ABGELEHNT;
      return typeof w === 'number' ? w : CM.UNBEKANNT;
    } catch (err) { return CM.UNBEKANNT; }
  }

  // true = messen, false = nicht messen, null = noch keine Entscheidung
  function entscheidung() {
    var tc = letzteTcDaten;
    var cm = statistikWert();
    if (cm === CM.ABGELEHNT) return false;
    if (!tc) return null;
    if (tc.gdprApplies === false) return true;
    if (tc.eventStatus !== 'tcloaded' && tc.eventStatus !== 'useractioncomplete') return null;
    var zweck1 = !!(tc.purpose && tc.purpose.consents && tc.purpose.consents[1]);
    var anbieter = !!(tc.vendor && tc.vendor.consents && tc.vendor.consents[755]);
    return zweck1 && anbieter && cm === CM.ERTEILT;
  }

  function messungEin() {
    window[AUS_SCHALTER] = false;
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    if (!skriptGeladen) {
      skriptGeladen = true;
      window.gtag('js', new Date());
      window.gtag('config', GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
      skript('https://www.googletagmanager.com/gtag/js?id=' + GA_ID);
    } else {
      // erneute Zustimmung nach Widerruf: Messung wieder aufnehmen
      window.gtag('config', GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
    }
    messStatus = 'an';
  }

  function messungAus() {
    window[AUS_SCHALTER] = true;
    var tc = letzteTcDaten;
    var speichernErlaubt = !!(tc && tc.purpose && tc.purpose.consents && tc.purpose.consents[1]);
    var neu = { analytics_storage: 'denied' };
    if (!speichernErlaubt) {
      neu.ad_storage = 'denied'; neu.ad_user_data = 'denied'; neu.ad_personalization = 'denied';
    }
    window.gtag('consent', 'update', neu);
    messStatus = 'aus';
  }

  function abgleichen() {
    var e = entscheidung();
    if (e === true && messStatus !== 'an') messungEin();
    else if (e === false && messStatus !== 'aus') messungAus();
    else if (e === null && messStatus === 'an') messungAus(); // Dialog nach Widerruf offen
  }

  function aufTcf(versuche) {
    if (typeof window.__tcfapi === 'function') {
      window.__tcfapi('addEventListener', 2, function (tc, ok) {
        if (!ok || !tc) return;
        letzteTcDaten = tc;
        abgleichen();
        // Consent-Mode-Werte der CMP können kurz nach dem TCF-Ereignis nachziehen
        if (tc.eventStatus === 'useractioncomplete' || tc.eventStatus === 'tcloaded') setTimeout(abgleichen, 300);
      });
      return;
    }
    if (versuche > 0) setTimeout(function () { aufTcf(versuche - 1); }, 250);
  }

  window.googlefc.callbackQueue.push({ CONSENT_MODE_DATA_READY: abgleichen });
  window.googlefc.callbackQueue.push({ CONSENT_DATA_READY: abgleichen });

  skript('https://fundingchoicesmessages.google.com/i/' + PUB + '?ers=1');
  signalSetzen();
  aufTcf(80);

  // Widerruf / Einstellungen
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-datenschutz-einstellungen]');
    if (!t) return;
    e.preventDefault();
    window.googlefc.callbackQueue.push(function () {
      if (typeof window.googlefc.showRevocationMessage === 'function') window.googlefc.showRevocationMessage();
    });
  });
})();
