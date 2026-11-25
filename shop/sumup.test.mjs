import assert from "node:assert/strict";
import { test } from "node:test";
import { createSumUpSandboxProvider } from "./sumup.mjs";

const merchant = "M1234567";
const order = { id: "local-order", total: 5300, expires: Date.UTC(2027, 0, 1) };
const merchantResponse = { merchant_code: merchant, sandbox: true };
const checkout = {
  id: "sumup-id",
  merchant_code: merchant,
  checkout_reference: order.id,
  amount: 53,
  currency: "CHF",
  hosted_checkout_url: "https://checkout.sumup.com/pay/hosted-id",
  status: "PENDING",
};

test("SumUp adapter refuses production merchants before any write", async () => {
  const calls = [];
  await assert.rejects(
    createSumUpSandboxProvider({
      key: "test-key",
      merchant,
      fetcher: async (url, options) => {
        calls.push([url, options.method]);
        return Response.json({ ...merchantResponse, sandbox: false });
      },
    }),
    /verified as a sandbox/,
  );
  assert.deepEqual(calls, [[`https://api.sumup.com/v1/merchants/${merchant}`, "GET"]]);
});

test("SumUp adapter creates CHF Hosted Checkout and verifies payment independently", async () => {
  const calls = [];
  const provider = await createSumUpSandboxProvider({
    key: "test-key",
    merchant,
    fetcher: async (url, options) => {
      calls.push({ url, options });
      if (calls.length === 1) return Response.json(merchantResponse);
      return Response.json(calls.length === 2 ? checkout : { ...checkout, status: "PAID" });
    },
  });
  const created = await provider.create(order, "http://localhost:5173/merch");
  assert.equal(created.url, checkout.hosted_checkout_url);
  const payload = JSON.parse(calls[1].options.body);
  assert.equal(payload.checkout_reference, order.id);
  assert.equal(payload.amount, 53);
  assert.equal(payload.currency, "CHF");
  assert.deepEqual(payload.hosted_checkout, { enabled: true });
  assert.equal(payload.valid_until, "2027-01-01T00:00:00.000Z");
  assert.equal(calls[1].options.redirect, "error");
  assert.equal((await provider.get({ ...order, providerId: created.id })).status, "PAID");
  assert.match(calls[2].url, /\/v0\.1\/checkouts\/sumup-id$/);
});

test("SumUp adapter rejects mismatched payment totals, references, merchants and unsafe URLs", async () => {
  for (const override of [
    { amount: 1 },
    { currency: "EUR" },
    { checkout_reference: "other" },
    { merchant_code: "OTHER" },
    { hosted_checkout_url: "https://checkout.sumup.com.example.test/pay/42" },
  ]) {
    const provider = await createSumUpSandboxProvider({
      key: "test-key",
      merchant,
      fetcher: async (url) =>
        Response.json(
          url.includes("/merchants/") ? merchantResponse : { ...checkout, ...override },
        ),
    });
    await assert.rejects(provider.create(order), /does not match|Unexpected/);
  }
});
