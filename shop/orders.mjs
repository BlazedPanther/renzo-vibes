import { createHash, randomBytes, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { siteAnalytics } from "./analytics.mjs";
import {
  autographCard,
  blackFridayActive,
  blackFridayEnd,
  blackFridayStart,
  preorderNotice,
} from "./campaign.mjs";

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

export const validEmail = (value) =>
  typeof value === "string" &&
  value.length <= 120 &&
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(value);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const maxQuantity = 10;
const validToken = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

export class ShopError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function normalize(body, variants, testOnly) {
  const items = body?.items;
  const address = body?.address;
  if (
    !Array.isArray(items) ||
    !items.length ||
    items.length > Math.min(30, variants.size) ||
    !items.every(
      (item) =>
        variants.has(item?.id) &&
        Number.isInteger(item.quantity) &&
        item.quantity >= 1 &&
        item.quantity <= maxQuantity,
    ) ||
    new Set(items.map(({ id }) => id)).size !== items.length ||
    address?.country !== "CH" ||
    typeof address.postcode !== "string" ||
    !/^[1-9][0-9]{3}$/.test(address.postcode) ||
    !["name", "street", "city", "email"].every(
      (field) =>
        typeof address[field] === "string" &&
        address[field].trim().length > 0 &&
        address[field].length <= 120 &&
        !/[\x00-\x1f\x7f]/.test(address[field]),
    ) ||
    !validEmail(address.email.trim()) ||
    (testOnly && !/@example\.(test|invalid)$/i.test(address.email.trim()))
  )
    throw new ShopError(
      400,
      testOnly
        ? "Enter a Swiss test address and an @example.test email."
        : "Enter a valid Swiss shipping address and email.",
    );

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

export function openOrders({
  filename,
  provider,
  config,
  sendConfirmations = config?.mode === "live",
  sendMerchantNotifications = false,
  enableAnalytics = false,
  now = Date.now,
}) {
  const products = config?.products ?? [testProduct];
  const shipping = config?.shipping ?? 800;
  const stockMode = config?.stockMode ?? "tracked";
  const unlimited = stockMode === "unlimited-test" || stockMode === "open-preorder";
  if (stockMode === "unlimited-test" && config?.mode !== "sandbox")
    throw new Error("Unlimited test stock requires sandbox mode");
  if (stockMode === "open-preorder" && (config?.mode !== "live" || !config.preorder))
    throw new Error("Open pre-orders require a live pre-order catalogue");
  const serializedConfig = JSON.stringify(config);
  const version = config && hash(serializedConfig);
  function quote(time) {
    const promotion = !!config?.preorder && blackFridayActive(time);
    return {
      promotion,
      version: config?.preorder ? hash(JSON.stringify([version, promotion])) : version,
      price: (product) => (promotion ? (product.blackFridayPrice ?? product.price) : product.price),
    };
  }
  const variants = new Map(
    products.flatMap((product) =>
      product.variants.map((variant) => [
        variant.id,
        {
          ...variant,
          name: product.name,
          price: product.price,
          blackFridayPrice: product.blackFridayPrice,
        },
      ]),
    ),
  );
  const db = new DatabaseSync(filename);
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

  function initialize() {
    db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS stock (
      id TEXT PRIMARY KEY, quantity INTEGER NOT NULL CHECK (quantity >= 0)
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, tokenHash TEXT NOT NULL UNIQUE, bodyHash TEXT NOT NULL,
      items TEXT NOT NULL, total INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','expired')),
      expires INTEGER NOT NULL, providerId TEXT UNIQUE, url TEXT
    );
  `);

    atomic(() => {
      const columns = new Set(
        db
          .prepare("PRAGMA table_info(orders)")
          .all()
          .map(({ name }) => name),
      );
      for (const [name, type] of Object.entries({
        address: "TEXT",
        shipping: "INTEGER",
        version: "TEXT",
        created: "INTEGER",
        shipped: "INTEGER",
        checked: "INTEGER NOT NULL DEFAULT 0",
        payment: "TEXT",
        reserved: "INTEGER NOT NULL DEFAULT 1",
        preorder: "INTEGER NOT NULL DEFAULT 0",
        gift: "INTEGER NOT NULL DEFAULT 0",
        fulfillment: "TEXT",
        tracking: "TEXT",
        refundRef: "TEXT",
      })) {
        if (!columns.has(name)) db.exec(`ALTER TABLE orders ADD COLUMN ${name} ${type}`);
      }
      db.exec(`
      CREATE INDEX IF NOT EXISTS orders_reconcile ON orders (status, checked);
      CREATE INDEX IF NOT EXISTS orders_admin ON orders (created);
      CREATE TABLE IF NOT EXISTS mail (
        orderId TEXT NOT NULL REFERENCES orders(id), kind TEXT NOT NULL,
        due INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, sent INTEGER,
        PRIMARY KEY (orderId, kind)
      );
      CREATE INDEX IF NOT EXISTS mail_due ON mail (sent, due);
      CREATE TABLE IF NOT EXISTS stock_changes (
        id INTEGER PRIMARY KEY, variant TEXT NOT NULL, delta INTEGER NOT NULL,
        reason TEXT NOT NULL, created INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS shop_metadata (mode TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS shop_versions (id TEXT PRIMARY KEY, config TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS stock_mutations (id TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS fulfillment_events (
        id INTEGER PRIMARY KEY, orderId TEXT NOT NULL REFERENCES orders(id),
        state TEXT NOT NULL, tracking TEXT, refundRef TEXT, created INTEGER NOT NULL
      );
    `);
      const mode = config ? (config.mode ?? "configured") : "legacy-sandbox";
      const existing = db.prepare("SELECT mode FROM shop_metadata").get();
      if (
        (existing && existing.mode !== mode) ||
        (config && !existing && db.prepare("SELECT 1 FROM stock LIMIT 1").get())
      ) {
        throw new Error("Shop database belongs to another operating mode");
      }
      db.prepare("INSERT OR IGNORE INTO shop_metadata VALUES (?)").run(mode);
      if (config)
        db.prepare("INSERT OR IGNORE INTO shop_versions VALUES (?, ?)").run(
          version,
          JSON.stringify(config),
        );
      const seed = db.prepare("INSERT OR IGNORE INTO stock VALUES (?, ?)");
      for (const id of variants.keys()) seed.run(id, config ? 0 : id === "hoodie-s" ? 1 : 4);
    });
  }
  let analytics = null;
  try {
    initialize();
    if (enableAnalytics) analytics = siteAnalytics(db, now);
  } catch (error) {
    db.close();
    throw error;
  }

  function catalog() {
    const time = now();
    const pricing = quote(time);
    const nextBoundary = [blackFridayStart, blackFridayEnd].find((boundary) => boundary > time);
    const stock = new Map(
      db
        .prepare("SELECT id, quantity FROM stock")
        .all()
        .map(({ id, quantity }) => [id, quantity]),
    );
    const showIntroductoryComparison =
      config?.mode === "live" && config.introductoryComparison === true && pricing.promotion;
    const available = products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      front: product.front,
      back: product.back,
      frontAlt: product.frontAlt,
      backAlt: product.backAlt,
      imageNote: product.imageNote,
      price: pricing.price(product),
      ...(showIntroductoryComparison && product.blackFridayPrice < product.price
        ? { futurePrice: product.price }
        : {}),
      color: product.color,
      variants: product.variants.map((variant) => ({
        ...variant,
        ...(stockMode === "open-preorder"
          ? { stock: null, maxQuantity }
          : { stock: unlimited ? maxQuantity : Math.min(stock.get(variant.id), maxQuantity) }),
      })),
    }));
    return config
      ? {
          products: available,
          shipping,
          version: pricing.version,
          legal: config.legal,
          stockMode,
          preorder: !!config.preorder,
          notice: config.preorder ? preorderNotice : null,
          gift: pricing.promotion ? autographCard : null,
          refreshIn: config.preorder && nextBoundary ? nextBoundary - time : null,
        }
      : { product: available[0], shipping };
  }

  function getByToken(token) {
    if (!validToken(token)) return null;
    return db.prepare("SELECT * FROM orders WHERE tokenHash = ?").get(hash(token)) ?? null;
  }

  function requireCustomerAccess(order) {
    if (!order || (order.created && now() - order.created >= 90 * 24 * 60 * 60_000)) {
      throw new ShopError(404, "Order not found.");
    }
    return order;
  }

  function publicOrder(order) {
    return {
      reference: order.id,
      status: order.status,
      total: order.total,
      checkoutUrl: order.status === "pending" && order.expires > now() ? order.url : null,
      ...(config && {
        payment: order.payment,
        shipping: order.shipping,
        items: JSON.parse(order.items),
        preorder: !!order.preorder,
        gift: order.gift ? autographCard : null,
        fulfillment:
          order.fulfillment ??
          (order.shipped
            ? "shipped"
            : order.preorder
              ? { paid: "paid_preorder", pending: "awaiting_payment", expired: "cancelled" }[
                  order.status
                ]
              : null),
        tracking: order.tracking,
      }),
    };
  }

  function queueMail(id, kind) {
    if (sendConfirmations) {
      db.prepare("INSERT OR IGNORE INTO mail (orderId, kind, due) VALUES (?, ?, ?)").run(
        id,
        kind,
        now(),
      );
    }
  }

  function release(order, reason) {
    for (const { id, quantity } of order.reserved ? JSON.parse(order.items) : []) {
      db.prepare("UPDATE stock SET quantity = quantity + ? WHERE id = ?").run(quantity, id);
    }
    db.prepare(
      "UPDATE orders SET status = 'expired', payment = ?, url = NULL, address = NULL WHERE id = ?",
    ).run(reason, order.id);
    db.prepare("DELETE FROM mail WHERE orderId = ? AND sent IS NULL").run(order.id);
  }

  function record(order, result) {
    if (!result) return;
    atomic(() => {
      const latest = db.prepare("SELECT * FROM orders WHERE id = ?").get(order.id);
      if (latest.status !== "pending") return;
      if (latest.providerId && latest.providerId !== result.id)
        throw new Error("Checkout ID mismatch");
      db.prepare(
        "UPDATE orders SET providerId = ?, url = COALESCE(?, url), payment = ? WHERE id = ?",
      ).run(result.id, result.url ?? null, result.status, order.id);
      if (result.status === "PAID") {
        db.prepare("UPDATE orders SET status = 'paid', url = NULL WHERE id = ?").run(order.id);
        queueMail(order.id, "paid");
        if (sendMerchantNotifications) queueMail(order.id, "merchant_paid");
      }
      // FAILED is a payment attempt, not a terminal checkout state.
      if (result.status === "EXPIRED") release(latest, "EXPIRED");
    });
  }

  const inFlight = new Map();
  async function refresh(order, force = false) {
    if (order.status !== "pending" || (!force && config && order.checked > now() - 5000)) return;
    if (inFlight.has(order.id)) return inFlight.get(order.id);
    db.prepare("UPDATE orders SET checked = ? WHERE id = ?").run(now(), order.id);
    const task = Promise.resolve().then(async () => {
      const result = await provider.get(order);
      if (
        config &&
        result &&
        ["PENDING", "FAILED"].includes(result.status) &&
        order.expires <= now()
      ) {
        const latest = { ...order, providerId: result.id };
        record(order, result);
        record(latest, await provider.cancel(latest));
      } else record(order, result);
    });
    inFlight.set(order.id, task);
    try {
      await task;
    } finally {
      inFlight.delete(order.id);
    }
  }

  function adminOrder(order) {
    return {
      ...publicOrder(order),
      address: JSON.parse(order.address),
      created: order.created,
      shipped: order.shipped,
      expires: order.expires,
      providerId: order.providerId,
      refundRef: order.refundRef,
      events: db
        .prepare("SELECT state, created FROM fulfillment_events WHERE orderId = ? ORDER BY id DESC")
        .all(order.id),
    };
  }

  return {
    catalog,
    async start(body, token, returnUrl, { allowNew = true, webhookUrl } = {}) {
      if (!validToken(token)) throw new ShopError(400, "Invalid checkout request.");
      // An existing order can still be recovered via status when the catalog changes.
      const { items, address } = normalize(body, variants, !config || config.mode === "sandbox");
      const bodyHash = hash(
        JSON.stringify({
          items,
          address,
          ...(config && { version: body.version, total: body.total }),
        }),
      );
      const { order, created } = atomic(() => {
        const existing = getByToken(token);
        if (existing) {
          requireCustomerAccess(existing);
          if (existing.bodyHash !== bodyHash)
            throw new ShopError(409, "This checkout already exists.");
          return { order: existing, created: false };
        }
        if (!allowNew) throw new ShopError(503, "Ordering is currently closed.");
        const time = now();
        const pricing = quote(time);
        const total = items.reduce(
          (sum, item) => sum + item.quantity * pricing.price(variants.get(item.id)),
          shipping,
        );
        if (
          config &&
          (body.version !== pricing.version || body.total !== total || body.accepted !== true)
        ) {
          throw new ShopError(409, "Review the current total and terms before submitting.");
        }
        for (const { id, quantity } of unlimited ? [] : items) {
          const change = db
            .prepare("UPDATE stock SET quantity = quantity - ? WHERE id = ? AND quantity >= ?")
            .run(quantity, id, quantity);
          if (!change.changes)
            throw new ShopError(409, "A size is no longer available in this quantity.");
        }
        const id = randomUUID();
        const lines = config
          ? items.map((item) => {
              const variant = variants.get(item.id);
              return {
                ...item,
                name: variant.name,
                size: variant.size,
                price: pricing.price(variant),
              };
            })
          : items;
        db.prepare(
          `INSERT INTO orders (id, tokenHash, bodyHash, items, total, expires, address, shipping, version, created, reserved, preorder, gift)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          id,
          hash(token),
          bodyHash,
          JSON.stringify(lines),
          total,
          time + 30 * 60_000,
          config ? JSON.stringify(address) : null,
          shipping,
          pricing.version ?? null,
          time,
          Number(!unlimited),
          Number(!!config?.preorder),
          Number(pricing.promotion),
        );
        if (config?.preorder)
          db.prepare("INSERT OR IGNORE INTO shop_versions VALUES (?, ?)").run(
            pricing.version,
            JSON.stringify({ ...config, promotion: pricing.promotion }),
          );
        queueMail(id, "received");
        return { order: getByToken(token), created: true };
      });

      // The provider may have received a timed-out POST. Recover by reference, never create again.
      if (created) {
        try {
          record(order, await provider.create(order, returnUrl, webhookUrl));
        } catch (error) {
          if (!error.checkoutRejected) throw error;
          console.warn("SumUp rejected checkout creation.");
          atomic(() => {
            const latest = getByToken(token);
            if (latest.status === "pending" && !latest.providerId) release(latest, "REJECTED");
          });
        }
      } else if (!order.url) await refresh(order, true);
      return publicOrder(getByToken(token));
    },
    async status(token) {
      const order = requireCustomerAccess(getByToken(token));
      await refresh(order);
      return publicOrder(getByToken(token));
    },
    async cancel(token) {
      const order = requireCustomerAccess(getByToken(token));
      await refresh(order, true);
      const latest = getByToken(token);
      if (latest.status === "pending" && latest.providerId) {
        record(latest, await provider.cancel(latest));
      }
      return publicOrder(getByToken(token));
    },
    async reconcile() {
      const waiting = db
        .prepare("SELECT * FROM orders WHERE status = 'pending' ORDER BY checked LIMIT 20")
        .all();
      for (const order of waiting) {
        try {
          await refresh(order, true);
        } catch {
          console.warn("Checkout reconciliation deferred.");
        }
      }
    },
    async verifyNotification(providerId) {
      const order = db.prepare("SELECT * FROM orders WHERE providerId = ?").get(providerId);
      if (order) await refresh(order, true);
    },
    admin(page = 0, status = "", reference = "") {
      return {
        orders: db
          .prepare(
            "SELECT * FROM orders WHERE (? = '' OR status = ?) AND (? = '' OR id = ?) ORDER BY created DESC, id DESC LIMIT 51 OFFSET ?",
          )
          .all(status, status, reference, reference, page * 50)
          .map(adminOrder),
        stock: [...variants].map(([id, variant]) => ({
          ...variant,
          stock: db.prepare("SELECT quantity FROM stock WHERE id = ?").get(id).quantity,
        })),
        mailWaiting: db.prepare("SELECT count(*) AS count FROM mail WHERE sent IS NULL").get()
          .count,
        stockMode,
      };
    },
    adjust(id, delta, reason, mutation = randomUUID()) {
      if (unlimited)
        throw new ShopError(409, "Stock changes are disabled in this availability mode.");
      if (
        !/^[a-f0-9-]{36}$/.test(mutation ?? "") ||
        !variants.has(id) ||
        !Number.isInteger(delta) ||
        Math.abs(delta) > 10000 ||
        !delta ||
        !["received", "external-sale", "correction"].includes(reason) ||
        (reason === "external-sale" && delta > 0) ||
        (reason === "received" && delta < 0)
      ) {
        throw new ShopError(400, "Invalid stock movement.");
      }
      atomic(() => {
        if (!db.prepare("INSERT OR IGNORE INTO stock_mutations VALUES (?)").run(mutation).changes)
          return;
        const change = db
          .prepare("UPDATE stock SET quantity = quantity + ? WHERE id = ? AND quantity + ? >= 0")
          .run(delta, id, delta);
        if (!change.changes) throw new ShopError(409, "This would consume reserved stock.");
        db.prepare(
          "INSERT INTO stock_changes (variant, delta, reason, created) VALUES (?, ?, ?, ?)",
        ).run(id, delta, reason, now());
      });
    },
    ship(id, tracking, state = "shipped", refundRef) {
      const permitted = ["in_preparation", "ready_to_ship", "shipped", "delayed", "refunded"];
      if (
        !permitted.includes(state) ||
        (tracking && (state !== "shipped" || !/^[a-zA-Z0-9 -]{1,80}$/.test(tracking))) ||
        (state === "refunded" && !/^[a-zA-Z0-9-]{4,80}$/.test(refundRef ?? ""))
      ) {
        throw new ShopError(400, "Invalid fulfillment data.");
      }
      atomic(() => {
        const current = db.prepare("SELECT * FROM orders WHERE id = ? AND status = 'paid'").get(id);
        if (!current) throw new ShopError(409, "Only paid orders can be marked as shipped.");
        const previous = current.fulfillment ?? (current.shipped ? "shipped" : null);
        if (previous === state) return;
        if (previous === "refunded" || (previous === "shipped" && state !== "refunded")) {
          throw new ShopError(409, "This order has already passed that fulfillment step.");
        }
        const time = now();
        db.prepare(
          "UPDATE orders SET fulfillment = ?, shipped = COALESCE(shipped, ?), tracking = COALESCE(tracking, ?), refundRef = ? WHERE id = ?",
        ).run(
          state,
          state === "shipped" ? time : null,
          tracking || null,
          state === "refunded" ? refundRef : null,
          id,
        );
        db.prepare(
          "INSERT INTO fulfillment_events (orderId, state, tracking, refundRef, created) VALUES (?, ?, ?, ?, ?)",
        ).run(id, state, tracking || null, state === "refunded" ? refundRef : null, time);
        if (current.preorder && state !== "ready_to_ship") queueMail(id, state);
      });
    },
    async sendMail(send) {
      const waiting = db
        .prepare(
          `SELECT mail.*, orders.address, orders.items, orders.total, orders.shipping,
            orders.preorder, orders.gift, orders.tracking
        FROM mail JOIN orders ON orders.id = mail.orderId WHERE sent IS NULL AND due <= ?
        AND orders.address IS NOT NULL ORDER BY due LIMIT 10`,
        )
        .all(now());
      for (const mail of waiting) {
        // A cancelled order may have lost its address while the worker awaited another send.
        if (
          !db
            .prepare("SELECT 1 FROM mail WHERE orderId = ? AND kind = ? AND sent IS NULL")
            .get(mail.orderId, mail.kind)
        )
          continue;
        try {
          await send({ ...mail, address: JSON.parse(mail.address), items: JSON.parse(mail.items) });
          db.prepare("UPDATE mail SET sent = ? WHERE orderId = ? AND kind = ?").run(
            now(),
            mail.orderId,
            mail.kind,
          );
        } catch {
          db.prepare(
            "UPDATE mail SET attempts = attempts + 1, due = ? WHERE orderId = ? AND kind = ?",
          ).run(
            now() + Math.min(3600_000, 30_000 * 2 ** Math.min(mail.attempts, 7)),
            mail.orderId,
            mail.kind,
          );
          console.warn("Order email delivery deferred.");
        }
      }
    },
    pruneAddresses(days) {
      if (!Number.isSafeInteger(days) || days < 1) throw new Error("Invalid retention period");
      db.prepare(
        `UPDATE orders SET address = NULL
        WHERE address IS NOT NULL AND COALESCE(shipped,
          (SELECT MAX(created) FROM fulfillment_events WHERE orderId = orders.id AND state = 'refunded')) <= ?
        AND NOT EXISTS (SELECT 1 FROM mail WHERE orderId = orders.id AND sent IS NULL)`,
      ).run(now() - days * 24 * 60 * 60_000);
    },
    analytics,
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
    async cancel(order) {
      const checkout = checkouts.get(order.id);
      if (checkout.status !== "PAID") checkout.status = "EXPIRED";
      return checkout;
    },
    setStatus(order, status) {
      const checkout = checkouts.get(order);
      if (checkout && !["PAID", "EXPIRED"].includes(checkout.status) && now() < checkout.expires)
        checkout.status = status;
    },
  };
}
