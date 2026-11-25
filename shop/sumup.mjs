const api = "https://api.sumup.com";
const checkouts = "/v0.1/checkouts";
const checkoutPath = (id) => checkouts + "/" + encodeURIComponent(id);

export async function createSumUpProvider({ key, merchant, mode, fetcher = fetch }) {
  const sandbox = mode === "sandbox" || mode === "local-sandbox";
  if (
    !["live", "sandbox", "local-sandbox"].includes(mode) ||
    !key ||
    !/^[A-Z0-9]{6,24}$/.test(merchant ?? "")
  ) {
    throw new Error("Invalid SumUp credentials or mode");
  }

  async function request(path, { method = "GET", body } = {}) {
    const response = await fetcher(api + path, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: body && JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      const error = new Error(`SumUp API returned HTTP ${response.status}`);
      error.status = response.status;
      error.checkoutRejected =
        method === "POST" && path === checkouts && [400, 401, 403].includes(response.status);
      throw error;
    }
    return response.json();
  }

  const profile = await request(`/v1/merchants/${merchant}`);
  if (profile.sandbox !== sandbox || profile.merchant_code !== merchant) {
    throw new Error(
      `SumUp merchant was not verified as a ${sandbox ? "sandbox" : "live"} merchant`,
    );
  }
  if (mode !== "local-sandbox" && (profile.country !== "CH" || profile.default_currency !== "CHF"))
    throw new Error("SumUp merchant was not verified for Switzerland and CHF");
  if (mode !== "local-sandbox") {
    await request(checkouts + "?checkout_reference=renzo-vibes-readiness-check");
  }

  function validate(checkout, order) {
    if (
      typeof checkout.amount !== "number" ||
      checkout.amount !== order.total / 100 ||
      checkout.currency !== "CHF" ||
      checkout.checkout_reference !== order.id ||
      checkout.merchant_code !== merchant ||
      !/^[a-zA-Z0-9-]{1,100}$/.test(checkout.id ?? "") ||
      !["PAID", "PENDING", "FAILED", "EXPIRED"].includes(checkout.status) ||
      (order.providerId && checkout.id !== order.providerId)
    )
      throw new Error("SumUp checkout does not match the order");
    const url = checkout.hosted_checkout_url ? new URL(checkout.hosted_checkout_url) : null;
    if (
      url &&
      (url.origin !== "https://checkout.sumup.com" ||
        url.username ||
        url.password ||
        !/^\/pay\/[a-zA-Z0-9-]+$/.test(url.pathname))
    )
      throw new Error("Unexpected SumUp checkout URL");
    return { id: checkout.id, status: checkout.status, url: url?.href };
  }

  async function get(order) {
    if (order.providerId) return validate(await request(checkoutPath(order.providerId)), order);
    const matches = await request(
      checkouts + "?checkout_reference=" + encodeURIComponent(order.id),
    );
    if (!Array.isArray(matches) || matches.length > 1)
      throw new Error("Unexpected SumUp search result");
    return matches.length ? validate(matches[0], order) : null;
  }

  return {
    async create(order, returnUrl, webhookUrl) {
      return validate(
        await request(checkouts, {
          method: "POST",
          body: {
            checkout_reference: order.id,
            amount: order.total / 100,
            currency: "CHF",
            merchant_code: merchant,
            description: sandbox ? "Renzo Vibes sandbox" : "Renzo Vibes merch",
            valid_until: new Date(order.expires).toISOString(),
            hosted_checkout: { enabled: true },
            redirect_url: returnUrl,
            ...(webhookUrl && { return_url: webhookUrl }),
          },
        }),
        order,
      );
    },
    get,
    async cancel(order) {
      try {
        return validate(await request(checkoutPath(order.providerId), { method: "DELETE" }), order);
      } catch (error) {
        // A payment may have won the race with deactivation. Verify the latest state.
        if (error.status === 409 || error.status === 404) return get(order);
        throw error;
      }
    },
  };
}

export function createSumUpSandboxProvider(options) {
  return createSumUpProvider({ ...options, mode: "local-sandbox" });
}
