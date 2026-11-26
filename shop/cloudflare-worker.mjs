const shop = "https://www.renzovibes.com";
const admin = "/merch-admin";
const admins = ["renzovibez@gmail.com", "simonmetlicovec@gmail.com"];

const stop = (status, message) =>
  new Response(message, { status, headers: { "Cache-Control": "no-store" } });

export default {
  async fetch(request, _env, ctx) {
    if (!ctx.access) return stop(403, "Access authentication required.");
    const identity = await ctx.access.getIdentity();
    if (!admins.includes(identity?.email?.toLowerCase())) return stop(403, "Access denied.");

    const url = new URL(request.url);
    const method = request.method;
    if (url.pathname === "/" && method === "GET") {
      return Response.redirect(url.origin + admin, 303);
    }
    const read = method === "GET" && url.pathname === admin;
    const write = method === "POST" && [admin + "/ship", admin + "/stock"].includes(url.pathname);
    if (!read && !write) return stop(404, "Not found.");
    if (write && request.headers.get("Origin") !== url.origin) {
      return stop(403, "Origin is not allowed.");
    }

    const assertion =
      request.headers.get("Cf-Access-Jwt-Assertion") ??
      request.headers.get("Cookie")?.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1];
    if (!assertion) return stop(403, "Access assertion unavailable.");
    const headers = new Headers({ "Cf-Access-Jwt-Assertion": assertion });
    const auth = request.headers.get("Authorization");
    if (auth) headers.set("Authorization", auth);
    if (write) {
      headers.set("Origin", shop);
      headers.set("Content-Type", request.headers.get("Content-Type") ?? "");
    }
    const originResponse = await fetch(shop + url.pathname + url.search, {
      method,
      headers,
      body: write ? request.body : undefined,
      redirect: "manual",
    });
    const response = new Response(originResponse.body, originResponse);
    response.headers.set("Cache-Control", "no-store");
    return response;
  },
};
