export type MerchRelease = {
  seller: { name: string; address: string; orders: string; privacy: string; registration?: string };
  delivery: { rappen: number; estimate: string };
  returns: string;
  cancellations: string;
  retention: string;
  mailProcessing: string;
  products: {
    id: string;
    name: string;
    color: string;
    variants: { id: string; size: string; rappen: number; quantity: number }[];
  }[];
};

// Populate only after the seller has confirmed the complete offer and approved publication.
export const merchRelease: MerchRelease | null = null;
export const nativeMerchShop: string | null = null;

export function checkNativeMerchShop(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*\.sumupstore\.com$/.test(url.hostname)
  ) {
    throw new Error("Merch: eine geprüfte öffentliche SumUp-Store-Adresse ist erforderlich.");
  }
}

const email = /^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$/;
const filled = (value: string) => value.trim().length > 0 && !/TODO|\[.+\]/i.test(value);
const whole = (number: number, min: number, max: number) =>
  Number.isSafeInteger(number) && number >= min && number <= max;

export function checkMerchRelease(release: MerchRelease) {
  const { seller, delivery, products } = release;
  if (
    ![
      seller.name,
      seller.address,
      delivery.estimate,
      release.returns,
      release.cancellations,
      release.retention,
      release.mailProcessing,
    ].every(filled) ||
    !email.test(seller.orders) ||
    !email.test(seller.privacy) ||
    !whole(delivery.rappen, 0, 100_000) ||
    !products.length
  )
    throw new Error("Merch: Verkäufer-, Versand-, Rückgabe- oder Datenschutzangaben fehlen.");
  const productIds = new Set<string>();
  const variantIds = new Set<string>();
  for (const product of products) {
    if (
      !filled(product.name) ||
      !filled(product.color) ||
      !filled(product.id) ||
      productIds.has(product.id) ||
      !product.variants.length
    ) {
      throw new Error("Merch: Produktangaben oder eindeutige Produkt-ID fehlen.");
    }
    productIds.add(product.id);
    for (const variant of product.variants) {
      if (
        !filled(variant.id) ||
        !filled(variant.size) ||
        variantIds.has(variant.id) ||
        !whole(variant.rappen, 1, 100_000) ||
        !whole(variant.quantity, 0, 100_000)
      ) {
        throw new Error("Merch: Variante, CHF-Endpreis oder Anfangsbestand ist ungültig.");
      }
      variantIds.add(variant.id);
    }
  }
}
