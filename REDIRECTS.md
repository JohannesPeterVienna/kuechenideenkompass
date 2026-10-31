# Weiterleitungen Alt → Neu

Stand: 31.10.2026. Grundlage: alte `sitemap.xml` und Hauptmenü von kuechenideenkompass.de.
Jede alte Datei liegt in `docs/` als noindex-Seite mit `meta refresh` und `canonical` auf das neue Ziel.

| Alte URL | Neue URL |
|---|---|
| /about.html | /ueber-uns/ |
| /advertise.html | /kontakt/ |
| /gramm-milliliter.html | /cups-in-gramm/ |
| /imprint.html | /impressum/ |
| /privacy.html | /datenschutz/ |
| /menueplan.html | /einkaufsliste/ |
| /wochenessen-planen.html | /einkaufsliste/ |
| /vorratsplan.html | /einkaufsliste/ |
| /portionen-umrechnen.html | /rezept-umrechnen/ |
| /portionenwerk.html | /rezept-umrechnen/ |
| /rezeptliste-pruefen.html | /rezept-umrechnen/ |

## Subdomains (nicht Teil dieses Repos – DNS/Hosting unverändert)

| Alte Subdomain | Funktion integriert in | Empfohlenes Ziel |
|---|---|---|
| portionen.kuechenideenkompass.de („Portionenwerk“: Zutaten auf Zielportionen umrechnen, Druck, Sicherung) | Rezept-Werkbank (Portionen, Form, Einheiten, Druck, Teilen-Link) | https://kuechenideenkompass.de/rezept-umrechnen/ |
| portionen.kuechenideenkompass.de/imprint.html, /privacy.html, /advertise.html | – | /impressum/, /datenschutz/, /kontakt/ |
| vorrat.kuechenideenkompass.de („Vorratsplan“: Bestand, Einkaufsliste, Druck) | Einkaufsliste (Vorrat abziehen, lokal speichern, drucken) | https://kuechenideenkompass.de/einkaufsliste/ |
| vorrat.kuechenideenkompass.de/imprint.html, /privacy.html, /advertise.html | – | /impressum/, /datenschutz/, /kontakt/ |

Die Subdomain-Weiterleitungen müssen beim jeweiligen Hosting (World4You) eingerichtet werden, z. B. 301 je Host auf die Zieladresse.
