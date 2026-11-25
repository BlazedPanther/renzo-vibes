import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createSimulator, openOrders, ShopError } from "./orders.mjs";
import { createHandler } from "./sandbox.mjs";

const token = () => randomBytes(32).toString("hex");
const body = {
  items: [{ id: "hoodie-s", quantity: 1, price: 1 }],
  address: {
    name: "Demo Buyer",
    street: "Teststrasse 1",
    postcode: "8000",
    city: "Zürich",
    country: "CH",
    email: "buyer@example.test",
  },
  total: 1,
};

function shop(t) {
  const folder = mkdtempSync(join(tmpdir(), "renzo-sandbox-"));
  const filename = join(folder, "shop.sqlite");
  let time = Date.now();
  const now = () => time;
  const provider = createSimulator(now);
  let creates = 0;
  const counted = {
    ...provider,
    create(order) {
      creates++;
      return provider.create(order);
    },
  };
  const a = openOrders({ filename, provider: counted, now });
  const b = openOrders({ filename, provider: counted, now });
  t.after(() => {
    a.close();
    b.close();
    rmSync(folder, { recursive: true, force: true });
  });
  return {
    a,
    b,
    provider,
    creates: () => creates,
    expire: () => {
      time += 31 * 60_000;
    },
  };
}

test("catalog, CHF totals, quantities, shipping, and idempotent reservation", async (t) => {
  const { a, b, creates } = shop(t);
  assert.equal(a.catalog().product.price, 4500);
  assert.equal(a.catalog().shipping, 800);
  const checkout = {
    ...body,
    items: [...body.items, { id: "hoodie-m", quantity: 2 }],
  };
  const id = token();
  const order = await a.start(checkout, id);
  assert.equal(order.total, 14_300);
  assert.deepEqual(await b.start(checkout, id), order);
  assert.equal(creates(), 1);
  assert.deepEqual(
    b.catalog().product.variants.map(({ stock }) => stock),
    [0, 2],
  );
  await assert.rejects(b.start(body, id), { status: 409 });
});

test("last unit can only be reserved by one customer across DB connections", async (t) => {
  const { a, b, creates } = shop(t);
  const results = await Promise.allSettled([a.start(body, token()), b.start(body, token())]);
  assert.equal(results.filter(({ status }) => status === "fulfilled").length, 1);
  assert.equal(results.find(({ status }) => status === "rejected").reason.status, 409);
  assert.equal(creates(), 1);
  assert.equal(a.catalog().product.variants[0].stock, 0);
});

test("a failed attempt remains unpaid; expiry reconciles once and restores stock", async (t) => {
  const { a, b, provider, expire } = shop(t);
  const key = token();
  const order = await a.start(body, key);
  provider.setStatus(order.reference, "FAILED");
  assert.equal((await a.status(key)).status, "pending");
  assert.equal(a.catalog().product.variants[0].stock, 0);
  expire();
  await Promise.all([a.reconcile(), b.reconcile()]);
  assert.equal((await b.status(key)).status, "expired");
  assert.equal(a.catalog().product.variants[0].stock, 1);
});

test("duplicate verified payment events never decrement stock twice", async (t) => {
  const { a, b, provider, expire } = shop(t);
  const key = token();
  const order = await a.start(body, key);
  const { id } = await provider.get({ id: order.reference });
  const server = createServer(createHandler(a));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const notify = async (event_type) => {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/merch-sandbox/webhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, event_type, status: "PAID" }),
      },
    );
    assert.equal(response.status, 204);
    assert.equal(await response.text(), "");
  };
  await notify("CHECKOUT_STATUS_CHANGED");
  assert.equal((await a.status(key)).status, "pending");
  provider.setStatus(order.reference, "PAID");
  await notify("UNKNOWN");
  await Promise.all([notify("CHECKOUT_STATUS_CHANGED"), notify("CHECKOUT_STATUS_CHANGED")]);
  expire();
  await a.reconcile();
  assert.equal((await b.status(key)).status, "paid");
  assert.equal(a.catalog().product.variants[0].stock, 0);
});

test("checkout error and uncertain provider create are recovered by reference without another charge", async (t) => {
  const provider = createSimulator();
  let calls = 0;
  const orders = openOrders({
    filename: ":memory:",
    provider: {
      ...provider,
      async create(order) {
        calls++;
        await provider.create(order);
        throw new Error("Timed out after receipt");
      },
    },
  });
  t.after(() => orders.close());
  const key = token();
  await assert.rejects(orders.start(body, key), /Timed out/);
  assert.equal((await orders.start(body, key)).status, "pending");
  assert.equal(calls, 1);
});

test("HTTP API protects customer data and rejects non-Swiss, non-test and cross-origin inputs", async (t) => {
  const { a } = shop(t);
  const server = createServer(createHandler(a));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/merch-sandbox/order`;
  const key = token();
  const headers = { Authorization: `Bearer ${key}` };
  const post = { ...headers, "Content-Type": "application/json", Origin: "http://localhost:5173" };
  assert.equal((await fetch(url, { headers })).status, 404);
  assert.equal(
    (
      await fetch(url, {
        method: "POST",
        headers: { ...post, Origin: "https://other.invalid" },
        body: JSON.stringify(body),
      })
    ).status,
    403,
  );
  const invalid = (address) => a.start({ ...body, address: { ...body.address, ...address } }, key);
  for (const address of [{ country: "DE" }, { email: "private@example.com" }, { postcode: 8000 }]) {
    await assert.rejects(
      invalid(address),
      (error) => error instanceof ShopError && error.status === 400,
    );
  }
  const checkout = await fetch(url, { method: "POST", headers: post, body: JSON.stringify(body) });
  assert.equal(checkout.status, 200);
  assert.match(checkout.headers.get("cache-control"), /no-store/);
  assert.doesNotMatch(await checkout.text(), /Demo Buyer|example\.test|Teststrasse/);
  assert.equal((await fetch(url)).status, 404);
});
