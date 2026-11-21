import { describe, expect, it } from "vitest";
import { linkEntries, visibleLinks, isExternal } from "@/config/links.config";
import { siteConfig } from "@/config/site.config";

describe("Links-Konfiguration", () => {
  it("zeigt nur sichtbare Links mit Ziel, nach order sortiert", () => {
    const l = visibleLinks();
    expect(l.every((e) => e.href && e.visible)).toBe(true);
    expect(l.map((e) => e.order)).toEqual([...l.map((e) => e.order)].sort((a, b) => a - b));
  });
  it("blendet unverifizierte Profile (Spotify/Apple/Instagram) aus, solange keine ID konfiguriert ist", () => {
    const ids = visibleLinks().map((e) => e.id);
    if (!siteConfig.profiles.spotifyArtistId) expect(ids).not.toContain("spotify");
    if (!siteConfig.profiles.appleArtistId) expect(ids).not.toContain("apple");
    if (!siteConfig.profiles.instagramUrl) expect(ids).not.toContain("instagram");
  });
  it("übernimmt die offiziellen Kanäle aus dem Originalprojekt", () => {
    const byId = Object.fromEntries(linkEntries.map((e) => [e.id, e.href]));
    expect(byId["youtube"]).toBe("https://www.youtube.com/@RenzoVibes");
    expect(byId["tiktok"]).toBe("https://www.tiktok.com/@renzo_vibez");
  });
  it("unterscheidet interne und externe Ziele", () => {
    expect(isExternal("https://x.y")).toBe(true);
    expect(isExternal("/music")).toBe(false);
  });
});
