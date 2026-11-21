# Referenzdokumentation des Originals (vor der Migration)

Quelle (nur gelesen): `https://github.com/karl95l/renzo-vibes`, Branch `main`, Commit `a6c9058`.
Live-Original: `https://renzo-vibes.lovable.app` – **aus der Arbeitsumgebung nicht erreichbar** (Proxy blockiert),
daher **keine Screenshots des Originals**; die Referenz stammt aus dem Quellcode. Siehe README → "Einschränkungen".

## Stack
TanStack Start (SSR, Nitro/Cloudflare-Target über `@lovable.dev/vite-tanstack-config`) + React 19 + Tailwind 4 + Radix-Button.
Nur `Button` (shadcn) wird tatsächlich verwendet; die übrigen 45 UI-Komponenten und viele Radix-/Recharts-/RHF-Pakete waren ungenutzt.

## Navigation (Header)
Wordmark `RENZO VIBES` (Logo 46 px) · `MUSIC` `/music` · `VISUALS` `/visuals` · `ABOUT` `/about` · `MERCH` `/merch` · `CONNECT` `/connect`
· rechts (ab 1100 px): TikTok-, YouTube-Icon, Trennlinie, „● FEEL THE VIBE“. Unter 760 px: Burger-Menü.

## Seiten / Abschnitte
- `/` Hero (Portrait, „RENZO VIBES.“ 128 px Barlow Condensed 800, Tagline, Untertitel, Buttons „LISTEN NOW“ / „WATCH ON YOUTUBE“) →
  Culture-Strip → Listen (2 Videos) → Releases (GAMBian Prince EP 20.03.2026, Gambian Kings & Sons Album 31.07.2026) → About → Merch → Connect.
- `/music` Listen + Releases · `/visuals` Listen · `/about` „MEET RENZO.“ · `/merch` „WEAR THE VIBE.“ (Coming Soon, 3 Artikel) · `/connect` „FOLLOW THE JOURNEY.“
- Footer: Logo, „Feel the rhythm. Live the vibe.“, Back-to-top, © 2026, TikTok / YouTube / Official website, „FROM ITALY. TO THE WORLD.“

## Design-Tokens (`src/styles.css`, unverändert übernommen)
Dunkel (`oklch(0.14 …)` Hintergrund), Primärfarbe Violett `oklch(0.62 0.25 300)`, Text `oklch(0.96 …)`, Border `oklch(0.32 …)`.
Schriften: Barlow Condensed 500–900 (Display), DM Sans 400–700 (Text). Radien 2/4/6 px. Animationen `text-arrive`, `image-arrive`.

## Offizielle Links im Original
YouTube `https://www.youtube.com/@RenzoVibes` · TikTok `https://www.tiktok.com/@renzo_vibez` · Website `https://www.renzovibes.ch/`
· Videos `Mw4mxqRhytU` (MoneyMoney ft. Joel Anjonu Orin), `ivYRhk-Cgys` (RVP for President ft. Top Striker).
Kein Spotify-, Apple-Music- oder Instagram-Link im Original → nicht erfunden.

## Medien (Lovable-Asset-Pointer, nur Verweise im Repo)
`renzo-portrait.webp`, `renzo-vibes-logo.png`, `renzo-hero.webp`, `renzo-cover.webp`, `renzo-hoodie.webp`, `pow-pow-shirt.webp`, `pow-pow-hoodie.png`, `renzo-goat-shirt.png`
(Metadaten in `data/media-manifest.json`).
