/**
 * ZENTRALE KONFIGURATION – Renzo Vibes / Rent2Wipes
 *
 * Alles, was noch nicht verifiziert ist, steht hier als `null` bzw. als "TODO:"-Wert.
 * Es wird NICHTS geraten. Anleitung: CONTENT_CONFIG.md
 *
 * Diese Datei darf nur reine Daten enthalten (keine Imports), weil sie sowohl im
 * Browser-Bundle als auch in den Node-Skripten (scripts/*.ts) verwendet wird.
 */

export const TODO = "TODO:";

export const siteConfig = {
  artistName: "Renzo Vibes",

  /**
   * Eigene Domain OHNE Protokoll, z. B. "example.ch" (Apex) oder "www.example.ch".
   * `null` = noch nicht bekannt -> kein CNAME, keine canonical-/Sitemap-URLs.
   * Siehe DEPLOY_CHECKLIST.md (Infomaniak-DNS).
   */
  domain: "renzovibes.com" as string | null,

  /** Offizielle Kanäle aus dem Originalprojekt (karl95l/renzo-vibes, src/lib/artist.ts). */
  channels: {
    youtube: "https://www.youtube.com/@RenzoVibes",
    tiktok: "https://www.tiktok.com/@renzo_vibez",
    website: "https://www.renzovibes.ch/",
  },

  /** Bisher NICHT belegte Profile. Erst eintragen, wenn die URL/ID verifiziert ist. */
  profiles: {
    /** Spotify-Artist-ID (22 Zeichen, aus open.spotify.com/artist/<ID>). */
    spotifyArtistId: "7DOTyjrzC2XqXXD850bmxY" as string | null,
    /** Apple-Music/iTunes-Artist-ID (Zahl aus music.apple.com/.../artist/.../<ID>). */
    appleArtistId: "1655332137" as string | null,
    /** Apple-Storefront für Release-Links (music.apple.com/<land>/...). */
    appleCountry: "ch",
    /** Erwarteter Künstlername im Apple-Feed (Plausibilitätsprüfung gegen falsche Matches). */
    appleArtistName: "Renzo Vibes",
    /** YouTube-Channel-ID (beginnt mit "UC", 24 Zeichen). */
    youtubeChannelId: "UCo0CiOUcsh9PwqbRslyGUsA" as string | null,
    /** Optional, nur mit verifizierter URL, z. B. "https://www.instagram.com/<name>/". */
    instagramUrl: "https://www.instagram.com/renzovibez/" as string | null,
  },

  /** Anzahl angezeigter automatischer Einträge. */
  feeds: {
    maxVideos: 6,
    maxReleases: 8,
  },

  /**
   * Rechtliches. Pflichtangaben NICHT erfinden. Solange ein Wert mit "TODO:" beginnt,
   * bricht der Produktions-Build ab (scripts/check-config.mjs), ausser ALLOW_PLACEHOLDERS=true.
   */
  legal: {
    operatorName: "Renzo Vibes",
    /** Optional nach DSG; `null` = wird nicht angezeigt. */
    operatorAddress: null as string | null,
    contactEmail: "renzovibez@gmail.com",
    /** Land des Betreibers, relevant für DSG (CH) vs. DSGVO (EU/IT). */
    operatorCountry: "Schweiz",
    /** Stand der Datenschutzerklärung (ISO-Datum), vor Livegang aktualisieren. */
    privacyUpdated: "2026-11-21",
    /** /impressum nur aktivieren, wenn rechtlich nötig (siehe README). */
    impressum: {
      enabled: false,
      responsiblePerson: `${TODO} Verantwortliche Person`,
      address: `${TODO} Anschrift`,
      email: `${TODO} E-Mail`,
      phone: `${TODO} Telefon (optional)`,
      registerOrVat: `${TODO} Handelsregister / UID / USt-IdNr. (falls vorhanden)`,
    },
  },
} as const;

export type SiteConfig = typeof siteConfig;

export const isTodo = (v: unknown): boolean => typeof v === "string" && v.startsWith(TODO);

/** Gültige Formate – verhindert Tippfehler/Injektion in iFrame-URLs. */
export const SPOTIFY_ID_RE = /^[A-Za-z0-9]{22}$/;
export const APPLE_ID_RE = /^\d{5,12}$/;
export const YT_CHANNEL_RE = /^UC[\w-]{22}$/;
export const YT_VIDEO_RE = /^[\w-]{11}$/;

export const siteUrl = (): string | null =>
  siteConfig.domain
    ? `https://${siteConfig.domain.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`
    : null;

export const spotifyArtistId = (): string | null => {
  const id = siteConfig.profiles.spotifyArtistId;
  return id && SPOTIFY_ID_RE.test(id) ? id : null;
};
