import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";

describe("Deep-Link-Routing", () => {
  const router = createRouter({ routeTree });
  it.each([
    "/",
    "/music",
    "/visuals",
    "/about",
    "/merch",
    "/connect",
    "/links",
    "/privacy",
    "/datenschutz",
  ])("matcht %s auf eine Seite statt Not-Found", (p) => {
    expect(router.matchRoutes(p).at(-1)?.routeId).not.toBe(rootRouteId);
  });
  it("unbekannte Pfade fallen auf Not-Found", () => {
    expect(router.matchRoutes("/gibtsnicht").at(-1)?.routeId).toBe(rootRouteId);
  });
});
