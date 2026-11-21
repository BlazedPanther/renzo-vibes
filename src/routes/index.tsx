import { createFileRoute } from "@tanstack/react-router";
import {
  Hero,
  SpotifySection,
  ListenSection,
  ReleasesSection,
  LatestReleasesSection,
  AboutSection,
  MerchSection,
  SocialSection,
} from "@/components/artist/sections";
import { artistHead } from "@/lib/artist";
export const Route = createFileRoute("/")({
  head: () =>
    artistHead(
      "Renzo Vibes | Feel the rhythm. Live the vibe.",
      "The digital home of Renzo Vibes. Italian Dancehall artist, international award winner. New music, visuals, and worldwide vibes.",
    ),
  component: Index,
});
function Index() {
  return (
    <main>
      <Hero />
      <div className="culture-strip">
        <span>ROOTED IN CULTURE</span>
        <span>✳</span>
        <span>DRIVEN BY RHYTHM</span>
        <span>✳</span>
        <span>CONNECTED BY MUSIC</span>
        <span>✳</span>
        <span>RENZO VIBES WORLDWIDE</span>
      </div>
      <SpotifySection />
      <ListenSection />
      <ReleasesSection />
      <LatestReleasesSection />
      <AboutSection />
      <MerchSection />
      <SocialSection />
    </main>
  );
}
