import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { ShopError } from "./orders.mjs";
import { adminPage } from "./admin.mjs";
import { createAdminAccessVerifier } from "./access.mjs";
import { readAnalyticsCookies } from "./analytics.mjs";

const api = "/api/merch";
const admin = "/merch-admin";
const digest = (text) => createHash("sha256").update(text).digest();

async function readBody(req, type) {
  if (req.headers["content-type"]?.split(";")[0] !== type)
    throw new ShopError(415, "Unsupported content type.");
  const chunks = [];
  let size = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > 8192) throw new ShopError(413, "Request is too large.");
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  if (type === "application/x-www-form-urlencoded")
    return Object.fromEntries(new URLSearchParams(body));
  try {
    return JSON.parse(body);
  } catch {
    throw new ShopError(400, "Invalid JSON.");
  }
}

function authorize(req, hash) {
  const credentials = req.headers.authorization?.match(/^Basic ([A-Za-z0-9+/=]{1,256})$/i)?.[1];
  const match =
    credentials &&
    Buffer.from(credentials, "base64")
      .toString("utf8")
      .match(/^renzo:([a-f0-9]{64})$/);
  return !!match && timingSafeEqual(digest(match[1]), Buffer.from(hash, "hex"));
}

export function createMerchHandler(
  orders,
  { origin, adminHash, adminAccess, webhookToken, allowNew, config, simulator },
) {
  const host = new URL(origin).host;
  const verifyAccess = adminAccess && createAdminAccessVerifier(adminAccess);
  const callbackRoot = api + "/notify/";
  const callbackUrl = origin + callbackRoot + webhookToken;
  const minuteLimits = new Map();
  let minute = 0;

  function limit(key, max) {
    const current = Math.floor(Date.now() / 60_000);
    if (current !== minute) {
      minute = current;
      minuteLimits.clear();
    }
    const count = (minuteLimits.get(key) ?? 0) + 1;
    minuteLimits.set(key, count);
    if (count > max) throw new ShopError(429, "Too many requests. Please try again in a minute.");
  }
  function ensureNotLimited(key, max) {
    if (minute === Math.floor(Date.now() / 60_000) && (minuteLimits.get(key) ?? 0) >= max)
      throw new ShopError(429, "Too many requests. Please try again in a minute.");
  }
  return async (req, res) => {
    const reply = (status, data, headers = {}) => {
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
      res.end(
        data === undefined ? undefined : typeof data === "string" ? data : JSON.stringify(data),
      );
    };
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    );
    let adminRequest = false;
    try {
      if (req.headers.host !== host) throw new ShopError(404, "Not found.");
      const url = new URL(req.url, origin);
      const path = url.pathname;
      adminRequest = path === admin || path.startsWith(admin + "/");
      if (adminRequest) {
        if (verifyAccess && !(await verifyAccess(req.headers["cf-access-jwt-assertion"]))) {
          throw new ShopError(403, "Cloudflare Access authentication required.");
        }
        const remote = req.headers["x-real-ip"];
        const remoteKey =
          typeof remote === "string" && isIP(remote) ? "admin-auth:" + remote : null;
        ensureNotLimited("admin-auth", 120);
        if (remoteKey) ensureNotLimited(remoteKey, 12);
        if (!authorize(req, adminHash)) {
          limit("admin-auth", 120);
          if (remoteKey) limit(remoteKey, 12);
          return reply(
            401,
            { error: "Authentication required." },
            { "WWW-Authenticate": 'Basic realm="Renzo Vibes Merch", charset="UTF-8"' },
          );
        }
        if (req.method === "GET" && path === admin) {
          const rawPage = url.searchParams.get("page") ?? "0";
          if (!/^\d{1,6}$/.test(rawPage)) throw new ShopError(400, "Invalid page.");
          const page = Number(rawPage);
          const status = url.searchParams.get("status") ?? "";
          const reference = (url.searchParams.get("reference") ?? "").trim();
          if (
            !["", "pending", "paid", "expired"].includes(status) ||
            !/^[a-f0-9-]{0,36}$/.test(reference)
          )
            throw new ShopError(400, "Invalid order filter.");
          return reply(
            200,
            adminPage(
              orders.admin(page, status, reference),
              page,
              status,
              reference,
              orders.analytics?.summary(),
            ),
            {
              "Content-Type": "text/html; charset=utf-8",
            },
          );
        }
        if (req.method === "POST" && [admin + "/stock", admin + "/ship"].includes(path)) {
          if (req.headers.origin !== origin) throw new ShopError(403, "Origin is not allowed.");
          const body = await readBody(req, "application/x-www-form-urlencoded");
          if (path.endsWith("/stock"))
            orders.adjust(body.id, Number(body.delta), body.reason, body.mutation);
          else orders.ship(body.id, body.tracking, body.state ?? "shipped", body.refundRef);
          return reply(303, undefined, { Location: admin });
        }
      }

      if (req.method === "POST" && path.startsWith(callbackRoot)) {
        const supplied = path.slice(callbackRoot.length);
        if (
          !/^[a-f0-9]{64}$/.test(supplied) ||
          !timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(webhookToken, "hex"))
        ) {
          throw new ShopError(404, "Not found.");
        }
        const event = await readBody(req, "application/json");
        if (
          event?.event_type === "CHECKOUT_STATUS_CHANGED" &&
          typeof event.id === "string" &&
          /^[A-Za-z0-9-]{1,100}$/.test(event.id)
        ) {
          await orders.verifyNotification(event.id);
        }
        return reply(204);
      }
      if (req.headers.origin && req.headers.origin !== origin)
        throw new ShopError(403, "Origin is not allowed.");
      if (req.method === "POST" && path === "/api/site-analytics" && orders.analytics) {
        if (req.headers.origin !== origin || req.headers["sec-fetch-site"] !== "same-origin") {
          throw new ShopError(403, "Origin is not allowed.");
        }
        limit("analytics", 1200);
        const event = await readBody(req, "application/json");
        const cookie = readAnalyticsCookies(req.headers.cookie, webhookToken);
        if (event?.type === "withdraw") {
          return reply(204, undefined, { "Set-Cookie": cookie.clear });
        }
        if (event?.type !== "view") throw new ShopError(400, "Unknown site event.");
        if (!cookie.allowed) return reply(204);
        if (cookie.id) {
          limit("analytics:" + cookie.id, 60);
          orders.analytics.view(cookie.id);
          return reply(204);
        }
        const { visitor, cookie: value } = cookie.create();
        orders.analytics.view(visitor);
        return reply(204, undefined, { "Set-Cookie": value });
      }
      const token = req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
      if (req.method === "GET" && path === api + "/catalog") {
        return reply(200, {
          ...orders.catalog(),
          allowNew,
          simulated: !!simulator,
          sandbox: config?.mode === "sandbox",
        });
      }
      if (req.method === "GET" && path === api + "/order")
        return reply(200, await orders.status(token));
      if (req.method === "POST" && path.startsWith(api + "/")) {
        if (req.headers.origin !== origin) throw new ShopError(403, "Origin is not allowed.");
        if (path === api + "/order") {
          limit("checkout", 60);
          const ip = req.headers["x-real-ip"];
          if (typeof ip === "string" && isIP(ip)) limit("checkout:" + ip, 6);
          return reply(
            200,
            await orders.start(await readBody(req, "application/json"), token, origin + "/merch", {
              allowNew,
              webhookUrl: callbackUrl,
            }),
          );
        }
        if (path === api + "/cancel") return reply(200, await orders.cancel(token));
        if (path === api + "/simulate" && simulator) {
          const { status } = await readBody(req, "application/json");
          if (!["PAID", "FAILED"].includes(status)) throw new ShopError(400, "Invalid simulation.");
          const order = await orders.status(token);
          simulator.setStatus(order.reference, status);
          await orders.verifyNotification((await simulator.get({ id: order.reference })).id);
          return reply(200, await orders.status(token));
        }
      }
      throw new ShopError(404, "Endpoint not found.");
    } catch (error) {
      if (error instanceof ShopError) return reply(error.status, { error: error.message });
      console.warn(
        adminRequest ? "Merch administration request failed." : "Merch payment request failed.",
      );
      return reply(502, {
        error: "This request could not be verified. Check the order status again.",
      });
    }
  };
}
