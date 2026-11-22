# Rent2Wipes – Renzo Vibes (statische Künstlerseite)

Statisch auslieferbare Version von [karl95l/renzo-vibes](https://github.com/karl95l/renzo-vibes) für **GitHub Pages**
(eigene Domain bei Infomaniak, Root-Pfad). Design 1:1 aus dem Original (`src/styles.css` unverändert, Zusätze am Dateiende markiert).

> **Status:** Code fertig und getestet. **Nicht live-bereit**, bis die offenen Punkte in [`DEPLOY_CHECKLIST.md`](DEPLOY_CHECKLIST.md) erledigt sind
> (Medien-Rechte, Rechtsangaben, Domain, Künstler-IDs). Der Produktions-Build bricht absichtlich ab, solange Pflichtangaben `TODO:` sind.

## Technik (und warum)
- **Vite + React 19 + TanStack Router (SPA) + Prerendering.** TanStack Start brauchte SSR/Nitro/Cloudflare (Lovable-Kette). Stattdessen:
  jede Route wird beim Build zu statischem HTML (`dist/<route>/index.html`) gerendert und im Browser hydriert → Deep-Links und Reload
  funktionieren auf GitHub Pages ohne 404-Trick, SEO-Titel/Meta pro Seite sind im HTML. Unbekannte URLs liefern `404.html` (HTTP 404).
- Routen: `/ /music /visuals /about /merch /connect` (wie Original) + `/links` (Bio-Seite) + `/privacy` (englisch, Schweizer DSG/FADP; `/datenschutz` leitet dorthin um) (+ optional `/impressum`).
- Komponenten (`src/components/artist/*`) und `styles.css` des Originals wurden weiterverwendet.
- Schriften lokal (`@fontsource`, OFL). Keine Cookies, kein Tracking, kein Backend, kein Formular/Shop.
- Externe Player (YouTube, Spotify) laden **erst nach Klick** (Zwei-Klick). Video-Vorschauen liegen lokal (`public/thumbs`).

## Befehle
```sh
npm ci                 # Abhängigkeiten (package-lock.json, .npmrc: legacy-peer-deps)
npm run dev            # Entwicklung
npm run feeds          # YouTube-/Apple-Feed holen -> data/*.json (braucht IDs in site.config.ts)
npm test               # Vitest (Feed-Filter, Fallback, Links-Konfig, Deep-Link-Routing)
npm run lint && npm run typecheck
ALLOW_PLACEHOLDERS=true npm run build   # Vorschau-Build; ohne Variable nur mit ausgefüllten Rechtsangaben
node scripts/serve-dist.ts dist 4173    # lokaler Pages-Nachbau (Ordner-Index + 404.html)
```
Node ≥ 22.18 (Skripte laufen als TypeScript per Type-Stripping; CI nutzt Node 24).

## Automatische Inhalte – was wirklich automatisch ist
| Bereich | Quelle | Status |
| --- | --- | --- |
| Neueste YouTube-Uploads (3–6) | öffentlicher Kanal-Feed `youtube.com/feeds/videos.xml?channel_id=…`, kein API-Key | **inaktiv bis `youtubeChannelId` gesetzt**; bis dahin die 2 Videos aus dem Original |
| Neueste Releases | Apple/iTunes Lookup API (`itunes.apple.com/lookup?id=…`) | **inaktiv bis `appleArtistId` gesetzt**; Künstlername wird gegengeprüft; bis dahin nur die 2 statischen Releases |
| Spotify-Player | offizielles Embed, 2-Klick | **inaktiv bis `spotifyArtistId` gesetzt** |
| Spotify-Releaseliste | – | **nicht automatisch**: Das Spotify-Embed zeigt, was Spotify anzeigt (nicht zwingend eine nach Datum sortierte Liste der neuesten Singles). Die sortierte Liste kommt aus dem Apple-Feed. |

Ablauf: `deploy.yml` läuft bei Push auf `main`, **alle 6 h** (`schedule`) und manuell (`workflow_dispatch`): Feeds holen → Lint/Typecheck/Tests → Build → Deploy.
Schlägt ein Feed fehl, bleibt der **versionierte Cache** (`data/*.json`) erhalten und der Log zeigt `::warning`. Geänderte Feed-Daten werden nur bei
echter Änderung committed (keine Schein-Commits). Fehlen Daten ganz, zeigt die Seite die statischen Originalinhalte.
Apple-Artwork und Preview-Clips werden bewusst **nicht** eingebunden (Nutzungsbedingungen, Drittserver-Kontakt); es werden Titel, Datum und Apple-Music-Link angezeigt
(Quellenangabe auf der Seite).

### ⚠ 60-Tage-Regel für geplante Workflows
GitHub deaktiviert `schedule`-Workflows in **öffentlichen** Repos nach 60 Tagen ohne Repository-Aktivität. Kein Schein-Commit-Workaround eingebaut.
Reaktivierung: Repo → **Actions** → „Build & Deploy“ → Banner „Enable workflow“ (oder `Run workflow` manuell auslösen). Manueller Refresh jederzeit:
Actions → „Build & Deploy“ → **Run workflow**. Echte Feed-Änderungen erzeugen Commits und zählen als Aktivität. Spotify-Embed und statische Seite laufen unabhängig weiter.

## Einschränkungen dieser Umsetzung (ehrlich)
- Die Arbeitsumgebung konnte `renzo-vibes.lovable.app`, YouTube, Apple, MusicBrainz und renzovibes.ch **nicht erreichen** (Proxy 403). Daher: **keine Original-Screenshots**,
  **keine echten Medien-Dateien**, **keine verifizierten Künstler-/Channel-IDs**, Feed-Code nur per Unit-Tests (Beispiel-Daten), nicht gegen die Live-APIs, geprüft.
- Medien: siehe [`MEDIA.md`](MEDIA.md). Ohne `public/media/*` zeigt die Seite Alt-Texte statt Bilder.
- Das Original-Repo hat **keine Lizenz**; „public“ ≠ frei nutzbar. Veröffentlichung nur mit Zustimmung des Betreibers.

## Kosten
GitHub Pages + Actions (öffentliches Repo) kostenlos; Domain ist bereits bezahlt. Keine Abos, keine kostenpflichtigen Feeds.

Weitere Dokumente: [`CONTENT_CONFIG.md`](CONTENT_CONFIG.md) · [`DEPLOY_CHECKLIST.md`](DEPLOY_CHECKLIST.md) · [`MEDIA.md`](MEDIA.md) · [`docs/`](docs/)
