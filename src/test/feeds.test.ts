import { describe, expect, it } from "vitest";
import { parseYouTubeFeed, filterItunesReleases, mergeWithCache } from "../../scripts/lib/feeds.ts";

const CH = "UCabcdefghijklmnopqrstuv";
const entry = (id: string, title: string, published: string, ch = CH) =>
  `<entry><yt:videoId>${id}</yt:videoId><yt:channelId>${ch}</yt:channelId><title>${title}</title><published>${published}</published></entry>`;
const feed = (entries: string, ch = CH) =>
  `<?xml version="1.0"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"><yt:channelId>${ch}</yt:channelId>${entries}</feed>`;

describe("YouTube-Feed", () => {
  it("akzeptiert den echten Feed-Kopf ohne UC-Präfix", () => {
    const xml = feed(entry("AAAAAAAAAAA", "A", "2026-01-01T10:00:00+00:00"), CH.slice(2));
    expect(parseYouTubeFeed(xml, CH)).toHaveLength(1);
  });
  it("sortiert neueste zuerst, entfernt Dubletten und ungültige Einträge", () => {
    const xml = feed(
      entry("AAAAAAAAAAA", "Alt", "2026-01-01T10:00:00+00:00") +
        entry("BBBBBBBBBBB", "Neu", "2026-06-01T10:00:00+00:00") +
        entry("BBBBBBBBBBB", "Neu doppelt", "2026-06-01T10:00:00+00:00") +
        entry("bad", "Ungültige ID", "2026-07-01T10:00:00+00:00") +
        entry(
          "CCCCCCCCCCC",
          "Fremder Kanal",
          "2026-07-01T10:00:00+00:00",
          "UCzzzzzzzzzzzzzzzzzzzzzz",
        ) +
        entry("DDDDDDDDDDD", "Kaputtes Datum", "gestern"),
    );
    const items = parseYouTubeFeed(xml, CH)!;
    expect(items.map((i) => i.id)).toEqual(["BBBBBBBBBBB", "AAAAAAAAAAA"]);
    expect(items[0]!.url).toBe("https://www.youtube.com/watch?v=BBBBBBBBBBB");
  });
  it("begrenzt die Anzahl", () => {
    const xml = feed(
      Array.from({ length: 9 }, (_, i) =>
        entry(`V${String(i).padStart(10, "0")}`, `T${i}`, `2026-0${i + 1}-01T00:00:00Z`),
      ).join(""),
    );
    expect(parseYouTubeFeed(xml, CH, 3)).toHaveLength(3);
  });
  it("lehnt Feed eines anderen Kanals, ungültiges XML und ungültige Channel-ID ab", () => {
    expect(parseYouTubeFeed(feed("", "UCzzzzzzzzzzzzzzzzzzzzzz"), CH)).toBeNull();
    expect(parseYouTubeFeed("<html>kein feed</html>", CH)).toBeNull();
    expect(parseYouTubeFeed(feed(""), "nope")).toBeNull();
  });
});

const ART = "123456789";
const artist = { wrapperType: "artist", artistId: 123456789, artistName: "Renzo Vibes" };
const col = (
  id: number,
  name: string,
  date: string,
  artistId = 123456789,
  url = `https://music.apple.com/ch/album/x/${id}?uo=4`,
) => ({
  wrapperType: "collection",
  collectionId: id,
  collectionName: name,
  artistId,
  releaseDate: date,
  collectionViewUrl: url,
});

describe("iTunes-Releases", () => {
  it("filtert fremde Künstler, Dubletten, ungültige Hosts; sortiert nach Datum", () => {
    const json = {
      results: [
        artist,
        col(1, "Gambian Prince - EP", "2026-03-20T07:00:00Z"),
        col(2, "Gambian Kings & Sons", "2026-07-31T07:00:00Z"),
        col(3, "Gambian Prince", "2026-03-21T07:00:00Z"), // Duplikat (andere Edition)
        col(4, "Fremder Song", "2026-08-01T07:00:00Z", 999),
        col(5, "Phishing", "2026-08-02T07:00:00Z", 123456789, "https://evil.example/x"),
        col(6, "Ohne Datum", "kaputt"),
      ],
    };
    const items = filterItunesReleases(json, ART, "Renzo Vibes")!;
    expect(items.map((i) => i.title)).toEqual(["Gambian Kings & Sons", "Gambian Prince"]);
    expect(items[1]).toMatchObject({
      type: "EP",
      isoDate: "2026-03-20",
      url: "https://music.apple.com/ch/album/x/1",
    });
  });
  it("verwirft falschen Artist-Match oder fehlenden Artist", () => {
    expect(
      filterItunesReleases(
        { results: [{ ...artist, artistName: "Renzo" }, col(1, "A", "2026-01-01T00:00:00Z")] },
        ART,
        "Renzo Vibes",
      ),
    ).toBeNull();
    expect(
      filterItunesReleases({ results: [col(1, "A", "2026-01-01T00:00:00Z")] }, ART, "Renzo Vibes"),
    ).toBeNull();
    expect(filterItunesReleases({}, ART, "Renzo Vibes")).toBeNull();
  });
});

describe("Cache-Fallback", () => {
  const cache = { updatedAt: "2026-01-01T00:00:00Z", items: [{ id: "x" }] };
  it("behält den Cache bei Fehler oder leerem Ergebnis", () => {
    expect(mergeWithCache(null, cache, "now")).toMatchObject({
      data: cache,
      changed: false,
      usedCache: true,
    });
    expect(mergeWithCache([], cache, "now").data).toBe(cache);
  });
  it("übernimmt neue Daten nur bei Änderung", () => {
    expect(mergeWithCache([{ id: "x" }], cache, "now").changed).toBe(false);
    const r = mergeWithCache([{ id: "y" }], cache, "now");
    expect(r).toMatchObject({ changed: true, data: { updatedAt: "now", items: [{ id: "y" }] } });
  });
});
