/**
 * Lädt die Originalmedien (Bilder/Logo) in public/media/ – NUR ausführen, wenn der Betreiber der
 * Originalseite der Übernahme zugestimmt hat (siehe MEDIA.md). Prüft Dateigrösse gegen das Manifest.
 * Alternativ die Dateien manuell mit den Namen aus data/media-manifest.json ablegen.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";

if (process.env["MEDIA_RIGHTS_CONFIRMED"] !== "true") {
  console.error(
    "Abbruch: Setze MEDIA_RIGHTS_CONFIRMED=true erst nach schriftlicher Zustimmung des Rechteinhabers (MEDIA.md).",
  );
  process.exit(1);
}
const manifest = JSON.parse(await readFile("data/media-manifest.json", "utf8")) as {
  origin: string;
  files: { file: string; size: number; contentType: string; originalPointer: string }[];
};
await mkdir("public/media", { recursive: true });
let failed = 0;
for (const f of manifest.files) {
  try {
    const res = await fetch(new URL(f.originalPointer, manifest.origin), {
      signal: AbortSignal.timeout(30_000),
    });
    const buf = Buffer.from(await res.arrayBuffer());
    if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/"))
      throw new Error(`HTTP ${res.status}`);
    if (buf.length !== f.size)
      console.warn(`Hinweis: ${f.file} hat ${buf.length} B, Manifest erwartet ${f.size} B`);
    await writeFile(`public/media/${f.file}`, buf);
    console.log(`ok ${f.file}`);
  } catch (e) {
    failed++;
    console.error(`FEHLT ${f.file}: ${(e as Error).message}`);
  }
}
process.exit(failed ? 2 : 0);
