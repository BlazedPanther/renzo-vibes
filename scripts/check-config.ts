/**
 * Build-Gate: verhindert, dass Platzhalter-Rechtstexte unbemerkt live gehen.
 * ALLOW_PLACEHOLDERS=true erlaubt einen Vorschau-Build (Seite zeigt dann den ENTWURF-Hinweis).
 */
import {
  siteConfig,
  isTodo,
  spotifyArtistId,
  SPOTIFY_ID_RE,
  APPLE_ID_RE,
  YT_CHANNEL_RE,
} from "../src/config/site.config.ts";
import {
  checkMerchRelease,
  checkNativeMerchShop,
  merchRelease,
  nativeMerchShop,
} from "../src/config/merch-release.ts";

if (merchRelease) checkMerchRelease(merchRelease);
if (nativeMerchShop) checkNativeMerchShop(nativeMerchShop);
if (merchRelease && nativeMerchShop) throw new Error("Merch: einen Bestellweg freigeben.");

const warn = (m: string) => console.log(`::warning title=Konfiguration::${m}`);
const l = siteConfig.legal;
const required: Record<string, string> = {
  operatorName: l.operatorName,
  contactEmail: l.contactEmail,
  operatorCountry: l.operatorCountry,
};
if (l.impressum.enabled)
  Object.assign(
    required,
    Object.fromEntries(
      Object.entries(l.impressum).filter(
        ([k]) => k !== "enabled" && k !== "phone" && k !== "registerOrVat",
      ),
    ),
  );
const open = Object.entries(required)
  .filter(([, v]) => isTodo(v))
  .map(([k]) => k);

const p = siteConfig.profiles;
if (p.spotifyArtistId && !SPOTIFY_ID_RE.test(p.spotifyArtistId))
  throw new Error("spotifyArtistId hat ein ungültiges Format");
if (p.appleArtistId && !APPLE_ID_RE.test(p.appleArtistId))
  throw new Error("appleArtistId hat ein ungültiges Format");
if (p.youtubeChannelId && !YT_CHANNEL_RE.test(p.youtubeChannelId))
  throw new Error("youtubeChannelId hat ein ungültiges Format");
if (!spotifyArtistId())
  warn("Spotify-Artist-ID fehlt: Spotify-Player und Spotify-Link werden nicht angezeigt.");
if (!p.appleArtistId) warn("Apple-Artist-ID fehlt: automatische Release-Liste bleibt leer.");
if (!p.youtubeChannelId)
  warn("YouTube-Channel-ID fehlt: automatische Video-Liste bleibt leer (statische Videos aktiv).");
if (!siteConfig.domain)
  warn("Keine Domain konfiguriert: keine canonical-URLs, keine Sitemap, kein CNAME.");

if (open.length) {
  const msg = `Offene Pflichtangaben in src/config/site.config.ts: ${open.join(", ")}`;
  if (process.env["ALLOW_PLACEHOLDERS"] === "true")
    warn(`${msg} – VORSCHAU-BUILD, nicht als Live-Seite veröffentlichen!`);
  else {
    console.error(
      `::error title=Pflichtangaben fehlen::${msg}. Siehe DEPLOY_CHECKLIST.md (oder ALLOW_PLACEHOLDERS=true für eine reine Vorschau).`,
    );
    process.exit(1);
  }
}
