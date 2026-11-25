import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backup, DatabaseSync } from "node:sqlite";
import products from "./products.json" with { type: "json" };
import { blackFridayStart, blackFridayEnd } from "./campaign.mjs";
import { createSimulator, openOrders } from "./orders.mjs";
import { readShopConfig } from "./config.mjs";

const ids = [
  "rvp-wintercap",
  "powpow-wintercap",
  "zumba-tshirt",
  "rr-classic-tshirt",
  "purple-crew-hoodie",
];
const amounts = {
  regular: [2000, 2500, 2500, 2500, 4950],
  sale: [1800, 2295, 2295, 2295, 3895],
};
const key = () => randomBytes(32).toString("hex");
const address = {
  name: "Sandbox Customer",
  street: "Teststrasse 5",
  postcode: "8000",
  city: "Zürich",
  country: "CH",
  email: "customer@example.test",
};
const config = {
  mode: "sandbox",
  preorder: true,
  stockMode: "unlimited-test",
  shipping: 700,
  products: ids.map((id, i) => ({
    id,
    ...products[id],
    price: products[id].regularPrice,
    variants: (i < 2 ? ["TEST"] : ["S", "M", "L"]).map((size) => ({ id: `${id}:${size}`, size })),
  })),
  legal: {},
};

const checkout = (catalog) => ({
  items: catalog.products.map((p) => ({ id: p.variants[0].id, quantity: 2 })),
  total: catalog.products.reduce((sum, p) => sum + p.price * 2, catalog.shipping),
  version: catalog.version,
  address,
  accepted: true,
});

test("Zurich campaign prices cross both boundaries, with no comparison price exposed", (t) => {
  let time = blackFridayStart - 1;
  const orders = openOrders({
    filename: ":memory:",
    provider: createSimulator(),
    config,
    now: () => time,
  });
  t.after(() => orders.close());
  for (const [instant, active] of [
    [blackFridayStart - 1, false],
    [blackFridayStart, true],
    [blackFridayEnd - 1, true],
    [blackFridayEnd, false],
  ]) {
    time = instant;
    const catalog = orders.catalog();
    assert.deepEqual(
      catalog.products.map((p) => p.price),
      active ? amounts.sale : amounts.regular,
    );
    assert.equal(Boolean(catalog.gift), active);
    assert(catalog.products.every((p) => !("regularPrice" in p)));
    assert.equal(catalog.shipping, 700);
  }
});

test("campaign rejects a stale price, preserves an existing quote, one gift and one CHF 7 shipment", async (t) => {
  let time = blackFridayEnd - 100;
  const now = () => time;
  const provider = createSimulator(now);
  const orders = openOrders({
    filename: ":memory:",
    provider,
    config,
    now,
    sendConfirmations: true,
  });
  t.after(() => orders.close());
  const submitted = checkout(orders.catalog());
  assert.equal(submitted.total, 25_860);
  const token = key();
  const started = await orders.start(submitted, token);
  time = blackFridayEnd;
  await assert.rejects(orders.start(submitted, key()), { status: 409 });
  assert.deepEqual(await orders.start(submitted, token), started);
  assert.equal(started.shipping, 700);
  assert.equal(started.items.length, 5);
  assert.equal(started.gift.name, "Free Renzo Vibes autograph card");
  assert.equal(started.fulfillment, "awaiting_payment");
  provider.setStatus(started.reference, "PAID");
  await orders.reconcile();
  assert.equal((await orders.status(token)).fulfillment, "paid_preorder");
  orders.ship(started.reference, "", "in_preparation");
  orders.ship(started.reference, "", "delayed");
  orders.ship(started.reference, "CH 12345678", "shipped");
  orders.ship(started.reference, "CH 12345678", "shipped");
  assert.throws(() => orders.ship(started.reference, "", "refunded"), { status: 400 });
  orders.ship(started.reference, "", "refunded", "sumup-ref-123");
  const row = orders.admin(0, "paid", started.reference).orders[0];
  assert.equal(row.tracking, "CH 12345678");
  assert.equal(row.refundRef, "sumup-ref-123");
  assert.equal(row.events.length, 4);
  const mailed = [];
  await orders.sendMail(async (mail) => mailed.push(mail));
  assert.equal(mailed.length, 6);
  assert(mailed.every((mail) => mail.gift === 1 && mail.shipping === 700));
  assert.equal(mailed.find((mail) => mail.kind === "shipped").tracking, "CH 12345678");
  time += 91 * 24 * 60 * 60_000;
  await assert.rejects(orders.status(token), { status: 404 });
});

test("unlimited sandbox supports concurrent orders and cancellation without changing physical inventory", async (t) => {
  const orders = openOrders({ filename: ":memory:", provider: createSimulator(), config });
  t.after(() => orders.close());
  const submitted = checkout(orders.catalog());
  const a = key();
  const b = key();
  await Promise.all([orders.start(submitted, a), orders.start(submitted, b)]);
  assert.equal((await orders.cancel(a)).status, "expired");
  assert.equal((await orders.status(b)).status, "pending");
  assert(orders.admin().stock.every((p) => p.stock === 0));
  assert.throws(() => orders.adjust(config.products[0].variants[0].id, 1, "received"), {
    status: 409,
  });
  assert.throws(
    () =>
      openOrders({
        filename: ":memory:",
        provider: null,
        config: { ...config, mode: "live" },
      }),
    /requires sandbox/,
  );
  assert.throws(
    () => readShopConfig({ MERCH_MODE: "live", MERCH_STOCK_MODE: "unlimited-test" }),
    /requires sandbox/,
  );
});

test("a database restore preserves the quote and never restocks an unlimited test order", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "renzo-preorder-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const filename = join(directory, "original.sqlite");
  const restoredFile = join(directory, "restored.sqlite");
  const now = () => blackFridayStart;
  const provider = createSimulator(now);
  const first = openOrders({ filename, provider, config, now });
  const token = key();
  let started;
  try {
    started = await first.start(checkout(first.catalog()), token);
    const source = new DatabaseSync(filename);
    try {
      await backup(source, restoredFile);
    } finally {
      source.close();
    }
  } finally {
    first.close();
  }
  const restored = openOrders({
    filename: restoredFile,
    provider,
    now,
    config: { ...config, stockMode: "tracked" },
  });
  try {
    assert.deepEqual(await restored.status(token), started);
    assert.equal((await restored.cancel(token)).status, "expired");
    assert(restored.admin().stock.every((row) => row.stock === 0));
    await assert.rejects(restored.start(checkout(restored.catalog()), key()), { status: 409 });
  } finally {
    restored.close();
  }
});
