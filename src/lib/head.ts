import { siteUrl } from "../config/site.config.ts";

interface MetaTag {
  title?: string;
  name?: string;
  property?: string;
  content?: string;
}
export interface HeadData {
  title: string;
  metas: { name?: string | undefined; property?: string | undefined; content: string }[];
  canonical: string | null;
}

/** Fasst die `head().meta`-Einträge aller aktiven Routen zusammen (tiefere Routen überschreiben). */
export function collectHead(
  matches: { meta?: unknown; pathname: string }[],
  pathname: string,
): HeadData {
  let title = "Renzo Vibes";
  const map = new Map<string, HeadData["metas"][number]>();
  for (const m of matches) {
    for (const t of (m.meta as (MetaTag | undefined)[] | undefined) ?? []) {
      if (!t) continue;
      if (t.title) title = t.title;
      else if (t.content !== undefined && (t.name || t.property)) {
        const key = t.name ? `n:${t.name}` : `p:${t.property}`;
        map.set(
          key,
          t.name
            ? { name: t.name, content: t.content }
            : { property: t.property as string, content: t.content },
        );
      }
    }
  }
  const base = siteUrl();
  const canonical = base ? `${base}${pathname === "/" ? "/" : pathname.replace(/\/+$/, "")}` : null;
  const metas = [...map.values()];
  metas.push({ property: "og:title", content: map.get("p:og:title")?.content ?? title });
  if (canonical) metas.push({ property: "og:url", content: canonical });
  return { title, metas: dedupe(metas), canonical };
}

function dedupe(metas: HeadData["metas"]): HeadData["metas"] {
  const seen = new Map<string, HeadData["metas"][number]>();
  for (const m of metas) seen.set(m.name ? `n:${m.name}` : `p:${m.property}`, m);
  return [...seen.values()];
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** HTML-escaped Head-Tags für das Prerendering (keine ungefilterte Injektion). */
export function headToHtml(h: HeadData, extra: string[] = []): string {
  const tags = [`<title>${esc(h.title)}</title>`];
  for (const m of h.metas) {
    tags.push(
      m.name
        ? `<meta name="${esc(m.name)}" content="${esc(m.content)}">`
        : `<meta property="${esc(m.property ?? "")}" content="${esc(m.content)}">`,
    );
  }
  if (h.canonical) tags.push(`<link rel="canonical" href="${esc(h.canonical)}">`);
  return [...tags, ...extra].join("\n    ");
}

/** Client: Titel/Meta nach Navigation aktualisieren (statt <HeadContent/>, um Duplikate zu vermeiden). */
export function applyHeadToDocument(h: HeadData) {
  document.title = h.title;
  const upsert = (attr: "name" | "property", key: string, content: string) => {
    let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${CSS.escape(key)}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };
  for (const m of h.metas)
    upsert(m.name ? "name" : "property", (m.name ?? m.property) as string, m.content);
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (h.canonical) {
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = h.canonical;
  } else link?.remove();
}
