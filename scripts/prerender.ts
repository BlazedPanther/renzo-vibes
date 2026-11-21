/**
 * Prerendering: erzeugt je Route eine statische HTML-Datei (dist/<route>/index.html), 404.html,
 * sitemap.xml, robots.txt und – nur bei konfigurierter Domain – CNAME. Hydration übernimmt der Client.
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { siteConfig, siteUrl } from "../src/config/site.config.ts";
import { headToHtml } from "../src/lib/head.ts";

const base = (process.env["BASE_PATH"] ?? "/").replace(/\/?$/, "/");
const routes = [
  "/",
  "/music",
  "/visuals",
  "/about",
  "/merch",
  "/connect",
  "/links",
  "/datenschutz",
  ...(siteConfig.legal.impressum.enabled ? ["/impressum"] : []),
];
const dist = "dist";
const exists = (p: string) =>
  access(p).then(
    () => true,
    () => false,
  );

const { render } = (await import(pathToFileURL(path.resolve("dist-ssr/entry-server.js")).href)) as {
  render: (
    url: string,
  ) => Promise<{ html: string; head: Parameters<typeof headToHtml>[0]; notFound: boolean }>;
};
const template = await readFile(`${dist}/index.html`, "utf8");
if (!template.includes("<!--head-->") || !template.includes("<!--app-->"))
  throw new Error("index.html-Vorlage ohne Platzhalter");

const origin = siteUrl();
const ogImageFile = "media/renzo-cover.webp";
const ogImage =
  origin && (await exists(`dist/${ogImageFile}`))
    ? [
        `<meta property="og:image" content="${origin}/${ogImageFile}">`,
        `<meta name="twitter:image" content="${origin}/${ogImageFile}">`,
      ]
    : [];

async function emit(url: string, file: string) {
  const { html, head, notFound } = await render(base.replace(/\/$/, "") + url);
  if (notFound && file !== "404.html") throw new Error(`Route ${url} wurde als 404 gerendert`);
  // React 19 hoistet <link rel=preload> in den Fragment-Output: ins <head> verschieben, sonst Hydration-Mismatch.
  const preloads = html.match(/<link rel="preload"[^>]*\/>/g) ?? [];
  const body = html.replace(/<link rel="preload"[^>]*\/>/g, "");
  const page = template
    .replace("<!--head-->", () => headToHtml(head, [...ogImage, ...preloads]))
    .replace("<!--app-->", () => body);
  const out = path.join(dist, file);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, page);
  console.log(`prerendered ${url} -> ${out}`);
}

for (const r of routes) await emit(r, r === "/" ? "index.html" : `${r.slice(1)}/index.html`);
await emit("/__not-found__", "404.html");

if (origin) {
  const urls = routes
    .map((r) => `  <url><loc>${origin}${r === "/" ? "/" : r}</loc></url>`)
    .join("\n");
  await writeFile(
    `${dist}/sitemap.xml`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  );
  await writeFile(
    `${dist}/robots.txt`,
    `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`,
  );
  await writeFile(`${dist}/CNAME`, `${siteUrl()!.replace("https://", "")}\n`);
} else {
  await writeFile(`${dist}/robots.txt`, `User-agent: *\nAllow: /\n`);
  console.log(
    "::warning title=Prerender::Keine Domain konfiguriert – sitemap.xml und CNAME wurden nicht erzeugt.",
  );
}
await writeFile(`${dist}/.nojekyll`, "");
