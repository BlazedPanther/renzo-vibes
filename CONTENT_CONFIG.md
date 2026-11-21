# Inhalte & IDs eintragen

Alles zentral in **`src/config/site.config.ts`** (Links in **`src/config/links.config.ts`**). Nichts raten – nur verifizierte Werte eintragen.

| Feld | Woher | Format | Wirkung |
| --- | --- | --- | --- |
| `domain` | gekaufte Domain, z. B. `example.ch` (ohne `https://`) | Hostname | canonical, OG-URL, `sitemap.xml`, `robots.txt`, `CNAME` |
| `profiles.spotifyArtistId` | Spotify → Künstlerprofil → „Teilen → Künstlerlink kopieren“: `open.spotify.com/artist/<ID>` | 22 Zeichen `[A-Za-z0-9]` | Spotify-Player (2-Klick), Spotify-Karte auf `/links` |
| `profiles.appleArtistId` | Apple Music → Künstlerseite: `music.apple.com/…/artist/<name>/<ID>` | 5–12 Ziffern | automatische Releaseliste + Apple-Karte auf `/links` |
| `profiles.appleArtistName` | Name wie bei Apple | Text | Plausibilitätsprüfung gegen gleichnamige falsche Künstler |
| `profiles.youtubeChannelId` | YouTube Studio → Einstellungen → Kanal → Erweitert, oder Kanalseite → „Mehr zu diesem Kanal“ → „Kanal-ID teilen“ | `UC` + 22 Zeichen | automatische neueste Videos (3–6) |
| `profiles.instagramUrl` | offizielle Profil-URL | `https://www.instagram.com/…` | Instagram-Karte auf `/links` |
| `legal.*` | Betreiber (Name, Anschrift, Kontakt-E-Mail, Sitzland) | Text | `/datenschutz` (und `/impressum`) |
| `legal.impressum.enabled` | rechtliche Prüfung | `true/false` | schaltet `/impressum` + Footer-Link frei |

Prüfen: `npm run build` validiert Formate (ungültige IDs brechen den Build ab). Danach `npm run feeds` lokal oder Actions → *Run workflow*.
Die YouTube-ID wird **nicht** geraten: Der Feed-Parser verwirft Feeds, deren `yt:channelId` nicht passt; der Apple-Abruf verwirft Antworten, deren Künstlername/-ID nicht passt.

**`/links` verwalten:** In `links.config.ts` je Eintrag `title`, `subtitle`, `href`, `icon`, `visible`, `order` ändern. Profile ohne ID bleiben automatisch ausgeblendet.
**Für die Bio:** `https://<deine-domain>/links` in TikTok/Instagram eintragen.
