# Merch-Verkauf vorbereiten

## Nativer SumUp-Shop

Der SumUp-Shop-Assistent ist im aktuell verbundenen Händlerprofil über **Artikel → Sichtbarkeit → Onlineshop → Einrichtung** erreichbar. Der private Entwurf «Renzo Vibes» zeigt eine vorgeschlagene Shopadresse an. Im Assistenten wurde kein Schweizer Versandtarif und keine Lieferfrist bestätigt. Für die Freigabe sind Sortiment, Varianten, CHF-Endpreise und physische Anfangsbestände mit Lorenzo abzugleichen.

1. Shop privat einrichten. Versandgebiet Schweiz, effektiven Versandtarif, Lieferfrist, Varianten, CHF-Endpreise, Bestand, Shop-Impressum, Datenschutz und Kaufbedingungen hinterlegen.
2. Vorschau am Desktop und Smartphone prüfen. Adresse und Summen prüfen. Kontrollieren, wie Lorenzo Bestellungen und Versandstatus sieht und welche E-Mails SumUp sendet. Eine Vorschau belegt keine abgeschlossene Zahlung. Für echte Testzahlungen ist eine bestätigte, passende Sandbox nötig. Der Entwicklerbereich zeigt die Erstelloption. Der vorhandene Zugang zu einem einsatzfähigen Schweizer Testhändler und dessen Schlüssel wurde nicht nachgewiesen.
3. Die von SumUp im privaten Assistenten angezeigte Shopadresse bestätigen. Erst nach Freigabe den Shop öffnen und in `src/config/merch-release.ts` als `nativeMerchShop` eintragen. Die Website verbindet Kundinnen und Kunden über einen normalen Link mit dem externen Store. Caddy und Railway benötigen dafür keine weitere Ressource.
4. Vor Veröffentlichung zeigen, welche Artikel, Varianten, Preise, Versand- und Händlerdaten die Kundschaft sieht. Nach ausdrücklicher Freigabe die SumUp-Shop-Sichtbarkeit und den Website-Deploy prüfen.

## Bestellanfrage per E-Mail

Ist der native Store nicht nutzbar, kann die Website die manuelle Bestellung vorbereiten. Sie zeigt ausschliesslich bestätigte Artikel, Grössen, Preise und einen Schweizer Pauschalversand. Die Anfrage entsteht auf dem Gerät des Kunden und wird vom Kunden über dessen E-Mail-Programm gesendet. Ein kopierbarer Text steht als Alternative bereit. Die Website empfängt keine Anfrage, erhebt keine Lieferadresse und führt keine Zahlungen aus.

Für diese Variante die geprüften Angaben in `merchRelease` einsetzen. Der Build setzt vollständige Verkäufer-, Versand-, Rückgabe-, Storno- und Datenschutzangaben voraus. Dazu gehören E-Mail-Empfänger und Dienstleister, die einschlägigen Länder und Schutzmechanismen sowie Aufbewahrungsfristen. Veröffentlichte Anfangsbestände begrenzen die auswählbare Menge. Vor Erstellung eines Zahlungslinks muss Lorenzo den echten Restbestand abgleichen und reservieren. Nur eine zuständige Person bzw. ein gemeinsames geschütztes Bestandsbuch verwenden.

Zur Bestätigung einer Anfrage die Lieferadresse im privaten E-Mail-Dialog klären. Endbetrag, Varianten und Versand vorab bestätigen und einen einmaligen Zahlungslink mit festem Betrag und interner Bestellreferenz in SumUp erstellen. Der Verkäufer prüft den Zahlungsstatus selbst und versendet die Bestellbestätigung per E-Mail. Erst nach bestätigter Zahlung versenden. Vor Freigabe einer unbezahlten Reservierung den offenen SumUp-Link stornieren. Zugriff auf das Bestellpostfach auf Berechtigte begrenzen und MFA aktivieren.

Beide Veröffentlichungsoptionen sind in diesem Branch standardmässig leer. Der lokale Sandbox-Shop aus PR #1 bleibt ein Testwerkzeug. Railway bleibt ein statischer Dienst und verarbeitet für die manuelle Variante weder Kartendaten noch Lieferadressen.

Weitere Informationen: [SumUp-Onlineshop einrichten](https://help.sumup.com/en-GB/articles/17Ep1qYHNlOvcfp5RDLrTf) · [Zahlungslinks Schweiz](https://www.sumup.com/de-ch/zahlungslinks/) · [Schweizer Onlinehandel](https://www.kmu.admin.ch/de/die-gesetze-der-schweiz-und-der-eu).
