import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Disc,
  Globe,
  Instagram,
  Music2,
  Play,
  ShoppingBag,
  Video,
  Youtube,
} from "lucide-react";
import type { ComponentType } from "react";
import { artistHead } from "@/lib/artist";
import { mediaFiles } from "@/lib/media";
import { isExternal, visibleLinks, type LinkIcon } from "@/config/links.config";

const icons: Record<LinkIcon, ComponentType> = {
  spotify: Disc,
  apple: Disc,
  youtube: Youtube,
  tiktok: Music2,
  website: Globe,
  music: Play,
  video: Video,
  merch: ShoppingBag,
  instagram: Instagram,
};

export const Route = createFileRoute("/links")({
  head: () =>
    artistHead(
      "Links | Renzo Vibes",
      "All official Renzo Vibes links in one place: music, videos, TikTok, YouTube and more.",
    ),
  component: LinksPage,
});

function LinksPage() {
  const links = visibleLinks();
  return (
    <main className="links-page">
      <header className="links-profile">
        <img
          src={mediaFiles.logo.url}
          alt="Renzo Vibes logo"
          className="brand-logo"
          width={96}
          height={96}
        />
        <h1>RENZO VIBES</h1>
        <p>
          Italian Dancehall Artist / International Award Winner. Feel the rhythm. Live the vibe.
        </p>
      </header>
      <ul className="links-list">
        {links.map((l) => {
          const Icon = icons[l.icon];
          const inner = (
            <>
              <Icon />
              <span>
                {l.title}
                {l.subtitle && <small>{l.subtitle}</small>}
              </span>
              <ArrowUpRight />
            </>
          );
          return (
            <li key={l.id}>
              {isExternal(l.href) ? (
                <a className="links-card" href={l.href} target="_blank" rel="noopener noreferrer">
                  {inner}
                </a>
              ) : (
                <Link className="links-card" to={l.href}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <nav className="links-foot" aria-label="Legal">
        <Link to="/">HOME</Link>
        <Link to="/datenschutz">DATENSCHUTZ</Link>
      </nav>
    </main>
  );
}
