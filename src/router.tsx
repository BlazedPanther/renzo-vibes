import { createRouter, createMemoryHistory } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

const basepath = import.meta.env.BASE_URL.replace(/\/+$/, "") || "/";

/** Browser-Router (default) bzw. Memory-History fürs Prerendering. */
export const getRouter = (opts?: { url?: string }) => {
  const router = createRouter({
    routeTree,
    basepath,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    ...(opts?.url ? { history: createMemoryHistory({ initialEntries: [opts.url] }) } : {}),
  });
  // Server (Prerender) und Client müssen denselben Match-Baum ohne Suspense-Grenze rendern,
  // sonst schlägt die Hydration fehl. TanStack Start setzt dieses Flag sonst selbst.
  router.ssr = { manifest: undefined };
  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
