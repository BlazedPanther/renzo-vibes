# Sicherheits-/Abhängigkeitsprüfung des Originalprojekts

Geprüft wurde der Quellcode von `karl95l/renzo-vibes` (nur lesend).

| Fund | Bewertung | Massnahme |
| --- | --- | --- |
| `src/lib/lovable-error-reporting.ts`, `error-capture.ts`, `error-page.ts`, `server.ts`, `start.ts` | Lovable-spezifisches Error-Reporting / SSR-Wrapper; nicht nötig für statisches Hosting | **Entfernt** (kein externes Error-Reporting) |
| `@lovable.dev/vite-tanstack-config`, `nitro`, `@tanstack/react-start`, `.lovable/`, `bunfig.toml` | Lovable-/Cloudflare-Build-Kette | **Entfernt**, ersetzt durch Vite + TanStack Router (SPA + Prerender) |
| Google-Fonts-`<link>` (fonts.googleapis.com / fonts.gstatic.com) | Drittserver-Anfrage jedes Besuchers | **Lokal** über `@fontsource/*` (OFL-1.1), gleiche Familien/Gewichte |
| YouTube-Thumbnails von `i.ytimg.com` beim Seitenaufruf | Drittserver-Anfrage vor Einwilligung | Vorschau **lokal** (`public/thumbs`, per Actions gespiegelt); Player erst nach Klick |
| ~45 ungenutzte shadcn-Komponenten und ~40 ungenutzte Pakete | unnötige Angriffsfläche | **Entfernt**; 11 direkte Laufzeit-Abhängigkeiten |
| Secrets / API-Keys / Telemetrie / fremde Endpunkte | **keine gefunden** (nur `LOVABLE_API_KEY`-Hinweis in AGENTS.md, kein Wert) | – |
| `dangerouslySetInnerHTML`, `eval`, `innerHTML` | nicht vorhanden | Auch im neuen Code nicht verwendet; Head-Tags werden HTML-escaped |
| Asset-URLs `/__l5e/assets-v1/...` | existieren nur auf Lovable-Hosting | Durch `public/media/*` ersetzt (siehe MEDIA.md) |
| README-Hinweis „Implement exactly the screenshot and nothing else“ | Prompt-Rest, keine Funktion | ignoriert |

`npm audit`: 0 bekannte Schwachstellen (Stand Build; Vite auf 8.3.8 angehoben wegen GHSA-9jrq-w75r-8gcw / GHSA-rq7h-c2jc-7f22).
Versionen sind in `package.json` fixiert bzw. über `package-lock.json` reproduzierbar (`npm ci`).
