import { describe, expect, it } from "vitest";
import { releases, tracks, buildTracks } from "@/lib/artist";

describe("Artist release facts", () => {
  it("GAMBian Prince is an EP released March 20, 2026", () => {
    expect(releases.find((r) => r.title === "GAMBian Prince")).toMatchObject({
      type: "EP",
      date: "20.03.2026",
      isoDate: "2026-03-20",
    });
  });
  it("Gambian Kings & Sons is an album released July 31, 2026", () => {
    expect(releases.find((r) => r.title === "Gambian Kings & Sons")).toMatchObject({
      type: "Album",
      date: "31.07.2026",
      isoDate: "2026-07-31",
    });
  });
});

describe("Music previews", () => {
  it("fallen ohne Feed-Daten auf die beiden offiziellen YouTube-Videos zurück", () => {
    expect(tracks.map((t) => t.url)).toEqual([
      "https://youtu.be/Mw4mxqRhytU",
      "https://youtu.be/ivYRhk-Cgys",
    ]);
  });
  it("nutzen Feed-Videos (begrenzt) und lokale Vorschaubilder, wenn vorhanden", () => {
    const feed = {
      items: Array.from({ length: 8 }, (_, i) => ({
        id: `V${i}`.padEnd(11, "x"),
        title: `T${i}`,
        url: `https://www.youtube.com/watch?v=V${i}`,
      })),
    };
    const t = buildTracks(feed, 6);
    expect(t).toHaveLength(6);
    expect(t[0]!.thumbnail).toMatch(/thumbs\/V0x+\.jpg$/);
    expect(t[0]!.thumbnail).not.toContain("ytimg");
  });
});
