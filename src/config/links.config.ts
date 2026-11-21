/**
 * Linkliste für /links (Linktree-Ersatz). Reihenfolge = `order`, Ausblenden via `visible`.
 * `href` mit "/" beginnend = interne Seite, sonst externe URL (target=_blank, rel=noopener noreferrer).
 * Nicht verifizierte Profile (Spotify, Apple, Instagram) sind automatisch unsichtbar,
 * bis ihre ID/URL in site.config.ts eingetragen ist.
 */
import { siteConfig, spotifyArtistId, APPLE_ID_RE } from "./site.config";

export type LinkIcon =
  | "spotify"
  | "youtube"
  | "tiktok"
  | "website"
  | "music"
  | "video"
  | "merch"
  | "apple"
  | "instagram";

export interface LinkEntry {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  icon: LinkIcon;
  visible: boolean;
  order: number;
}

const spotifyId = spotifyArtistId();
const appleId = siteConfig.profiles.appleArtistId;
const instagram = siteConfig.profiles.instagramUrl;

export const linkEntries: LinkEntry[] = [
  {
    id: "spotify",
    title: "SPOTIFY",
    subtitle: "Stream the vibe",
    href: spotifyId ? `https://open.spotify.com/artist/${spotifyId}` : "",
    icon: "spotify",
    visible: !!spotifyId,
    order: 10,
  },
  {
    id: "youtube",
    title: "YOUTUBE",
    subtitle: "Official videos",
    href: siteConfig.channels.youtube,
    icon: "youtube",
    visible: true,
    order: 20,
  },
  {
    id: "tiktok",
    title: "TIKTOK",
    subtitle: "@renzo_vibez",
    href: siteConfig.channels.tiktok,
    icon: "tiktok",
    visible: true,
    order: 30,
  },
  {
    id: "apple",
    title: "APPLE MUSIC",
    href: appleId && APPLE_ID_RE.test(appleId) ? `https://music.apple.com/artist/${appleId}` : "",
    icon: "apple",
    visible: !!(appleId && APPLE_ID_RE.test(appleId)),
    order: 40,
  },
  {
    id: "instagram",
    title: "INSTAGRAM",
    href: instagram ?? "",
    icon: "instagram",
    visible: !!instagram && /^https:\/\/(www\.)?instagram\.com\//.test(instagram),
    order: 50,
  },
  {
    id: "music",
    title: "MUSIC & RELEASES",
    subtitle: "Gambian Prince · Gambian Kings & Sons",
    href: "/music",
    icon: "music",
    visible: true,
    order: 60,
  },
  {
    id: "videos",
    title: "LATEST VIDEOS",
    href: "/visuals",
    icon: "video",
    visible: true,
    order: 70,
  },
  {
    id: "merch",
    title: "MERCH",
    subtitle: "Coming soon",
    href: "/merch",
    icon: "merch",
    visible: true,
    order: 80,
  },
];

export const isExternal = (href: string): boolean => /^https?:\/\//.test(href);

/** Sichtbare Links in Anzeigereihenfolge; Einträge ohne Ziel werden nie ausgegeben. */
export function visibleLinks(entries: readonly LinkEntry[] = linkEntries): LinkEntry[] {
  return entries.filter((e) => e.visible && e.href).sort((a, b) => a.order - b.order);
}
