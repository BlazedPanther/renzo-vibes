import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backup, DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { openOrders, createSimulator } from "./orders.mjs";
import { createMerchHandler } from "./http.mjs";
import { createMailer } from "./mail.mjs";
import { createSumUpProvider } from "./sumup.mjs";

const token = () => randomBytes(32).toString("hex");
const sku = "purple-hoodie:M";
const config = {
  mode: "live",
  products: [
    {
      id: "purple-hoodie",
      name: "Purple Hoodie",
      price: 6500,
      front: "front.webp",
      back: "back.webp",
      variants: [{ id: sku, size: "M" }],
    },
  ],
  shipping: 900,
  legal: { payment: "Test fixture" },
};
const address = {
  name: "<Demo Buyer>",
  street: "Teststrasse 1",
  postcode: "8000",
  city: "Zürich",
  country: "CH",
  email: "buyer@example.test",
};
const payload = (orders) => ({
  address,
  items: [{ id: sku, quantity: 1 }],
  total: 7400,
  version: orders.catalog().version,
  accepted: true,
});

async function fixture(t, { allowNew = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "renzo-merch-"));
  const filename = join(dir, "shop.sqlite");
  let time = Date.now();
  const now = () => time;
  const simulator = createSimulator(now);
  const orders = openOrders({ filename, provider: simulator, config, now });
  const adminPassword = token();
  const adminHash = createHash("sha256").update(adminPassword).digest("hex");
  const auth = "Basic " + Buffer.from("renzo:" + adminPassword).toString("base64");
  const webhookToken = token();
  const server = createServer((req, res) => handler(req, res));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const handler = createMerchHandler(orders, { origin, adminHash, webhookToken, allowNew });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    orders.close();
    rmSync(dir, { force: true, recursive: true });
  });
  async function call(path, { key, admin, json, form, source = origin } = {}) {
    return fetch(origin + path, {
      method: json || form ? "POST" : "GET",
      redirect: "manual",
      headers: {
        ...(key && { Authorization: "Bearer " + key }),
        ...(admin && { Authorization: auth }),
        ...((json || form) && {
          Origin: source,
          "Content-Type": json ? "application/json" : "application/x-www-form-urlencoded",
        }),
      },
      body: json ? JSON.stringify(json) : form && new URLSearchParams(form),
    });
  }
  return {
    orders,
    simulator,
    call,
    webhookToken,
    filename,
    dir,
    tick: (ms) => {
      time += ms;
    },
  };
}

test("real shop HTTP path verifies payment, safeguards address and ships a paid order once", async (t) => {
  const { orders, simulator, call, webhookToken } = await fixture(t);
  assert.equal(orders.catalog().products[0].variants[0].stock, 0);
  const unauth = await call("/merch-admin");
  assert.equal(unauth.status, 401);
  assert.match(unauth.headers.get("www-authenticate"), /^Basic /);
  const stock = { id: sku, delta: "1", reason: "received", mutation: randomUUID() };
  assert.equal(
    (
      await call("/merch-admin/stock", {
        admin: true,
        form: stock,
        source: "https://other.invalid",
      })
    ).status,
    403,
  );
  assert.equal((await call("/merch-admin/stock", { admin: true, form: stock })).status, 303);
  assert.equal((await call("/merch-admin/stock", { admin: true, form: stock })).status, 303);
  assert.equal(orders.admin().stock[0].stock, 1);

  for (const invalid of [{ total: 1 }, { version: "stale" }, { accepted: false }]) {
    assert.equal(
      (await call("/api/merch/order", { key: token(), json: { ...payload(orders), ...invalid } }))
        .status,
      409,
    );
  }
  assert.equal(
    (
      await call("/api/merch/order", {
        key: token(),
        json: { ...payload(orders), address: { ...address, postcode: "ABC" } },
      })
    ).status,
    400,
  );

  const requests = [token(), token()];
  const results = await Promise.all(
    requests.map((key) => call("/api/merch/order", { key, json: payload(orders) })),
  );
  assert.deepEqual(results.map(({ status }) => status).sort(), [200, 409]);
  const winner = results.findIndex(({ status }) => status === 200);
  const key = requests[winner];
  const order = await results[winner].json();
  assert.equal(order.total, 7400);
  assert.equal(order.address, undefined);
  assert.equal((await call("/api/merch/order", { key: token() })).status, 404);
  assert.equal(
    (await call("/merch-admin/ship", { admin: true, form: { id: order.reference } })).status,
    409,
  );
  const provider = await simulator.get({ id: order.reference });
  const event = { event_type: "CHECKOUT_STATUS_CHANGED", id: provider.id, status: "PAID" };
  const notify = () => call("/api/merch/notify/" + webhookToken, { json: event });
  assert.equal((await call("/api/merch/notify/" + token(), { json: event })).status, 404);
  assert.equal((await notify()).status, 204);
  assert.equal((await (await call("/api/merch/order", { key })).json()).status, "pending");
  simulator.setStatus(order.reference, "PAID");
  assert.deepEqual(
    (await Promise.all([notify(), notify()])).map(({ status }) => status),
    [204, 204],
  );
  assert.equal((await (await call("/api/merch/order", { key })).json()).status, "paid");
  assert.equal(orders.admin().stock[0].stock, 0);

  const ship = () => call("/merch-admin/ship", { admin: true, form: { id: order.reference } });
  assert.equal((await ship()).status, 303);
  const shipped = orders.admin().orders[0].shipped;
  assert.equal((await ship()).status, 303);
  assert.equal(orders.admin().orders[0].shipped, shipped);
  const page = await call("/merch-admin", { admin: true });
  assert.match(page.headers.get("cache-control"), /no-store/);
  const html = await page.text();
  assert.match(html, /&lt;Demo Buyer&gt;/);
  assert.match(html, /Teststrasse 1/);
  assert.match(html, /8000 Zürich/);
  assert.match(html, /Shipping: Sent/);
  const deliveries = [];
  await orders.sendMail(async (mail) => {
    deliveries.push(mail.kind);
  });
  await orders.sendMail(async () => assert.fail("already delivered"));
  assert.deepEqual(deliveries, ["received", "paid"]);
});

test("failed checkout holds stock, confirmed cancellation and expiry release it and clear address", async (t) => {
  const { orders, simulator, call, tick } = await fixture(t);
  orders.adjust(sku, 1, "received");
  const key = token();
  const started = await orders.start(payload(orders), key);
  simulator.setStatus(started.reference, "FAILED");
  await orders.reconcile();
  assert.equal((await orders.status(key)).payment, "FAILED");
  assert.equal(orders.admin().stock[0].stock, 0);
  assert.throws(() => orders.adjust(sku, -1, "external-sale"), { status: 409 });
  assert.equal(
    (await (await call("/api/merch/cancel", { key, json: {} })).json()).status,
    "expired",
  );
  assert.equal((await orders.cancel(key)).status, "expired");
  assert.equal(orders.admin().stock[0].stock, 1);
  assert.equal(orders.admin().orders[0].address, null);
  const expiring = token();
  await orders.start(payload(orders), expiring);
  tick(31 * 60_000);
  await orders.reconcile();
  assert.equal((await orders.status(expiring)).status, "expired");
  assert.equal(orders.admin().stock[0].stock, 1);
  orders.adjust(sku, -1, "external-sale");
  assert.equal(orders.admin().stock[0].stock, 0);
});

test("closed checkout refuses new orders and the database restores from a consistent online snapshot", async (t) => {
  const { orders, call, dir, filename } = await fixture(t, { allowNew: false });
  orders.adjust(sku, 1, "received");
  assert.equal(
    (await call("/api/merch/order", { key: token(), json: payload(orders) })).status,
    503,
  );
  const source = new DatabaseSync(filename);
  const snapshot = join(dir, "snapshot.sqlite");
  try {
    await backup(source, snapshot);
  } finally {
    source.close();
  }
  const restored = openOrders({ filename: snapshot, provider: createSimulator(), config });
  try {
    assert.equal(restored.admin().stock[0].stock, 1);
  } finally {
    restored.close();
  }
  assert.throws(
    () =>
      openOrders({ filename, provider: createSimulator(), config: { ...config, mode: "sandbox" } }),
    /another operating mode/,
  );
});

test("Swiss SumUp account preflight and documented Hosted Checkout and deactivate requests", async () => {
  const merchant = "M1234567";
  const order = { id: randomUUID(), total: 7400, expires: Date.now() + 1800_000 };
  const response = {
    id: "sumup-checkout",
    checkout_reference: order.id,
    currency: "CHF",
    amount: 74,
    merchant_code: merchant,
    status: "PENDING",
  };
  const profile = {
    merchant_code: merchant,
    country: "CH",
    default_currency: "CHF",
    sandbox: false,
  };
  const calls = [];
  const provider = await createSumUpProvider({
    key: "placeholder",
    merchant,
    mode: "live",
    fetcher: async (url, { method, body }) => {
      calls.push([url, method, body && JSON.parse(body)]);
      if (url.includes("/merchants/")) return Response.json(profile);
      if (url.includes("readiness-check")) return Response.json([]);
      if (method === "DELETE") return Response.json({ ...response, status: "EXPIRED" });
      return Response.json({
        ...response,
        hosted_checkout_url: "https://checkout.sumup.com/pay/sumup-hosted",
      });
    },
  });
  const result = await provider.create(
    order,
    "https://www.renzovibes.com/merch",
    "https://www.renzovibes.com/api/merch/notify/test",
  );
  assert.equal(calls[2][2].return_url, "https://www.renzovibes.com/api/merch/notify/test");
  assert.equal(calls[2][2].redirect_url, "https://www.renzovibes.com/merch");
  assert.equal((await provider.cancel({ ...order, providerId: result.id })).status, "EXPIRED");
  assert.equal(calls[3][1], "DELETE");
  await assert.rejects(
    createSumUpProvider({
      key: "placeholder",
      merchant,
      mode: "live",
      fetcher: async () => Response.json({ ...profile, country: "DE" }),
    }),
    /Switzerland/,
  );
});

test("transactional confirmation has a stable provider idempotency key and order summary", async () => {
  const calls = [];
  const mail = createMailer({
    key: "placeholder",
    from: "orders@example.test",
    replyTo: "help@example.test",
    fetcher: async (url, options) => {
      calls.push([url, options]);
      return Response.json({ id: "delivery-1" });
    },
  });
  const message = {
    orderId: "order-1",
    kind: "paid",
    total: 7400,
    shipping: 900,
    address,
    items: [{ name: "Purple Hoodie", size: "M", quantity: 1, price: 6500 }],
  };
  await mail(message);
  await mail(message);
  assert.equal(calls[0][0], "https://api.resend.com/emails");
  assert.equal(calls[0][1].headers["Idempotency-Key"], calls[1][1].headers["Idempotency-Key"]);
  const sent = JSON.parse(calls[0][1].body);
  assert.deepEqual(sent.to, [address.email]);
  assert.match(sent.text, /Total: CHF 74.00/);
});
test("documented provider rejection releases the reservation and leaves no shipping data", async (t) => {
  const provider = {
    async create() {
      throw Object.assign(new Error("Checkout rejected"), { checkoutRejected: true });
    },
  };
  const orders = openOrders({ filename: ":memory:", provider, config });
  t.after(() => orders.close());
  orders.adjust(sku, 1, "received");
  const key = token();
  const order = await orders.start(payload(orders), key);
  assert.equal(order.status, "expired");
  assert.equal(order.payment, "REJECTED");
  assert.equal(orders.admin().stock[0].stock, 1);
  assert.equal(orders.admin().orders[0].address, null);
  assert.deepEqual(await orders.start(payload(orders), key), order);
});

test("retention removes shipped addresses only after outstanding confirmations are delivered", async (t) => {
  const { orders, simulator, tick } = await fixture(t);
  orders.adjust(sku, 1, "received");
  const order = await orders.start(payload(orders), token());
  simulator.setStatus(order.reference, "PAID");
  await orders.reconcile();
  orders.ship(order.reference);
  tick(2 * 24 * 60 * 60_000);
  orders.pruneAddresses(1);
  assert.deepEqual(orders.admin().orders[0].address, address);
  await orders.sendMail(async () => {});
  orders.pruneAddresses(1);
  assert.equal(orders.admin().orders[0].address, null);
  assert.equal(orders.admin().orders[0].total, 7400);
});
