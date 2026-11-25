import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { createSimulator, openOrders, ShopError } from "./orders.mjs";
import { createSumUpSandboxProvider } from "./sumup.mjs";

const frontend = "http://localhost:5173";
const originNames = new Set([frontend, "http://127.0.0.1:5173"]);
const basePath = "/api/merch-sandbox";

async function readBody(req) {
  if (req.headers["content-type"] !== "application/json")
    throw new ShopError(415, "JSON required.");
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8192) throw new ShopError(413, "Request is too large.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ShopError(400, "Invalid JSON.");
  }
}

export function createHandler(orders, simulator) {
  return async (req, res) => {
    const reply = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(data));
    };
    try {
      if (
        req.headers.host !== `127.0.0.1:${req.socket.localPort}` ||
        (req.headers.origin && !originNames.has(req.headers.origin))
      ) {
        throw new ShopError(403, "Origin is not allowed.");
      }
      const path = req.url?.slice(basePath.length);
      const token = req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
      if (req.url?.startsWith(basePath + "/") && req.method === "GET") {
        if (path === "/catalog") return reply(200, { ...orders.catalog(), simulated: !!simulator });
        if (path === "/order") return reply(200, await orders.status(token));
      }
      if (req.url?.startsWith(basePath + "/") && req.method === "POST") {
        if (path === "/webhook") {
          if (req.headers.origin) throw new ShopError(403, "Origin is not allowed.");
          const event = await readBody(req);
          if (event?.event_type === "CHECKOUT_STATUS_CHANGED") {
            if (typeof event.id !== "string" || !/^[a-zA-Z0-9-]{1,100}$/.test(event.id)) {
              throw new ShopError(400, "Invalid checkout ID.");
            }
            await orders.verifyNotification(event.id);
          }
          res.writeHead(204);
          return res.end();
        }
        if (!originNames.has(req.headers.origin))
          throw new ShopError(403, "Origin is not allowed.");
        const body = await readBody(req);
        if (path === "/order") {
          return reply(200, await orders.start(body, token, req.headers.origin + "/merch"));
        }
        if (path === "/simulate" && simulator) {
          if (!["PAID", "FAILED"].includes(body?.status))
            throw new ShopError(400, "Invalid status.");
          const { reference } = await orders.status(token);
          simulator.setStatus(reference, body.status);
          return reply(200, await orders.status(token));
        }
      }
      throw new ShopError(404, "Endpoint not found.");
    } catch (error) {
      if (error instanceof ShopError) return reply(error.status, { error: error.message });
      console.warn("Sandbox request could not be completed.");
      return reply(502, { error: "The payment status is unavailable. Check this order again." });
    }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { SUMUP_SANDBOX_KEY: key, SUMUP_SANDBOX_MERCHANT: merchant } = process.env;
  const simulator = key || merchant ? null : createSimulator();
  const provider = simulator ?? (await createSumUpSandboxProvider({ key, merchant }));
  const orders = openOrders({
    filename: simulator ? ":memory:" : "merch-sandbox.sqlite",
    provider,
  });
  let reconciling = false;
  setInterval(async () => {
    if (reconciling) return;
    reconciling = true;
    try {
      await orders.reconcile();
    } catch {
      console.warn("Sandbox reconciliation could not be completed.");
    } finally {
      reconciling = false;
    }
  }, 30_000).unref();
  createServer(createHandler(orders, simulator)).listen(8787, "127.0.0.1", () => {
    console.info(simulator ? "Local payment simulator ready." : "Verified SumUp sandbox ready.");
  });
}
