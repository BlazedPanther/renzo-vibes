/**
 * Holt zum Build-Zeitpunkt (GitHub Actions) neueste YouTube-Uploads und Apple/iTunes-Releases
 * und schreibt data/videos.json + data/music.json. Bei Fehlern bleibt der letzte gültige Cache
 * erhalten; Exit-Code ist immer 0 (die Seite muss bauen), Probleme erscheinen als ::warning::.
 * Kein API-Key, keine Secrets. Läuft nicht im Browser.
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { siteConfig, YT_CHANNEL_RE, APPLE_ID_RE, YT_VIDEO_RE } from "../src/config/site.config.ts";
import { parseYouTubeFeed, filterItunesReleases, mergeWithCache } from "./lib/feeds.ts";
import type { VideosFile, MusicFile } from "./lib/feeds.ts";

const UA = "rent2wipes-feed-updater/1.0 (static artist site; GitHub Actions)";
const warn = (m: string) => console.log(`::warning title=Feed-Update::${m}`);
const info = (m: string) => console.log(m);

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}
async function fetchText(url: string, accept: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (text.length > 2_000_000) throw new Error("Antwort unplausibel gross");
  return text;
}
const exists = (p: string) =>
  access(p).then(
    () => true,
    () => false,
  );

async function updateVideos(): Promise<VideosFile> {
  const file = "data/videos.json";
  const cache = await readJson<VideosFile>(file, {
    updatedAt: null,
    source: "youtube-feed",
    channelId: null,
    items: [],
  });
  const channelId = siteConfig.profiles.youtubeChannelId;
  if (!channelId || !YT_CHANNEL_RE.test(channelId)) {
    warn(
      "YouTube-Channel-ID fehlt/ungültig (src/config/site.config.ts) – Video-Feed übersprungen, statische Videos bleiben.",
    );
    return cache;
  }
  let fresh = null;
  try {
    const xml = await fetchText(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
      "application/atom+xml, text/xml",
    );
    fresh = parseYouTubeFeed(xml, channelId, siteConfig.feeds.maxVideos);
    if (!fresh)
      warn("YouTube-Feed unbrauchbar oder gehört zu einem anderen Kanal – Cache wird verwendet.");
  } catch (e) {
    warn(`YouTube-Feed nicht abrufbar (${(e as Error).message}) – Cache wird verwendet.`);
  }
  const { data, changed, usedCache } = mergeWithCache(
    fresh,
    { ...cache, channelId },
    new Date().toISOString(),
  );
  if (changed || cache.channelId !== channelId)
    await writeFile(file, JSON.stringify(data, null, 2) + "\n");
  info(
    `videos: ${data.items.length} Einträge (${usedCache ? "Cache" : changed ? "aktualisiert" : "unverändert"})`,
  );
  return data;
}

async function updateMusic(): Promise<void> {
  const file = "data/music.json";
  const cache = await readJson<MusicFile>(file, {
    updatedAt: null,
    source: "apple-itunes-lookup",
    artistId: null,
    items: [],
  });
  const artistId = siteConfig.profiles.appleArtistId;
  if (!artistId || !APPLE_ID_RE.test(artistId)) {
    warn(
      "Apple-Artist-ID fehlt/ungültig (src/config/site.config.ts) – Release-Feed übersprungen, statische Releases bleiben.",
    );
    return;
  }
  let fresh = null;
  try {
    const txt = await fetchText(
      `https://itunes.apple.com/lookup?id=${artistId}&entity=album&limit=200`,
      "application/json",
    );
    fresh = filterItunesReleases(
      JSON.parse(txt),
      artistId,
      siteConfig.profiles.appleArtistName,
      siteConfig.feeds.maxReleases,
    );
    if (!fresh) warn("iTunes-Antwort passt nicht zum erwarteten Künstler – Cache wird verwendet.");
  } catch (e) {
    warn(`iTunes-Lookup nicht abrufbar (${(e as Error).message}) – Cache wird verwendet.`);
  }
  const { data, changed, usedCache } = mergeWithCache(
    fresh,
    { ...cache, artistId },
    new Date().toISOString(),
  );
  if (changed || cache.artistId !== artistId)
    await writeFile(file, JSON.stringify(data, null, 2) + "\n");
  info(
    `music: ${data.items.length} Einträge (${usedCache ? "Cache" : changed ? "aktualisiert" : "unverändert"})`,
  );
}

/** Lädt Vorschaubilder lokal (kein Drittserver-Kontakt der Besucher vor dem Klick). */
async function mirrorThumbnails(ids: string[]) {
  await mkdir("public/thumbs", { recursive: true });
  for (const id of ids) {
    if (!YT_VIDEO_RE.test(id)) continue;
    const out = `public/thumbs/${id}.jpg`;
    if (await exists(out)) continue;
    try {
      const res = await fetch(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`, {
        headers: { "user-agent": UA },
        signal: AbortSignal.timeout(20_000),
      });
      const buf = Buffer.from(await res.arrayBuffer());
      if (
        !res.ok ||
        !(res.headers.get("content-type") ?? "").startsWith("image/jpeg") ||
        buf.length < 1000 ||
        buf.length > 500_000
      )
        throw new Error(`HTTP ${res.status}`);
      await writeFile(out, buf);
      info(`thumb: ${id}`);
    } catch (e) {
      warn(`Vorschaubild ${id} nicht ladbar (${(e as Error).message}).`);
    }
  }
}

const videos = await updateVideos();
await updateMusic();
const staticIds = (await readJson<{ ids: string[] }>("data/static-video-ids.json", { ids: [] }))
  .ids;
await mirrorThumbnails([...new Set([...videos.items.map((v) => v.id), ...staticIds])]);
