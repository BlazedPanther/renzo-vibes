# Renzo Vibes Merch

Der Shop nutzt die Renzo-Vibes-Website und ihren Warenkorb. SumUp verarbeitet die Zahlung über [Hosted Checkout](https://developer.sumup.com/online-payments/checkouts/hosted-checkout/). Der Browser sendet Adressen an das Shop-Backend. SumUp erhält Betrag, Währung, Shop-Referenz und Rücksprung- bzw. Callback-Adresse.

## Katalog und Bestand

Die bestehende Galerie zeigt vier Motive. Vollständige Vorder- und Rückansichten sind im Repository für das Renzo Goat Tee und den Purple Hoodie vorhanden. Für die zwei POW-POW-Produkte fehlt je eine Rückansicht. Die Live-Konfiguration akzeptiert Artikel mit beiden Ansichten. Konfiguriert werden die vom Händler bestätigten Produkte, Beschreibungen, Grössen und CHF-Endpreise. Die drei im SumUp-Katalog sichtbaren Artikel liessen sich den Website-Motiven nicht eindeutig zuordnen.

Die Shopdatenbank führt den Bestand der online angebotenen Artikel. Jede konfigurierte Variante startet bei null. Renzo bucht den bestätigten physischen Startbestand im Adminbereich ein. Eine Reservierung vermindert den verfügbaren Bestand innerhalb derselben Transaktion, die die Bestellung speichert. Bei Zahlung wird die Reservierung verbraucht. Bei verifiziertem Ablauf bzw. Abbruch wird die Menge genau einmal freigegeben. Ein fehlgeschlagener, erneut möglicher Zahlungsversuch hält den Bestand bis zum verifizierten Ablauf oder bis zur Deaktivierung.

Bei einem gemeinsamen Bestand für POS, Direktverkauf und Onlineshop die Menge im Shop-Admin mit dem Grund „Other-channel sale“ buchen, **bevor** der externe Verkauf abgeschlossen wird. Die Admin-Maske schützt reservierte Ware und protokolliert Bestandsbewegungen. Für Kanäle, die diesen Ablauf nicht zuverlässig einhalten können, physisch getrennte Bestände führen. Die öffentliche [SumUp-API-Referenz](https://developer.sumup.com/api/) weist keine unterstützte Synchronisationsschnittstelle für den nativen Variantenbestand aus.

## Railway-Betrieb

Der Service `website` ist mit Branch `main` verbunden, bedient beide Domains auf Port 8080 und hat eine Replik. Im geprüften Stand gab es kein Volume, keine Shop-Konfiguration und keine Staging-Umgebung. Nach Betriebsfreigabe besteht der Aufbau aus demselben Webservice, Caddy, dem Node-24-Backend auf Loopback und einem Volume für SQLite unter `/data`. Caddy liefert die Künstlerseiten aus und leitet die Shop-API und den Adminbereich an Node weiter.

| Railway-Variable | Zweck |
| --- | --- |
| `MERCH_MODE` | Ohne Wert oder `off` bleibt die API geschlossen. `sandbox` verlangt eine separate HTTPS-Domain und eine getrennte Datenbank. `live` verlangt `https://www.renzovibes.com`. |
| `MERCH_ACCEPT_ORDERS` | Erst nach der Freigabe auf `true` setzen. `false` pausiert neue Bestellungen und hält bestehende Bestellungen, Admin, Webhooks und Statusabgleich verfügbar. |
| `MERCH_ORIGIN` | Kanonischer HTTPS-Origin, ohne Pfad oder abschliessenden Schrägstrich. |
| `MERCH_CONFIG_JSON` | Händlergeprüfte Produktdaten, ein einheitlicher Schweizer Versandtarif und vollständige Texte. |
| `MERCH_SUMUP_KEY`, `MERCH_SUMUP_MERCHANT` | Schlüssel und Händlercode des jeweiligen Betriebsmodus. |
| `MERCH_ADMIN_PASSWORD_HASH` | SHA-256-Hexdigest eines zufälligen 32-Byte-Passworts, dessen Passwortdarstellung aus 64 kleingeschriebenen Hexzeichen besteht. Benutzername ist `renzo`. |
| `MERCH_WEBHOOK_TOKEN` | Von der Admin-Anmeldung unabhängiger Zufallswert aus 64 kleingeschriebenen Hexzeichen. |
| `MERCH_RESEND_KEY`, `MERCH_MAIL_FROM`, `MERCH_MAIL_REPLY_TO` | Sendezugriff und bestätigte Adressen für Transaktionsmails. Das Backend nutzt die HTTPS-API. |
| `MERCH_SANDBOX_MAIL_TO` | Optionales, fest freigegebenes Testpostfach für die Sandbox. Mit vollständiger Mail-Konfiguration gehen beide Testbestätigungen ausschliesslich dorthin. In Produktion muss diese Variable fehlen. |
| `MERCH_ADDRESS_RETENTION_DAYS` | Händlergeprüfte Löschfrist für Name, Adresse und E-Mail ab Versand. Offene Lieferungen und ungesendete Bestätigungen bleiben zur Bearbeitung erhalten. |

Schlüssel und Callback-Token als geschützte Railway-Variablen hinterlegen. Der Adminzugang verwendet HTTP Basic über Railway-TLS mit zufällig generiertem Passwort und konstantzeitlichem Digest-Vergleich. Das Passwort Renzo über einen Passwortmanager zugänglich machen. Die Adminseiten und Kundendaten werden vom Server geschützt. Schreibaktionen verlangen denselben Origin. Bei Verdacht auf Zugriff den Admin-Digest rotieren. Den Callback-Token bei einer planmässigen Rotation erst wechseln, wenn die bisherigen Checkouts abgeschlossen sind. Der unabhängige Statusabgleich bleibt bei Callback-Ausfall aktiv.

Der Betriebsmodus prüft Land, Währung, Art des SumUp-Händlerprofils und Lesezugriff. Die Live-Freigabe des konkreten Kontos und die Schreibberechtigung für Hosted Checkout separat bei SumUp bestätigen lassen. [Zugriffsrechte laut SumUp](https://developer.sumup.com/tools/authorization/)

Railway dokumentiert den HTTPS-Mailversand als Option ohne SMTP. Die Resend-API erhält eine stabile Idempotenzkennung je Bestellnachricht. [Railway-Netzwerkdokumentation](https://docs.railway.com/networking/outbound-networking) [Resend-API](https://resend.com/docs/api-reference/emails/send-email)

`MERCH_CONFIG_JSON` erwartet ein Objekt mit `shipping` in Rappen, `products` als Liste von Objekten mit `id`, `price` in Rappen, `description` und `sizes` als Liste eindeutiger Grössen sowie `legal` mit den Textfeldern `imprint`, `privacy`, `payment`, `delivery` und `returns`. Produktkennungen und Bilddateien stehen in `shop/products.json`. Die akzeptierte Angebots- und Textversion wird mit der Bestellung verknüpft. [Rechtstexte im Entwurf](MERCH-LEGAL-DRAFT.md)

## Backups, Zahlungsausnahmen und Prüfung

1. Nach Zustimmung ein Railway-Volume unter `/data` einhängen. Eine Replik betreiben und für den Bestellabgleich dauerhaft erreichbar lassen. Das Backend verlangt den tatsächlichen Mount und die Railway-Mountvariable. Tägliche Backups und einen manuellen Snapshot vor Änderungen einrichten. Wiederherstellung mit Testdaten üben. Ein lokaler SQLite-Online-Snapshot und die Wiederherstellung sind automatisiert getestet. [Railway-Volumes](https://docs.railway.com/volumes) [Verbrauchsabhängige Railway-Backups](https://docs.railway.com/volumes/backups)
2. Nach einem Restore neue Bestellungen geschlossen halten. Seit dem Snapshot eingegangene SumUp-Zahlungen und bereits verschickte Bestellungen mit dem Händler-Dashboard und dem physischen Bestand abgleichen. Erst dann den Verkauf wieder öffnen.
3. Die Zahlungsbestätigung erfordert Händler-, Betrags-, Währungs-, Checkout-ID- und Referenzprüfung. Webhooks lösen eine unabhängige Abfrage aus. Bei unklarem Ergebnis einer Checkout-Erstellung bleibt die Reservierung stehen. Die Hintergrundprüfung sucht dieselbe Referenz. Wenn SumUp dauerhaft kein Ergebnis liefert, die Referenz mit dem Zahlungsdienst klären, bevor die Ware wieder in den Verkauf kommt. [SumUp-Webhooks](https://developer.sumup.com/online-payments/webhooks/)
4. Rückerstattungen und Chargebacks im SumUp-Dashboard bearbeiten bzw. verfolgen. Physisch retournierte und wieder verkäufliche Ware separat als Bestandskorrektur buchen. Das Shop-Admin verwaltet Fulfillment und Versandstatus.
5. Den offiziellen Sandbox-Durchlauf mit Testkarten für Erfolg, Ablehnung und Abbruch ausführen. Rücksprung, Callback, Ablauf, Lager, Admin und E-Mail-Fluss am freigegebenen Aufbau prüfen. Als Lieferdaten erfundene Schweizer Testadressen mit `example.test` verwenden. Ein Zustelltest des E-Mail-Dienstes verwendet eine freigegebene Test-Mailbox. Der ursprüngliche lokale Simulator startet mit `npm run shop:sandbox` und `npm run dev:merch` in zwei Terminals. Die automatisierten Integrationsprüfungen des neuen Backends laufen über `npm test`. [Offizielle SumUp-Testkarten](https://developer.sumup.com/online-payments/testing/)

## Sandbox vor der Freigabe

1. In den [SumUp-Entwicklereinstellungen](https://me.sumup.com/de-ch/settings/developer) unter **Sandboxes** einen Testhändler anlegen. Das Schweizer Händlerprofil und CHF für den Test verwenden. In dieses Sandbox-Profil wechseln, dort den API-Schlüssel erstellen und Schlüssel und Händlercode direkt in den Railway-Variablen des Testdienstes hinterlegen. Das Backend akzeptiert in der Sandbox ausschliesslich ein vom SumUp-API als Sandbox ausgewiesenes Händlerprofil. [SumUp-Testanleitung](https://developer.sumup.com/online-payments/testing/) [SumUp-API-Schlüssel](https://developer.sumup.com/tools/authorization/api-keys/)
2. Die Testumgebung mit eigenem Volume und eigener HTTPS-Domain starten. Die bestätigten Produktdaten für den Sortimentstest kopieren, im Test-Admin separate Testmengen einbuchen und die Produktionsmengen beim Test unverändert lassen. Nur die Testumgebung erhält `MERCH_MODE=sandbox` und `MERCH_ACCEPT_ORDERS=true`.
3. Einen echten Mail-Zustelltest mit der bestätigten Absenderadresse und dem freigegebenen `MERCH_SANDBOX_MAIL_TO` ausführen. Eingang von Bestelleingang und Zahlungsbestätigung im Postfach kontrollieren. `delivered@resend.dev` prüft alternativ das Zustellereignis bei Resend. [Resend-Testempfänger](https://resend.com/changelog/sending-test-emails)
4. Bei der Produktionsfreigabe zunächst mit geschlossenen Bestellungen deployen. HTTPS, Datenbank-Mount, Admin-Anmeldung, Katalog, Backups und Shop- sowie Künstlerseiten kontrollieren. Merge und Aktivierung des Verkaufs erfolgen nach Freigabe des Kontoinhabers.
