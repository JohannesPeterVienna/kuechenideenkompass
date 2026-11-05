/*
 * Küchenideenkompass – Einwilligung & Reichweitenmessung
 * 1. Consent-Mode-Grundwerte (alles abgelehnt, 500 ms Wartezeit) stehen inline im head,
 *    vor dem AdSense-Loader; fehlen sie, setzt dieses Skript sie selbst.
 * 2. Lädt die Datenschutzmitteilung von Google (Funding Choices, IAB TCF).
 * 3. Google Analytics 4 (G-T00HRG2YVF) misst nur, wenn BEIDE Signale zustimmen:
 *    a) TCF: Zweck 1 und Anbieter 755 (Google) erlaubt,
 *    b) Consent Mode der Google-CMP: analytics_storage = GRANTED.
 *    Gilt die DSGVO laut CMP nicht (gdprApplies === false), wird nur gemessen,
 *    wenn der Analyticswert GRANTED (1) oder NOT_APPLICABLE (3) ist und die CMP
 *    ausdrücklich keinen US-Opt-out meldet (usstatesoptout Status 1 oder 2).
 *    Fehlend, UNKNOWN (0), DENIED (2), NOT_CONFIGURED (4), ein offener Dialog
 *    oder ein Fehler einer CMP-Schnittstelle zählen als Nein. Ein eindeutiges
 *    TCF-Nein schaltet sofort ab, bevor weitere CMP-Schnittstellen gefragt werden.
 *    Werte: developers.google.com/funding-choices/fc-api-docs
 * 4. Ablehnung oder Widerruf: consent update „denied“, ga-disable-Schalter an,
 *    keine weiteren Treffer. Erneute Zustimmung schaltet die Messung wieder ein.
 * 5. „Datenschutz-Einstellungen“ öffnet die Widerrufsmitteilung von Google, solange diese aktiv ist.
 *
 * Übergang ab 5.11.2026 – der „Küchenzettel“ (eigenes Fenster nur für die Statistik):
 *  - Hat die Google-CMP 3 s nach dem Laden weder entschieden (useractioncomplete, tcloaded mit
 *    tcString, gdprApplies === false) noch einen sichtbaren Dialog gemeldet (cmpuishown mit
 *    displayStatus „hidden“/„disabled“ zählt NICHT als sichtbar; fehlt __tcfapi, ebenso), fragt
 *    der Zettel unten rechts – nur nach Google Analytics, nie nach Werbung.
 *  - Zustimmen: nur analytics_storage „granted“, gtag.js einmal laden (Signale/Werbepersonalisierung aus).
 *    ad_storage, ad_user_data, ad_personalization fasst der Zettel nie an (bleiben „denied“).
 *  - Ablehnen/Widerruf: ga-disable an, analytics_storage „denied“, Cookies _ga/_ga_* aller
 *    Domain-Varianten löschen. Ein beim Laden gespeichertes „nein“ löscht sie ebenfalls.
 *  - „×“, Escape oder keine Wahl: Statistik bleibt aus, nichts wird gespeichert.
 *  - Google hat Vorrang: jede (auch spätere) Google-Entscheidung schließt den Zettel und löscht die
 *    eigene Wahl; lehnt Google die Statistik ab, werden _ga-Cookies gelöscht.
 *  - Global Privacy Control: kein Zettel, keine Statistik, vorhandene _ga-Cookies werden gelöscht.
 *  - Seiten mit body[data-statistik="aus"] (Impressum, Datenschutz, Kontakt, 404): GA lädt nie,
 *    der Zettel erscheint nur über „Datenschutz-Einstellungen“ zum Ansehen/Ändern/Widerrufen.
 *  - localStorage „kik-statistik“: { v: 1, wahl: "ja"|"nein", zeit: ms } – 12 Monate gültig,
 *    Zeitpunkte in der Zukunft (mehr als 1 min Uhrabweichung) gelten nicht.
 *  Regeln ohne DOM in ZETTEL_REGELN; Ablauf geprüft in tests/statistik-zettel.test.mjs.
 */
(function () {
  'use strict';

  // --- Regeln des Küchenzettels (ohne Browser prüfbar) ---
  var ZETTEL_REGELN = {
    SCHLUESSEL: 'kik-statistik',
    VERSION: 1,
    WARTEN: 3000,       // so lange bekommt die Google-CMP Zeit
    UHR_KULANZ: 60000,  // erlaubte Uhrabweichung für den gespeicherten Zeitpunkt

    // Google-CMP hat entschieden (oder meldet: DSGVO gilt nicht) → nur ihre Logik gilt
    googleEntschieden: function (tc) {
      if (!tc) return false;
      if (tc.gdprApplies === false) return true;
      if (tc.eventStatus === 'useractioncomplete') return true;
      return tc.eventStatus === 'tcloaded' && typeof tc.tcString === 'string' && tc.tcString !== '';
    },
    // Google-Dialog ist wirklich zu sehen (hidden/disabled zählen nicht)
    googleDialogSichtbar: function (tc) {
      if (!tc) return false;
      if (tc.displayStatus === 'visible') return true;
      return tc.eventStatus === 'cmpuishown' && tc.displayStatus !== 'hidden' && tc.displayStatus !== 'disabled';
    },
    ablauf: function (zeit) {
      var d = new Date(zeit);
      d.setFullYear(d.getFullYear() + 1);
      return d.getTime();
    },
    // gespeicherte eigene Wahl: 'ja' | 'nein' | null (fehlt, falsche Version, abgelaufen, Zukunft)
    gueltigeWahl: function (eintrag, jetzt) {
      if (!eintrag || typeof eintrag !== 'object' || eintrag.v !== ZETTEL_REGELN.VERSION) return null;
      if (eintrag.wahl !== 'ja' && eintrag.wahl !== 'nein') return null;
      var z = eintrag.zeit;
      if (typeof z !== 'number' || !isFinite(z)) return null;
      if (z > jetzt + ZETTEL_REGELN.UHR_KULANZ) return null;
      if (jetzt >= ZETTEL_REGELN.ablauf(z)) return null;
      return eintrag.wahl;
    },
    // 'gpc' | 'google' | 'dialog' | 'ja' | 'nein' | 'fragen'
    lage: function (o) {
      if (o.gpc) return 'gpc';
      if (ZETTEL_REGELN.googleEntschieden(o.tc)) return 'google';
      if (ZETTEL_REGELN.googleDialogSichtbar(o.tc)) return 'dialog';
      return ZETTEL_REGELN.gueltigeWahl(o.eintrag, o.jetzt) || 'fragen';
    },
    gaKekse: function (text) {
      return String(text || '').split(';').map(function (s) { return s.split('=')[0].trim(); })
        .filter(function (n) { return /^_ga(_.+)?$/.test(n); });
    },
    // '' (ohne domain=), host, .host und jede übergeordnete Domain bis vor die Endung
    domainVarianten: function (host) {
      var teile = String(host || '').split('.').filter(Boolean), aus = [''];
      for (var i = 0; i < teile.length - 1; i++) {
        var d = teile.slice(i).join('.');
        aus.push(d, '.' + d);
      }
      return aus;
    }
  };
  if (typeof window === 'undefined') {
    if (typeof module === 'object' && module.exports) module.exports = ZETTEL_REGELN;
    return;
  }

  var PUB = 'pub-7811071715414905';
  var GA_ID = 'G-T00HRG2YVF';
  var AUS_SCHALTER = 'ga-disable-' + GA_ID;
  var CM = { UNBEKANNT: 0, ERTEILT: 1, ABGELEHNT: 2, NICHT_ANWENDBAR: 3, NICHT_KONFIGURIERT: 4 };
  var US_OHNE_WIDERSPRUCH = [1, 2]; // usstatesoptout: DOES_NOT_APPLY, NOT_OPTED_OUT (0 UNKNOWN, 3 OPTED_OUT sperren)
  var GPC = !!(window.navigator && window.navigator.globalPrivacyControl === true);
  var HIER_MESSEN = !(document.body && document.body.getAttribute('data-statistik') === 'aus');

  // --- 1. dataLayer, gtag-Stub und Grundwerte vor jedem Google-Skript ---
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function () { window.dataLayer.push(arguments); };
  }
  window[AUS_SCHALTER] = true; // bis zur Zustimmung keine Messung
  // Die Grundwerte stehen normalerweise schon inline im head (vor dem AdSense-Loader); nur ohne sie hier setzen.
  if (!window.kikConsentStandard) {
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500
    });
  }

  window.googlefc = window.googlefc || {};
  window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];

  var letzteTcDaten = null;
  var messStatus = 'offen';   // 'offen' | 'an' | 'aus'
  var skriptGeladen = false;
  var zettelBereit = false;   // erst nach WARTEN (oder nach einer Wahl) entscheidet der Zettel mit

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

  // --- Ablage der Zettel-Wahl; ohne localStorage gilt sie nur für diesen Seitenaufruf ---
  var ablage = {
    ersatz: null,
    lesen: function () {
      try { var r = window.localStorage.getItem(ZETTEL_REGELN.SCHLUESSEL); return r ? JSON.parse(r) : null; }
      catch (err) { return this.ersatz; }
    },
    schreiben: function (e) {
      this.ersatz = e;
      try { window.localStorage.setItem(ZETTEL_REGELN.SCHLUESSEL, JSON.stringify(e)); } catch (err) {}
    },
    loeschen: function () {
      this.ersatz = null;
      try { window.localStorage.removeItem(ZETTEL_REGELN.SCHLUESSEL); } catch (err) {}
    }
  };

  function lageJetzt() {
    return ZETTEL_REGELN.lage({ tc: letzteTcDaten, gpc: GPC, eintrag: ablage.lesen(), jetzt: Date.now() });
  }
  // Der Zettel entscheidet, solange Google nichts entschieden hat und keinen Dialog zeigt
  function zettelZustaendig() {
    if (!zettelBereit) return false;
    var l = lageJetzt();
    return l === 'ja' || l === 'nein' || l === 'fragen';
  }

  // Analytics-Cookies dieser Domain löschen (alle Domain-Varianten, Pfad /)
  function gaKekseLoeschen() {
    var namen;
    try { namen = ZETTEL_REGELN.gaKekse(document.cookie); } catch (err) { return; }
    var domains = ZETTEL_REGELN.domainVarianten(window.location && window.location.hostname);
    namen.forEach(function (n) {
      domains.forEach(function (d) {
        try { document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=/' + (d ? '; domain=' + d : ''); } catch (err) {}
      });
    });
  }

  // Analytics-Status aus dem Consent Mode der Google-CMP (Zahl laut ConsentModePurposeStatusEnum)
  function statistikWert() {
    try {
      var fc = window.googlefc;
      if (!fc || typeof fc.getGoogleConsentModeValues !== 'function') return CM.UNBEKANNT;
      var werte = fc.getGoogleConsentModeValues();
      var w = werte && werte.analyticsStoragePurposeConsentStatus;
      return typeof w === 'number' ? w : CM.UNBEKANNT;
    } catch (err) { return CM.UNBEKANNT; }
  }

  // US-Bundesstaaten: true, solange die CMP nicht ausdrücklich „kein Opt-out“ meldet; Fehler = Opt-out.
  function usWiderspruch() {
    try {
      var u = window.googlefc && window.googlefc.usstatesoptout;
      return !(u && typeof u.getInitialUsStatesOptOutStatus === 'function' && US_OHNE_WIDERSPRUCH.indexOf(u.getInitialUsStatesOptOutStatus()) !== -1);
    } catch (err) { return true; }
  }

  // Entscheidung allein nach der Google-CMP: true / false / null (noch keine)
  function googleEntscheidung() {
    var tc = letzteTcDaten;
    if (!tc) return null;
    if (tc.gdprApplies === false) {
      var w = statistikWert();
      return (w === CM.ERTEILT || w === CM.NICHT_ANWENDBAR) && !usWiderspruch();
    }
    if (tc.eventStatus !== 'tcloaded' && tc.eventStatus !== 'useractioncomplete') return null;
    var zweck1 = !!(tc.purpose && tc.purpose.consents && tc.purpose.consents[1]);
    var anbieter = !!(tc.vendor && tc.vendor.consents && tc.vendor.consents[755]);
    if (!zweck1 || !anbieter) return false; // eindeutiges Nein, ohne weitere CMP-Abfrage
    return statistikWert() === CM.ERTEILT;
  }

  // true = messen, false = nicht messen, null = noch keine Entscheidung
  function entscheidung() {
    if (GPC) return false;
    if (zettelZustaendig()) {
      var w = lageJetzt();
      return w === 'ja' ? true : (w === 'nein' ? false : null);
    }
    return googleEntscheidung();
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

  // nurStatistik: Zettel-/GPC-Weg – ausschließlich analytics_storage, Werbewerte bleiben unberührt
  function messungAus(nurStatistik) {
    window[AUS_SCHALTER] = true;
    if (nurStatistik) {
      window.gtag('consent', 'update', { analytics_storage: 'denied' });
      gaKekseLoeschen();
      messStatus = 'aus';
      return;
    }
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
    var nurStatistik = GPC || zettelZustaendig();
    if (e === true && !HIER_MESSEN) e = null; // Impressum, Datenschutz, Kontakt, 404: GA lädt hier nie
    if (e === true && messStatus !== 'an') messungEin();
    else if (e === false && messStatus !== 'aus') messungAus(nurStatistik);
    else if (e === null && messStatus === 'an') messungAus(nurStatistik); // Dialog nach Widerruf offen
  }

  // --- Der Küchenzettel: nicht modales Fenster unten rechts (mobil unten, volle Breite) ---
  var zettel = {
    el: null,
    ansage: null,
    ausloeser: null,
    gefragt: false,
    hoertGroesse: false,

    bauen: function () {
      if (this.el) return this.el;
      var self = this;
      var el = document.createElement('section');
      el.className = 'kik-zettel';
      el.id = 'kik-zettel';
      el.hidden = true;
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'false');
      el.setAttribute('aria-labelledby', 'kik-zettel-titel');
      el.setAttribute('aria-describedby', 'kik-zettel-text');
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); self.schliessen(); }
      });
      el.addEventListener('click', function (e) {
        var k = e.target && e.target.closest && e.target.closest('[data-zettel]');
        if (!k) return;
        var w = k.getAttribute('data-zettel');
        if (w === 'zu') self.schliessen(); else self.entscheiden(w);
      });
      var ansage = document.createElement('p');
      ansage.className = 'kik-zettel-ansage';
      ansage.setAttribute('role', 'status');
      ansage.setAttribute('aria-live', 'polite');
      // früh in der Tab-Reihenfolge (nach „Zum Inhalt springen“), optisch unten fixiert – kein Layout-Shift
      var vor = document.querySelector('.uebersprung');
      if (vor && vor.parentNode === document.body && typeof vor.after === 'function') vor.after(el, ansage);
      else { document.body.appendChild(el); document.body.appendChild(ansage); }
      this.el = el; this.ansage = ansage;
      return el;
    },

    datum: function (ms) {
      try { return new Date(ms).toLocaleDateString('de-AT', { day: 'numeric', month: 'long', year: 'numeric' }); }
      catch (err) { return new Date(ms).toISOString().slice(0, 10); }
    },

    inhalt: function (art) {
      var kopf = '<p class="kik-zettel__kopf" aria-hidden="true"><span>Küchenzettel</span><span>nur Statistik</span></p>';
      var link = '<a href="/datenschutz/#statistik-fenster">Datenschutzerklärung</a>';
      if (art === 'gpc') {
        return kopf + '<h2 id="kik-zettel-titel" tabindex="-1">Statistik bleibt aus</h2>' +
          '<div id="kik-zettel-text"><p>Ihr Browser sendet das Signal „Global Privacy Control“. Daran halten wir uns: Google Analytics bleibt ausgeschaltet, und wir fragen nicht nach. Mehr in der ' + link + '.</p></div>' +
          '<div class="kik-zettel__wahl kik-zettel__wahl--eins"><button type="button" class="kik-zettel__knopf" data-zettel="zu">Schließen</button></div>';
      }
      var eintrag = ablage.lesen();
      var w = ZETTEL_REGELN.gueltigeWahl(eintrag, Date.now());
      var stand = w === 'ja' ? 'Ihre Auswahl: zugestimmt am ' + this.datum(eintrag.zeit) + '.'
        : w === 'nein' ? 'Ihre Auswahl: abgelehnt am ' + this.datum(eintrag.zeit) + '.'
        : this.ausloeser ? 'Noch keine Auswahl getroffen – die Statistik ist aus.' : '';
      if (!HIER_MESSEN) stand += (stand ? ' ' : '') + 'Auf dieser Seite wird nie gemessen; Ihre Wahl gilt für die übrigen Seiten.';
      return kopf + '<h2 id="kik-zettel-titel" tabindex="-1">Dürfen wir mitzählen?</h2>' +
        '<div id="kik-zettel-text"><p>Mit Ihrer Zustimmung zählt Google Analytics (Google Ireland Limited), welche Seiten und Werkzeuge genutzt werden. Google setzt dafür Cookies; Daten können in die USA gelangen. Ihre Rezepte und Eingaben werden nicht übertragen.</p>' +
        '<p>Das ist <b>keine</b> Einwilligung in Werbung. Ändern oder widerrufen jederzeit über „Datenschutz-Einstellungen“ im Seitenfuß. ' + link + '</p></div>' +
        (stand ? '<p class="kik-zettel__stand">' + stand + '</p>' : '') +
        '<div class="kik-zettel__wahl"><button type="button" class="kik-zettel__knopf" data-zettel="ja">Zustimmen</button><button type="button" class="kik-zettel__knopf" data-zettel="nein">Ablehnen</button></div>' +
        '<button type="button" class="kik-zettel__zu" data-zettel="zu" aria-label="Schließen ohne Auswahl – Statistik bleibt aus">×</button>';
    },

    zeigen: function (art, ausloeser) {
      if (!document.body) return;
      var el = this.bauen();
      this.ausloeser = ausloeser || null;
      this.gefragt = true;
      el.setAttribute('data-art', art);
      el.innerHTML = this.inhalt(art);
      el.hidden = false;
      this.platz();
      if (this.ausloeser) {
        var t = el.querySelector('#kik-zettel-titel');
        if (t) t.focus({ preventScroll: true });
      } else if (this.ansage) {
        this.ansage.textContent = 'Unten auf der Seite: Frage zur Statistik mit Google Analytics.';
      }
    },

    offen: function () { return !!(this.el && !this.el.hidden); },

    // Platz unter dem Seitenfuß, solange der Zettel offen ist – Fußlinks bleiben erreichbar
    platz: function () {
      var b = document.body, self = this;
      if (!b || !b.style) return;
      if (this.offen()) {
        b.style.paddingBottom = (Math.ceil(this.el.getBoundingClientRect().height) + 24) + 'px';
        if (!this.hoertGroesse) { this.hoertGroesse = true; window.addEventListener('resize', function () { self.platz(); }); }
      } else {
        b.style.paddingBottom = '';
      }
    },

    schliessen: function () {
      if (!this.offen()) return;
      var hatteFokus = this.el.contains(document.activeElement);
      this.el.hidden = true;
      this.platz();
      if (hatteFokus && this.ausloeser && document.contains(this.ausloeser)) this.ausloeser.focus({ preventScroll: true });
      this.ausloeser = null;
    },

    entscheiden: function (wahl) {
      if (wahl !== 'ja' && wahl !== 'nein') return;
      if (GPC) { this.schliessen(); return; }
      ablage.schreiben({ v: ZETTEL_REGELN.VERSION, wahl: wahl, zeit: Date.now() });
      zettelBereit = true;
      if (wahl === 'nein') gaKekseLoeschen();
      abgleichen();
      this.schliessen();
      if (this.ansage) {
        this.ansage.textContent = wahl === 'nein' ? 'Gespeichert: Die Statistik bleibt ausgeschaltet.'
          : HIER_MESSEN ? 'Gespeichert: Die Statistik mit Google Analytics ist eingeschaltet.'
          : 'Gespeichert: Zustimmung zur Statistik. Gemessen wird nur auf den übrigen Seiten.';
      }
    },

    // nach WARTEN: Google hat weder entschieden noch einen Dialog gezeigt → Wahl anwenden oder fragen
    start: function () {
      zettelBereit = true;
      abgleichen();
      this.fragenFallsNoetig();
    },

    fragenFallsNoetig: function () {
      if (!zettelBereit || !HIER_MESSEN || this.gefragt || this.offen()) return;
      if (lageJetzt() === 'fragen') this.zeigen('frage', null);
    },

    // jede TCF-Meldung: eine Google-Entscheidung ersetzt die eigene Wahl und schließt den Zettel
    googleMeldung: function (tc) {
      if (ZETTEL_REGELN.googleEntschieden(tc)) {
        ablage.loeschen();
        if (this.offen() && this.el.getAttribute('data-art') !== 'gpc') this.schliessen();
      } else if (ZETTEL_REGELN.googleDialogSichtbar(tc) && this.offen() && !this.ausloeser) {
        this.schliessen(); // Google zeigt doch noch seinen Dialog
      }
    },

    // Knopf „Datenschutz-Einstellungen“: Google-CMP, wenn sie aktiv ist, sonst der Zettel
    einstellungen: function (knopf) {
      var tc = letzteTcDaten;
      if (ZETTEL_REGELN.googleEntschieden(tc) || ZETTEL_REGELN.googleDialogSichtbar(tc)) {
        window.googlefc.callbackQueue.push(function () {
          if (typeof window.googlefc.showRevocationMessage === 'function') window.googlefc.showRevocationMessage();
        });
        return;
      }
      this.zeigen(GPC ? 'gpc' : 'frage', knopf);
    }
  };

  // Nach einer Google-Entscheidung (Consent-Mode-Werte ziehen bis zu 300 ms nach):
  // lehnt Google die Statistik ab, Analytics-Cookies löschen – auch wenn der Zettel nie aktiv war.
  function nachGoogle() {
    abgleichen();
    if (ZETTEL_REGELN.googleEntschieden(letzteTcDaten) && entscheidung() === false) gaKekseLoeschen();
  }

  function aufTcf(versuche) {
    if (typeof window.__tcfapi === 'function') {
      window.__tcfapi('addEventListener', 2, function (tc, ok) {
        if (!ok || !tc) return;
        letzteTcDaten = tc;
        zettel.googleMeldung(tc);
        abgleichen();
        if (ZETTEL_REGELN.googleEntschieden(tc)) setTimeout(nachGoogle, 300);
        else zettel.fragenFallsNoetig();
      });
      return;
    }
    if (versuche > 0) setTimeout(function () { aufTcf(versuche - 1); }, 250);
  }

  // Beim Laden: gespeichertes „nein“ (oder GPC) → vorhandene Analytics-Cookies löschen
  if (GPC || ZETTEL_REGELN.gueltigeWahl(ablage.lesen(), Date.now()) === 'nein') gaKekseLoeschen();

  window.googlefc.callbackQueue.push({ CONSENT_MODE_DATA_READY: abgleichen });
  window.googlefc.callbackQueue.push({ CONSENT_DATA_READY: abgleichen });
  window.googlefc.callbackQueue.push({ INITIAL_US_STATES_OPT_OUT_DATA_READY: abgleichen });

  skript('https://fundingchoicesmessages.google.com/i/' + PUB + '?ers=1');
  signalSetzen();
  aufTcf(80);
  if (!GPC) setTimeout(function () { zettel.start(); }, ZETTEL_REGELN.WARTEN);

  // Widerruf / Einstellungen
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-datenschutz-einstellungen]');
    if (!t) return;
    e.preventDefault();
    zettel.einstellungen(t);
  });
})();
