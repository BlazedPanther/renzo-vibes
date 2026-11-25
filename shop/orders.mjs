import { createHash, randomBytes, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

export const testProduct = {
  name: "DEMO – Renzo Vibes hoodie",
  description: "Test product for the local checkout. No goods will be shipped.",
  color: "Purple",
  price: 4500,
  variants: [
    { id: "hoodie-s", size: "S" },
    { id: "hoodie-m", size: "M" },
  ],
};
const shipping = 800;
const hash = (value) => createHash("sha256").update(value).digest("hex");

export class ShopError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function normalize(body) {
  const items = body?.items;
  const address = body?.address;
  if (
    !Array.isArray(items) ||
    !items.length ||
    items.length > testProduct.variants.length ||
    !items.every(
      (item) =>
        testProduct.variants.some(({ id }) => id === item?.id) &&
        Number.isInteger(item.quantity) &&
        item.quantity >= 1 &&
        item.quantity <= 10,
    ) ||
    new Set(items.map(({ id }) => id)).size !== items.length ||
    address?.country !== "CH" ||
    typeof address.postcode !== "string" ||
    !/^\d{4}$/.test(address.postcode) ||
    !["name", "street", "city", "email"].every(
      (field) =>
        typeof address[field] === "string" &&
        address[field].trim().length > 0 &&
        address[field].length <= 120 &&
        !/[\x00-\x1f\x7f]/.test(address[field]),
    ) ||
    !/^[^\s@]+@example\.(test|invalid)$/i.test(address.email.trim())
  )
    throw new ShopError(400, "Enter a Swiss test address and an @example.test email.");

  return {
    items: items
      .map(({ id, quantity }) => ({ id, quantity }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    address: Object.fromEntries(
      ["name", "street", "postcode", "city", "country", "email"].map((field) => [
        field,
        address[field].trim(),
      ]),
    ),
  };
}

export function openOrders({ filename, provider, now = Date.now }) {
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS stock (
      id TEXT PRIMARY KEY, quantity INTEGER NOT NULL CHECK (quantity >= 0)
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, tokenHash TEXT NOT NULL UNIQUE, bodyHash TEXT NOT NULL,
      items TEXT NOT NULL, total INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','expired')),
      expires INTEGER NOT NULL, providerId TEXT UNIQUE, url TEXT
    );
    INSERT OR IGNORE INTO stock VALUES ('hoodie-s', 1), ('hoodie-m', 4);
  `);

  function atomic(fn) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      db.exec("COMMIT");
      return value;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  function catalog() {
    return {
      product: {
        ...testProduct,
        variants: testProduct.variants.map((variant) => ({
          ...variant,
          stock: db.prepare("SELECT quantity FROM stock WHERE id = ?").get(variant.id).quantity,
        })),
      },
      shipping,
    };
  }

  function getByToken(token) {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return null;
    return db.prepare("SELECT * FROM orders WHERE tokenHash = ?").get(hash(token)) ?? null;
  }

  function publicOrder(order) {
    return {
      reference: order.id,
      status: order.status,
      total: order.total,
      checkoutUrl: order.status === "pending" && order.expires > now() ? order.url : null,
    };
  }

  function record(order, result) {
    if (!result) return;
    atomic(() => {
      const latest = db.prepare("SELECT * FROM orders WHERE id = ?").get(order.id);
      if (latest.status !== "pending") return;
      if (latest.providerId && latest.providerId !== result.id)
        throw new Error("Checkout ID mismatch");
      db.prepare("UPDATE orders SET providerId = ?, url = COALESCE(?, url) WHERE id = ?").run(
        result.id,
        result.url ?? null,
        order.id,
      );
      if (result.status === "PAID") {
        db.prepare("UPDATE orders SET status = 'paid' WHERE id = ?").run(order.id);
      }
      // A failed attempt may still be retried. Release stock only once SumUp confirms expiry.
      if (result.status === "EXPIRED") {
        for (const { id, quantity } of JSON.parse(latest.items)) {
          db.prepare("UPDATE stock SET quantity = quantity + ? WHERE id = ?").run(quantity, id);
        }
        db.prepare("UPDATE orders SET status = 'expired' WHERE id = ?").run(order.id);
      }
    });
  }

  async function refresh(order) {
    if (order.status === "pending") record(order, await provider.get(order));
  }

  return {
    catalog,
    async start(body, token, returnUrl) {
      if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
        throw new ShopError(400, "Invalid checkout request.");
      }
      const { items, address } = normalize(body);
      const bodyHash = hash(JSON.stringify({ items, address }));
      const { order, created } = atomic(() => {
        const existing = getByToken(token);
        if (existing) {
          if (existing.bodyHash !== bodyHash)
            throw new ShopError(409, "This checkout already exists.");
          return { order: existing, created: false };
        }
        for (const { id, quantity } of items) {
          const change = db
            .prepare("UPDATE stock SET quantity = quantity - ? WHERE id = ? AND quantity >= ?")
            .run(quantity, id, quantity);
          if (!change.changes)
            throw new ShopError(409, "A size is no longer available in this quantity.");
        }
        const id = randomUUID();
        const total = items.reduce(
          (sum, item) => sum + item.quantity * testProduct.price,
          shipping,
        );
        db.prepare(
          "INSERT INTO orders (id, tokenHash, bodyHash, items, total, expires) VALUES (?, ?, ?, ?, ?, ?)",
        ).run(id, hash(token), bodyHash, JSON.stringify(items), total, now() + 30 * 60_000);
        return { order: getByToken(token), created: true };
      });

      // After a timeout, look up the same reference. Never issue another create for it.
      if (created) record(order, await provider.create(order, returnUrl));
      else if (!order.url) await refresh(order);
      return publicOrder(getByToken(token));
    },
    async status(token) {
      const order = getByToken(token);
      if (!order) throw new ShopError(404, "Test order not found.");
      await refresh(order);
      return publicOrder(getByToken(token));
    },
    async reconcile() {
      const waiting = db.prepare("SELECT * FROM orders WHERE status = 'pending'").all();
      for (const order of waiting) {
        try {
          await refresh(order);
        } catch {
          console.warn("Sandbox checkout reconciliation deferred.");
        }
      }
    },
    async verifyNotification(providerId) {
      const order = db.prepare("SELECT * FROM orders WHERE providerId = ?").get(providerId);
      if (order) await refresh(order);
    },
    close: () => db.close(),
  };
}

export function createSimulator(now = Date.now) {
  const checkouts = new Map();
  return {
    async create(order) {
      const id = randomBytes(16).toString("hex");
      const checkout = { id, status: "PENDING", expires: order.expires };
      checkouts.set(order.id, checkout);
      return checkout;
    },
    async get(order) {
      const checkout = checkouts.get(order.id);
      if (!checkout) return null;
      return checkout.status !== "PAID" && now() >= checkout.expires
        ? { ...checkout, status: "EXPIRED" }
        : checkout;
    },
    setStatus(order, status) {
      const checkout = checkouts.get(order);
      if (checkout && checkout.status !== "PAID" && now() < checkout.expires)
        checkout.status = status;
    },
  };
}
