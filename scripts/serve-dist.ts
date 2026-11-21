/** Minimaler statischer Server, der GitHub-Pages-Verhalten nachbildet (Ordner-Index, 404.html). */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".xml": "application/xml",
  ".txt": "text/plain",
};
const root = path.resolve(process.argv[2] ?? "dist");
const port = Number(process.argv[3] ?? 4173);

async function resolveFile(urlPath: string): Promise<string | null> {
  const p = path.join(
    root,
    path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, ""),
  );
  if (!p.startsWith(root)) return null;
  try {
    const s = await stat(p);
    if (s.isDirectory()) return resolveFile(path.join(urlPath, "index.html"));
    return p;
  } catch {
    return null;
  }
}
createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const file = await resolveFile(url.pathname);
  const target = file ?? path.join(root, "404.html");
  try {
    const body = await readFile(target);
    res.writeHead(file ? 200 : 404, {
      "content-type": types[path.extname(target)] ?? "application/octet-stream",
    });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
