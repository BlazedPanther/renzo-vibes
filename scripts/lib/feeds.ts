/* eslint-disable @typescript-eslint/no-explicit-any -- untrusted Feed-JSON/XML wird defensiv geprüft */
/**
 * Reine Funktionen für Feed-Verarbeitung (ohne Netzwerk) – getestet in src/test/feeds.test.ts.
 * Läuft in Node (>=22.18, Type-Stripping) und in Vitest. Nur "erasable" TypeScript verwenden.
 */
import { XMLParser } from "fast-xml-parser";

export interface VideoItem {
  id: string;
  title: string;
  published: string; // ISO-8601
  url: string;
}
export interface VideosFile {
  updatedAt: string | null;
  source: string;
  channelId: string | null;
  items: VideoItem[];
}
export interface ReleaseItem {
  id: string;
  title: string;
  type: "Album" | "EP" | "Single";
  isoDate: string; // YYYY-MM-DD
  url: string;
}
export interface MusicFile {
  updatedAt: string | null;
  source: string;
  artistId: string | null;
  items: ReleaseItem[];
}

const VIDEO_ID_RE = /^[\w-]{11}$/;
const CHANNEL_RE = /^UC[\w-]{22}$/;

const asArray = <T>(v: T | T[] | undefined): T[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];
const str = (v: unknown): string =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : "";

/**
 * Parst den öffentlichen YouTube-Atom-Feed. Verwirft Einträge mit ungültiger Video-ID,
 * ungültigem Datum oder fremder Channel-ID. Sortiert neueste zuerst, entfernt Duplikate.
 * Gibt `null` zurück, wenn das XML unbrauchbar ist oder der Feed zu einem anderen Kanal gehört.
 */
export function parseYouTubeFeed(xml: string, channelId: string, limit = 6): VideoItem[] | null {
  if (!CHANNEL_RE.test(channelId)) return null;
  let doc: any;
  try {
    // Keine Entity-Expansion / kein DOCTYPE-Processing: schützt vor XML-Bombs.
    const parser = new XMLParser({
      ignoreAttributes: false,
      processEntities: false,
      parseTagValue: false,
    });
    doc = parser.parse(xml);
  } catch {
    return null;
  }
  const feed = doc?.feed;
  if (!feed) return null;
  const feedChannel = str(feed["yt:channelId"]);
  // YouTube schreibt die Kanal-ID im Feed-Kopf ohne "UC"-Präfix, in den Einträgen mit.
  if (feedChannel && feedChannel !== channelId && `UC${feedChannel}` !== channelId) return null;

  const seen = new Set<string>();
  const items: VideoItem[] = [];
  for (const e of asArray<any>(feed.entry)) {
    const id = str(e?.["yt:videoId"]);
    const title = str(e?.title).replace(/\s+/g, " ").trim();
    const published = str(e?.published);
    const entryChannel = str(e?.["yt:channelId"]);
    if (!VIDEO_ID_RE.test(id) || !title) continue;
    if (entryChannel && entryChannel !== channelId) continue;
    const t = Date.parse(published);
    if (Number.isNaN(t)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({
      id,
      title,
      published: new Date(t).toISOString(),
      url: `https://www.youtube.com/watch?v=${id}`,
    });
  }
  items.sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
  return items.slice(0, limit);
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\s*-\s*(single|ep)\s*$/i, "")
    .replace(/\s*[([]\s*(deluxe|remaster(ed)?|explicit)[^)\]]*[)\]]/gi, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const APPLE_HOSTS = new Set(["music.apple.com", "itunes.apple.com"]);

/**
 * Filtert eine iTunes-Lookup-Antwort (`/lookup?id=<artistId>&entity=album`):
 * nur Collections exakt dieses Künstlers (artistId), plausibler Name, gültiges Datum,
 * Apple-Host-URL; Dubletten (gleicher normalisierter Titel) entfernt; neueste zuerst.
 */
export function filterItunesReleases(
  json: unknown,
  artistId: string,
  expectedName: string,
  limit = 8,
): ReleaseItem[] | null {
  const results = (json as any)?.results;
  if (!Array.isArray(results)) return null;
  const artist = results.find(
    (r: any) => r?.wrapperType === "artist" && str(r.artistId) === artistId,
  );
  if (!artist) return null; // falsche/unbekannte ID
  if (norm(str(artist.artistName)) !== norm(expectedName)) return null; // falscher Artist-Match

  const bestByTitle = new Map<string, ReleaseItem>();
  for (const r of results) {
    if (r?.wrapperType !== "collection" || str(r.artistId) !== artistId) continue;
    const id = str(r.collectionId);
    const title = str(r.collectionName).trim();
    const t = Date.parse(str(r.releaseDate));
    let host = "";
    try {
      const u = new URL(str(r.collectionViewUrl));
      if (u.protocol === "https:") host = u.hostname;
    } catch {
      /* ungültige URL */
    }
    if (!id || !title || Number.isNaN(t) || !APPLE_HOSTS.has(host)) continue;
    const name = title.toLowerCase();
    const type: ReleaseItem["type"] = /-\s*single$/.test(name)
      ? "Single"
      : /-\s*ep$/.test(name)
        ? "EP"
        : "Album";
    const url = new URL(str(r.collectionViewUrl));
    url.search = ""; // Tracking-Parameter (?uo=4) entfernen
    const item: ReleaseItem = {
      id,
      title: title.replace(/\s*-\s*(Single|EP)\s*$/i, ""),
      type,
      isoDate: new Date(t).toISOString().slice(0, 10),
      url: url.toString(),
    };
    const key = norm(title);
    const prev = bestByTitle.get(key);
    if (!prev || item.isoDate < prev.isoDate) bestByTitle.set(key, item); // frühestes Datum = Erstveröffentlichung
  }
  return [...bestByTitle.values()]
    .sort((a, b) => b.isoDate.localeCompare(a.isoDate))
    .slice(0, limit);
}

/**
 * Cache-Logik: Neue gültige, nicht-leere Daten ersetzen den Cache. Bei Fehler/leer bleibt der Cache.
 * `changed=false` verhindert Commits ohne inhaltliche Änderung (kein Schein-Activity-Rauschen).
 */
export function mergeWithCache<T extends { updatedAt: string | null; items: unknown[] }>(
  fresh: unknown[] | null,
  cache: T,
  now: string,
): { data: T; changed: boolean; usedCache: boolean } {
  if (!fresh || fresh.length === 0) return { data: cache, changed: false, usedCache: true };
  if (JSON.stringify(fresh) === JSON.stringify(cache.items))
    return { data: cache, changed: false, usedCache: false };
  return { data: { ...cache, updatedAt: now, items: fresh }, changed: true, usedCache: false };
}
