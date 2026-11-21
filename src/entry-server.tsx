import { renderToString } from "react-dom/server";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import { collectHead } from "./lib/head";

/** Rendert eine Route zu statischem HTML (Build-Zeit, siehe scripts/prerender.ts). */
export async function render(url: string) {
  const router = getRouter({ url });
  await router.load();
  const html = renderToString(<RouterProvider router={router} />);
  const state = router.state;
  const notFound = state.matches.some((m) => m.status === "notFound");
  const head = collectHead(
    state.matches as never,
    state.location.pathname.replace(import.meta.env.BASE_URL.replace(/\/$/, ""), "") || "/",
  );
  return { html, head, notFound };
}
