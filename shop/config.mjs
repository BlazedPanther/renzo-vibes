import { readFileSync } from "node:fs";
import products from "./products.json" with { type: "json" };
import { validEmail } from "./orders.mjs";

const text = (value, max) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;
const cents = (value, min) => Number.isSafeInteger(value) && value >= min && value <= 100_000;
export const legalSections = ["imprint", "privacy", "payment", "delivery", "returns"];

export function readMailSettings(env, mode) {
  const testRecipient = env.MERCH_SANDBOX_MAIL_TO;
  const merchantRecipient = env.MERCH_MERCHANT_EMAIL;
  if (mode === "sandbox" && !testRecipient) return null;
  if (
    !env.MERCH_RESEND_KEY ||
    !validEmail(env.MERCH_MAIL_FROM) ||
    !validEmail(env.MERCH_MAIL_REPLY_TO) ||
    (mode === "sandbox" && !validEmail(testRecipient)) ||
    (mode === "live" && (testRecipient || !validEmail(merchantRecipient))) ||
    (merchantRecipient && !validEmail(merchantRecipient))
  ) {
    throw new Error("Invalid merch mail configuration for this operating mode");
  }
  return {
    key: env.MERCH_RESEND_KEY,
    from: env.MERCH_MAIL_FROM,
    replyTo: env.MERCH_MAIL_REPLY_TO,
    testRecipient,
    merchantRecipient,
  };
}

export function readShopConfig(env) {
  const mode = env.MERCH_MODE;
  if (!mode || mode === "off") return null;
  if (!["live", "sandbox"].includes(mode)) throw new Error("Invalid MERCH_MODE");
  const stockMode = env.MERCH_STOCK_MODE ?? "tracked";
  if (!["tracked", "unlimited-test", "open-preorder"].includes(stockMode))
    throw new Error("Invalid stock mode");
  if (stockMode === "unlimited-test" && mode !== "sandbox")
    throw new Error("Unlimited test stock requires sandbox mode");
  if (
    stockMode === "open-preorder" &&
    (mode !== "live" || env.MERCH_PREORDER_SUPPLY_CONFIRMED !== "true")
  )
    throw new Error("Open pre-orders require live mode and confirmation of pre-order supply");
  const data = JSON.parse(env.MERCH_CONFIG_JSON ?? "null");
  const legal = data?.legal;
  if (
    !cents(data?.shipping, 0) ||
    !Array.isArray(data?.products) ||
    !data.products.length ||
    !data.products.every(
      (p) =>
        p &&
        Object.hasOwn(products, p.id) &&
        cents(p.price, 1) &&
        (products[p.id].regularPrice === undefined || p.price === products[p.id].regularPrice) &&
        text(p.description, 500) &&
        Array.isArray(p.sizes) &&
        p.sizes.length > 0 &&
        p.sizes.length <= 20 &&
        new Set(p.sizes).size === p.sizes.length &&
        p.sizes.every(
          (size) =>
            typeof size === "string" &&
            /^[A-Z0-9-]{1,12}$/.test(size) &&
            (mode !== "live" || size !== "TEST"),
        ),
    ) ||
    new Set(data.products.map(({ id }) => id)).size !== data.products.length ||
    !legalSections.every(
      (key) =>
        text(legal?.[key], 10_000) && !/\[(?:[^\]]{1,120})\]|\b(?:TODO|TBD)\b/i.test(legal[key]),
    )
  ) {
    throw new Error(
      "MERCH_CONFIG_JSON requires confirmed products, shipping and complete legal texts",
    );
  }
  const preorder = data.products.some(({ id }) => products[id].preorder);
  if (stockMode === "open-preorder" && !preorder) {
    throw new Error("Open pre-orders require a pre-order catalogue");
  }
  if (
    preorder &&
    (data.shipping !== 700 || data.products.some(({ id }) => !products[id].preorder))
  ) {
    throw new Error("The pre-order campaign requires CHF 7.00 shipping and pre-order products");
  }

  const origin = new URL(env.MERCH_ORIGIN);
  if (
    origin.origin !== env.MERCH_ORIGIN ||
    origin.protocol !== "https:" ||
    (mode === "live" && origin.origin !== "https://www.renzovibes.com") ||
    (mode === "sandbox" && ["www.renzovibes.com", "renzovibes.com"].includes(origin.hostname))
  ) {
    throw new Error("Invalid MERCH_ORIGIN for operating mode");
  }
  if (
    !/^[a-f0-9]{64}$/.test(env.MERCH_ADMIN_PASSWORD_HASH ?? "") ||
    !/^[a-f0-9]{64}$/.test(env.MERCH_WEBHOOK_TOKEN ?? "")
  ) {
    throw new Error("Missing or invalid merch admin digest or callback token");
  }
  const mail = readMailSettings(env, mode);

  const addressRetentionDays = Number(env.MERCH_ADDRESS_RETENTION_DAYS);
  if (
    mode === "live" &&
    (!Number.isSafeInteger(addressRetentionDays) ||
      addressRetentionDays < 1 ||
      addressRetentionDays > 3660)
  ) {
    throw new Error("Live checkout requires an approved retention period for shipped orders");
  }

  const mount = "/data";
  const mounts = readFileSync("/proc/self/mountinfo", "utf8").split("\n");
  if (
    env.RAILWAY_VOLUME_MOUNT_PATH !== mount ||
    !mounts.some((line) => line.split(" ")[4] === mount)
  ) {
    throw new Error("MERCH_MODE requires a mounted Railway volume at /data");
  }

  return {
    origin: origin.origin,
    mail,
    addressRetentionDays,
    filename: `${mount}/merch-${mode}.sqlite`,
    allowNew: env.MERCH_ACCEPT_ORDERS === "true",
    adminHash: env.MERCH_ADMIN_PASSWORD_HASH,
    webhookToken: env.MERCH_WEBHOOK_TOKEN,
    config: {
      mode,
      stockMode,
      preorder,
      introductoryComparison:
        mode === "live" &&
        preorder &&
        env.MERCH_ACCEPT_ORDERS === "true" &&
        env.MERCH_INTRODUCTORY_PRICE_COMMITMENT === "true",
      shipping: data.shipping,
      legal: Object.fromEntries(legalSections.map((key) => [key, legal[key].trim()])),
      products: data.products.map(({ id, price, description, sizes }) => ({
        id,
        ...products[id],
        price,
        description,
        variants: sizes.map((size) => ({ id: `${id}:${size}`, size })),
      })),
    },
  };
}
