import { describe, expect, it } from "vitest";
import { checkMerchRelease, checkNativeMerchShop, type MerchRelease } from "@/config/merch-release";
import { prepareMerchRequest } from "@/lib/merch-request";

const fixture: MerchRelease = {
  seller: {
    name: "Demo seller",
    address: "Teststrasse 1, 8000 Zürich",
    orders: "orders@example.test",
    privacy: "privacy@example.test",
  },
  delivery: { rappen: 850, estimate: "Test delivery estimate" },
  returns: "Test return conditions",
  cancellations: "Test cancellation conditions",
  retention: "Test retention statement",
  mailProcessing: "Test recipients and countries",
  products: [
    {
      id: "hoodie",
      name: "Test-Hoodie",
      color: "Violett",
      variants: [{ id: "hoodie-m", size: "M", rappen: 4500, quantity: 2 }],
    },
    {
      id: "shirt",
      name: "Test-Shirt",
      color: "Schwarz",
      variants: [
        { id: "shirt-l", size: "L", rappen: 2500, quantity: 1 },
        { id: "shirt-xl", size: "XL", rappen: 2500, quantity: 0 },
      ],
    },
  ],
};

describe("Merch-Anfragen", () => {
  it("berechnet den CHF-Gesamtbetrag und bereitet eine unverbindliche E-Mail vor", () => {
    checkMerchRelease(fixture);
    const request = prepareMerchRequest(fixture, { "hoodie-m": 2, "shirt-l": 1 });
    expect(request.subtotal).toBe(11500);
    expect(request.total).toBe(12350);
    const email = new URL(request.href!);
    expect(email.pathname).toBe(fixture.seller.orders);
    expect(email.searchParams.get("subject")).toBe("Renzo Vibes – Merch-Anfrage");
    expect(email.searchParams.get("body")).toContain("2 × Test-Hoodie, Violett, M");
    expect(email.searchParams.get("body")).toContain("CHF 123.50");
    expect(prepareMerchRequest(fixture, {}).href).toBeNull();
  });

  it("weist unbekannte Varianten, ausverkaufte Grössen und zu hohe Mengen ab", () => {
    for (const selection of [
      { unknown: 1 },
      { "shirt-xl": 1 },
      { "hoodie-m": 3 },
      { "hoodie-m": 0.5 },
    ]) {
      expect(() => prepareMerchRequest(fixture, selection as Record<string, number>)).toThrow();
    }
  });

  it("sperrt unvollständige Händlerangaben und manipulierte E-Mail-Empfänger", () => {
    expect(() => checkMerchRelease({ ...fixture, returns: "TODO" })).toThrow();
    expect(() =>
      checkMerchRelease({ ...fixture, delivery: { ...fixture.delivery, rappen: -1 } }),
    ).toThrow();
    expect(() =>
      checkMerchRelease({
        ...fixture,
        seller: { ...fixture.seller, orders: "a@example.test?bcc=b@example.test" },
      }),
    ).toThrow();
  });

  it("lässt nur sichere native Store-Adressen zu", () => {
    expect(() => checkNativeMerchShop("https://demo-store.sumupstore.com/")).not.toThrow();
    for (const url of [
      "https://sumupstore.com.example.test/",
      "http://demo.sumupstore.com/",
      "https://evil@demo.sumupstore.com/",
      "https://demo.sumupstore.com/?redirect=example.test",
    ]) {
      expect(() => checkNativeMerchShop(url)).toThrow();
    }
  });
});
