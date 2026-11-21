import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Play, Youtube, Globe, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { releases, channels, tracks, latestReleases, type Track } from "@/lib/artist";
import { mediaFiles } from "@/lib/media";
import { spotifyArtistId } from "@/config/site.config";

const { portrait, logo, shirt, hoodie, goatShirt } = mediaFiles;

const merchItems = [
  {
    image: shirt,
    alt: "Black Renzo Vibes POW POW T-shirt with purple lightning and Renzo portraits",
    caption: "POW POW TEE · COMING SOON",
  },
  {
    image: hoodie,
    alt: "Black Renzo Vibes POW POW hoodie with red graphic print",
    caption: "POW POW HOODIE · COMING SOON",
  },
  {
    image: goatShirt,
    alt: "Black Renzo Goat T-shirt, front with portrait print and POW POW back",
    caption: "RENZO GOAT TEE · COMING SOON",
  },
];

function Heading({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">
          <span />
          {label}
        </p>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
export function Hero() {
  return (
    <section className="artist-hero">
      <img
        className="hero-image"
        src={portrait.url}
        alt="Renzo in a red hoodie and RV cap"
        fetchPriority="high"
      />
      <div className="hero-shade" />
      <div className="hero-content">
        <p className="eyebrow">
          <span />
          FROM ITALY. TO THE WORLD.
        </p>
        <h1>
          RENZO <span>VIBES</span>
          <span className="name-period">.</span>
        </h1>
        <p className="hero-tagline">
          Feel the rhythm.
          <br />
          Live the vibe.
        </p>
        <p className="hero-subtitle">
          Italian Dancehall Artist <span> / </span> International Award Winner
        </p>
        <div className="hero-actions">
          <Button asChild variant="artist">
            <Link to="/music">
              <Music2 /> LISTEN NOW <ArrowUpRight />
            </Link>
          </Button>
          <Button asChild variant="artistOutline">
            <a href={channels.youtube} target="_blank" rel="noopener noreferrer">
              <Play /> WATCH ON YOUTUBE
            </a>
          </Button>
        </div>
      </div>
      <div className="hero-bottom">
        <span>
          DANCEHALL &nbsp; / &nbsp; AFROBEATS &nbsp; / &nbsp; AMAPIANO &nbsp; / &nbsp; HIP HOP
        </span>
        <a href="#listen" className="scroll-link">
          SCROLL TO EXPLORE <span>↓</span>
        </a>
      </div>
    </section>
  );
}
/** Zwei-Klick-Player: bis zum Klick wird KEINE Verbindung zu YouTube aufgebaut (Vorschau liegt lokal). */
function VideoCard({ track: t }: { track: Track }) {
  const [active, setActive] = useState(false);
  const [thumbOk, setThumbOk] = useState(true);
  return (
    <div className="video-item">
      <div className="video-image">
        {active ? (
          <iframe
            className="video-frame"
            src={`https://www.youtube-nocookie.com/embed/${t.id}?autoplay=1&rel=0`}
            title={t.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            type="button"
            className="video-play"
            onClick={() => setActive(true)}
            aria-label={`Play ${t.title} (loads YouTube player)`}
          >
            {thumbOk && (
              <img
                ref={(el) => {
                  if (el && el.complete && el.naturalWidth === 0) setThumbOk(false);
                }}
                src={t.thumbnail}
                alt=""
                loading="lazy"
                onError={() => setThumbOk(false)}
              />
            )}
            <span className="play-circle">
              <Play fill="currentColor" />
            </span>
          </button>
        )}
      </div>
      <div className="video-title">
        <div>
          <p className="release-meta">
            {t.label} <span>/</span> YOUTUBE
          </p>
          <h3>{t.title}</h3>
        </div>
        <a
          href={t.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Watch ${t.title} on YouTube`}
        >
          <ArrowUpRight />
        </a>
      </div>
    </div>
  );
}
/** Spotify-Embed (offiziell, lädt automatisch beim Hinscrollen). Erscheint nur mit verifizierter Artist-ID in site.config.ts. */
export function SpotifySection() {
  const id = spotifyArtistId();
  if (!id) return null;
  return (
    <section className="artist-section spotify-section">
      <div className="section-inner">
        <Heading label="STREAM THE VIBE" title="ON SPOTIFY.">
          <Button asChild variant="artistOutline">
            <a
              href={`https://open.spotify.com/artist/${id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Music2 /> OPEN SPOTIFY <ArrowUpRight />
            </a>
          </Button>
        </Heading>
        <div className="spotify-embed">
          <iframe
            title="Renzo Vibes on Spotify"
            src={`https://open.spotify.com/embed/artist/${id}`}
            width="100%"
            height="352"
            allow="encrypted-media; clipboard-write; fullscreen; picture-in-picture"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </section>
  );
}
export function ListenSection({ standalone = false }: { standalone?: boolean }) {
  return (
    <section
      id="listen"
      className={`artist-section visuals-section ${standalone ? "standalone" : ""}`}
    >
      <div className="section-inner">
        <Heading label="MUSIC IN MOTION" title="LISTEN TO THE VIBE.">
          <Button asChild variant="artistOutline">
            <a href={channels.youtube} target="_blank" rel="noopener noreferrer">
              <Youtube /> EXPLORE ON YOUTUBE <ArrowUpRight />
            </a>
          </Button>
        </Heading>
        <div className="track-grid">
          {tracks.map((t) => (
            <VideoCard key={t.id} track={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
export function ReleasesSection({ standalone = false }: { standalone?: boolean }) {
  return (
    <section className={`artist-section ${standalone ? "standalone" : ""}`}>
      <div className="section-inner">
        <Heading label="THE LATEST RELEASES" title="RELEASES">
          {!standalone && (
            <Button asChild variant="navigation">
              <Link to="/music">
                ALL MUSIC <ArrowUpRight />
              </Link>
            </Button>
          )}
        </Heading>
        <div className="release-grid">
          {releases.map((release, i) => (
            <article className="release-item" key={release.title}>
              <div className={`album-art ${release.style}`}>
                <div className="album-lettering">
                  <span>RENZO VIBES</span>
                  <strong>
                    {i === 0 ? (
                      <>
                        GAMBIAN
                        <br />
                        PRINCE
                      </>
                    ) : (
                      <>
                        GAMBIAN
                        <br />
                        KINGS & SONS
                      </>
                    )}
                  </strong>
                  <span>{release.type.toUpperCase()} · 2026</span>
                </div>
                <span className="art-label">OFFICIAL ARTWORK COMING SOON</span>
                <span className="album-number">0{i + 1}</span>
              </div>
              <div className="release-info">
                <div>
                  <p className="release-meta">
                    {release.type} <span> / </span>
                    <time dateTime={release.isoDate}>{release.date}</time>
                  </p>
                  <h3>{release.title}</h3>
                </div>
                <Button asChild variant="navigation">
                  <a href={channels.youtube} target="_blank" rel="noopener noreferrer">
                    LISTEN <ArrowUpRight />
                  </a>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
/** Automatisch aktualisierte Releases (Apple/iTunes, per GitHub Actions); nur sichtbar, wenn Daten vorhanden sind. */
export function LatestReleasesSection() {
  if (latestReleases.length === 0) return null;
  return (
    <section className="artist-section latest-section">
      <div className="section-inner">
        <Heading label="FRESH FROM THE FEED" title="LATEST DROPS." />
        <ul className="latest-list">
          {latestReleases.map((r) => (
            <li key={r.id}>
              <div>
                <p className="release-meta">
                  {r.type} <span>/</span> <time dateTime={r.isoDate}>{r.date}</time>
                </p>
                <h3>{r.title}</h3>
              </div>
              <Button asChild variant="navigation">
                <a href={r.url} target="_blank" rel="noopener noreferrer">
                  APPLE MUSIC <ArrowUpRight />
                </a>
              </Button>
            </li>
          ))}
        </ul>
        <p className="consent-note">Release data via the Apple Music / iTunes Search API.</p>
      </div>
    </section>
  );
}
export function MusicSection({ standalone = false }: { standalone?: boolean }) {
  return (
    <>
      <SpotifySection />
      <ListenSection standalone={standalone} />
      <ReleasesSection />
      <LatestReleasesSection />
    </>
  );
}
export function VisualsSection({ standalone = false }: { standalone?: boolean }) {
  return <ListenSection standalone={standalone} />;
}
export function AboutSection({ standalone = false }: { standalone?: boolean }) {
  return (
    <section className={`artist-section about-section ${standalone ? "standalone" : ""}`}>
      <div className="section-inner about-grid">
        <div className="about-photo reveal">
          <img src={portrait.url} alt="Portrait of Renzo" loading="lazy" />
          <img className="about-badge" src={logo.url} alt="" aria-hidden="true" loading="lazy" />
          <span className="photo-caption">ITALIAN DANCEHALL. GLOBAL VIBES.</span>
        </div>
        <div className="about-copy reveal">
          <p className="eyebrow">
            <span />
            ITALIAN DANCEHALL. GLOBAL VIBES.
          </p>
          <h2>
            MEET
            <br />
            <span>RENZO.</span>
          </h2>
          <p className="signature">Welcome, it's Renzo to the globe!</p>
          <p>
            Renzo Vibes is an Italian Dancehall artist and international award winner, bringing his
            own energy and sound to the world.
          </p>
          <p>
            Driven by a love for music and culture, he explores a new wave of Afrobeats, Dancehall,
            Amapiano and Hip Hop.
          </p>
          <p>
            From the Gambian-inspired project ‘Gambian Prince’ to his album ‘Gambian Kings & Sons’,
            Renzo continues to share his sound, his journey and his vibe with the globe.
          </p>
          <p className="signature">Always new songs. Always new energy.</p>
          <p>
            Much love straight out to ya!
            <br />
            Your Renzo. Pow pow pow.
          </p>
        </div>
      </div>
    </section>
  );
}
export function MerchSection({ standalone = false }: { standalone?: boolean }) {
  return (
    <section className={`artist-section merch-section ${standalone ? "standalone" : ""}`}>
      <div className="section-inner merch-grid">
        <div>
          <p className="eyebrow">
            <span />
            POW POW — THE FIRST DROP.
          </p>
          <h2>
            WEAR
            <br />
            THE VIBE<span className="gold-text">.</span>
          </h2>
          <p className="merch-subtitle">Renzo Vibes merch is on the way.</p>
          <p className="coming-soon">
            COMING SOON. <span>↗</span>
          </p>
          <Button asChild variant="artistOutline">
            <Link to="/connect">
              STAY TUNED <ArrowUpRight />
            </Link>
          </Button>
        </div>
        <div className="merch-items">
          {merchItems.map((item) => (
            <figure className="merch-image" key={item.caption}>
              <img src={item.image.url} alt={item.alt} loading="lazy" />
              <figcaption>{item.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
export function SocialSection({ standalone = false }: { standalone?: boolean }) {
  return (
    <section className={`artist-section social-section ${standalone ? "standalone" : ""}`}>
      <div className="section-inner">
        <p className="eyebrow">
          <span />
          KEEP THE CONNECTION
        </p>
        <h2>
          FOLLOW THE JOURNEY<span className="gold-text">.</span>
        </h2>
        <div className="social-bottom">
          <p>
            Stay connected.
            <br />
            New music, new visuals, new vibes.
          </p>
          <div className="social-links">
            <a href={channels.tiktok} target="_blank" rel="noopener noreferrer">
              <Music2 />
              <span>TikTok</span>
              <ArrowUpRight />
            </a>
            <a href={channels.youtube} target="_blank" rel="noopener noreferrer">
              <Youtube />
              <span>YouTube</span>
              <ArrowUpRight />
            </a>
            <Link to="/links">
              <Globe />
              <span>All links</span>
              <ArrowUpRight />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
