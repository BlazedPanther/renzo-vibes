const api = "https://api.sumup.com";

export async function createSumUpSandboxProvider({ key, merchant, fetcher = fetch }) {
  if (!key || !/^[A-Z0-9]{6,24}$/.test(merchant ?? ""))
    throw new Error("Invalid sandbox credentials");

  async function request(path, body) {
    const response = await fetcher(api + path, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: body && JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`SumUp API returned HTTP ${response.status}`);
    return response.json();
  }

  const profile = await request(`/v1/merchants/${merchant}`);
  if (profile.sandbox !== true || profile.merchant_code !== merchant) {
    throw new Error("SumUp merchant was not verified as a sandbox");
  }

  function validate(checkout, order) {
    if (
      typeof checkout.amount !== "number" ||
      checkout.amount !== order.total / 100 ||
      checkout.currency !== "CHF" ||
      checkout.checkout_reference !== order.id ||
      checkout.merchant_code !== merchant ||
      typeof checkout.id !== "string" ||
      (order.providerId && checkout.id !== order.providerId)
    ) {
      throw new Error("SumUp checkout does not match the order");
    }
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

  return {
    async create(order, returnUrl) {
      return validate(
        await request("/v0.1/checkouts", {
          checkout_reference: order.id,
          amount: order.total / 100,
          currency: "CHF",
          merchant_code: merchant,
          description: "Renzo Vibes sandbox",
          valid_until: new Date(order.expires).toISOString(),
          hosted_checkout: { enabled: true },
          redirect_url: returnUrl,
        }),
        order,
      );
    },
    async get(order) {
      if (order.providerId) {
        return validate(
          await request(`/v0.1/checkouts/${encodeURIComponent(order.providerId)}`),
          order,
        );
      }
      const matches = await request(
        `/v0.1/checkouts?checkout_reference=${encodeURIComponent(order.id)}`,
      );
      if (!Array.isArray(matches) || matches.length > 1)
        throw new Error("Unexpected SumUp search result");
      return matches.length ? validate(matches[0], order) : null;
    },
  };
}
