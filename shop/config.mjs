import { readFileSync } from "node:fs";
import products from "./products.json" with { type: "json" };
import { validEmail } from "./orders.mjs";

const text = (value, max) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;
const cents = (value, min) => Number.isSafeInteger(value) && value >= min && value <= 100_000;
export const legalSections = ["imprint", "privacy", "payment", "delivery", "returns"];

export function readMailSettings(env, mode) {
  const testRecipient = env.MERCH_SANDBOX_MAIL_TO;
  if (mode === "sandbox" && !testRecipient) return null;
  if (
    !env.MERCH_RESEND_KEY ||
    !validEmail(env.MERCH_MAIL_FROM) ||
    !validEmail(env.MERCH_MAIL_REPLY_TO) ||
    (mode === "sandbox" && !validEmail(testRecipient)) ||
    (mode === "live" && testRecipient)
  ) {
    throw new Error("Invalid merch mail configuration for this operating mode");
  }
  return {
    key: env.MERCH_RESEND_KEY,
    from: env.MERCH_MAIL_FROM,
    replyTo: env.MERCH_MAIL_REPLY_TO,
    testRecipient,
  };
}

export function readShopConfig(env) {
  const mode = env.MERCH_MODE;
  if (!mode || mode === "off") return null;
  if (!["live", "sandbox"].includes(mode)) throw new Error("Invalid MERCH_MODE");
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
        (mode !== "live" || products[p.id].back) &&
        cents(p.price, 1) &&
        text(p.description, 500) &&
        Array.isArray(p.sizes) &&
        p.sizes.length > 0 &&
        p.sizes.length <= 20 &&
        new Set(p.sizes).size === p.sizes.length &&
        p.sizes.every((size) => typeof size === "string" && /^[A-Z0-9-]{1,12}$/.test(size)),
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
