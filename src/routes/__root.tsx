import { Outlet, createRootRoute, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArtistHeader, ArtistFooter } from "@/components/artist/shell";
import { collectHead, applyHeadToDocument } from "@/lib/head";
import { NotFoundComponent } from "@/components/not-found";
import { siteConfig } from "@/config/site.config";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { title: "Renzo Vibes" },
      {
        name: "description",
        content: "Feel the rhythm. Live the vibe. The digital home of Renzo Vibes.",
      },
      { name: "author", content: siteConfig.artistName },
      { property: "og:title", content: "Renzo Vibes" },
      {
        property: "og:description",
        content: "Italian Dancehall Artist | International Award Winner",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  const isLinks = useRouterState({ select: (s) => s.matches.some((m) => m.routeId === "/links") });
  const headInput = useRouterState({
    select: (s) => ({
      matches: s.matches.map((m) => ({ meta: m.meta, pathname: m.pathname })),
      pathname: s.location.pathname,
    }),
  });
  useEffect(() => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    applyHeadToDocument(
      collectHead(headInput.matches, headInput.pathname.replace(base, "") || "/"),
    );
  }, [headInput]);
  return (
    <>
      {!isLinks && <ArtistHeader />}
      <Outlet />
      {!isLinks && <ArtistFooter />}
    </>
  );
}
