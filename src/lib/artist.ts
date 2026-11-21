import videosData from "../../data/videos.json";
import musicData from "../../data/music.json";
import { siteConfig } from "@/config/site.config";
import type { MusicFile } from "../../scripts/lib/feeds.ts";

/** Statische Releases aus dem Originalprojekt (immer sichtbar, Fallback und Basis). */
export const releases = [
  {
    title: "GAMBian Prince",
    type: "EP",
    date: "20.03.2026",
    isoDate: "2026-03-20",
    style: "prince",
  },
  {
    title: "Gambian Kings & Sons",
    type: "Album",
    date: "31.07.2026",
    isoDate: "2026-07-31",
    style: "kings",
  },
];
const staticTracks = [
  {
    label: "LISTEN #01",
    title: "MoneyMoney ft. Joel Anjonu Orin",
    id: "Mw4mxqRhytU",
    url: "https://youtu.be/Mw4mxqRhytU",
  },
  {
    label: "LISTEN #02",
    title: "RVP for President ft. Top Striker",
    id: "ivYRhk-Cgys",
    url: "https://youtu.be/ivYRhk-Cgys",
  },
];
export type Track = { label: string; title: string; id: string; url: string; thumbnail: string };
const thumb = (id: string) => `${import.meta.env.BASE_URL}thumbs/${id}.jpg`;
/** Automatische Uploads aus data/videos.json (GitHub-Actions-Feed); ohne Daten die statischen Videos. */
export function buildTracks(
  feed: { items: { id: string; title: string; url: string }[] },
  limit = siteConfig.feeds.maxVideos,
): Track[] {
  const source = feed.items.length > 0 ? feed.items.slice(0, limit) : staticTracks;
  return source.map((t, i) => ({
    label: `LISTEN #${String(i + 1).padStart(2, "0")}`,
    title: t.title,
    id: t.id,
    url: t.url,
    thumbnail: thumb(t.id),
  }));
}
export const tracks = buildTracks(videosData);
export const channels = siteConfig.channels;
export type LatestRelease = {
  id: string;
  title: string;
  type: string;
  isoDate: string;
  date: string;
  url: string;
};
export const formatDate = (iso: string) =>
  iso.slice(8, 10) + "." + iso.slice(5, 7) + "." + iso.slice(0, 4);
/** Automatische Releases aus data/music.json (Apple/iTunes); leer, solange keine Artist-ID verifiziert ist. */
export const latestReleases: LatestRelease[] = (musicData as MusicFile).items.map((r) => ({
  ...r,
  date: formatDate(r.isoDate),
}));
export function artistHead(title: string, description: string) {
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  };
}
