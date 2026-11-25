const money = (cents) => `CHF ${(cents / 100).toFixed(2)}`;

export function createMailer({ key, from, replyTo, fetcher = fetch }) {
  return async ({ kind, orderId, address, items, total, shipping }) => {
    const subject = kind === "paid" ? "Payment confirmed" : "Order received";
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `merch/${orderId}/${kind}`,
      },
      body: JSON.stringify({
        from,
        to: [address.email],
        reply_to: replyTo,
        subject: `Renzo Vibes – ${subject}`,
        text: [
          `${subject} · ${orderId}`,
          kind === "paid"
            ? "Your payment has been verified."
            : "Check payment status on the shop page.",
          "",
          ...items.map(
            ({ name, size, quantity, price }) =>
              `${quantity} × ${name} (${size}) – ${money(price * quantity)}`,
          ),
          `Shipping: ${money(shipping)}`,
          `Total: ${money(total)}`,
          "",
          "Switzerland",
        ].join("\n"),
      }),
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Email API returned HTTP ${response.status}`);
    await response.body?.cancel();
  };
}
