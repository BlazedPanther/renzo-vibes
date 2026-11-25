import type { MerchRelease } from "../config/merch-release.ts";

const chf = new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF" });
export const formatChf = (rappen: number) => chf.format(rappen / 100);

export function prepareMerchRequest(
  release: MerchRelease,
  selections: Readonly<Record<string, number>>,
) {
  const variants = release.products.flatMap((product) =>
    product.variants.map((variant) => ({
      ...variant,
      product: product.name,
      color: product.color,
    })),
  );
  const lines = Object.entries(selections).map(([id, quantity]) => {
    const variant = variants.find((value) => value.id === id);
    if (
      !variant ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > Math.min(10, variant.quantity)
    ) {
      throw new Error("Eine der gewählten Mengen ist ungültig.");
    }
    return { ...variant, units: quantity, lineTotal: variant.rappen * quantity };
  });
  const subtotal = lines.reduce((total, line) => total + line.lineTotal, 0);
  const total = subtotal + (lines.length ? release.delivery.rappen : 0);
  const message = [
    "Hallo Renzo,",
    "",
    "ich möchte unverbindlich folgendes Merch anfragen:",
    ...lines.map(
      (line) =>
        `- ${line.units} × ${line.product}, ${line.color}, ${line.size} – ${formatChf(line.lineTotal)}`,
    ),
    "",
    `Warenwert: ${formatChf(subtotal)}`,
    `Versand Schweiz: ${formatChf(release.delivery.rappen)}`,
    `Voraussichtlicher Gesamtbetrag: ${formatChf(total)}`,
    "",
    "Bitte bestätige mir Bestand und Endbetrag sowie den nächsten Schritt für meine Lieferadresse.",
  ].join("\r\n");
  const href = lines.length
    ? `mailto:${release.seller.orders}?subject=${encodeURIComponent("Renzo Vibes – Merch-Anfrage")}&body=${encodeURIComponent(message)}`
    : null;
  return { lines, subtotal, total, href, message };
}
