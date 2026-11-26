import { preorderNotice } from "./campaign.mjs";

const money = (cents) => `CHF ${(cents / 100).toFixed(2)}`;
const subjects = {
  paid: "Payment confirmed",
  merchant_paid: "New paid order",
  received: "Order received",
  in_preparation: "In preparation",
  shipped: "Order shipped",
  delayed: "Order delayed",
  refunded: "Refund recorded",
};

export function createMailer({
  key,
  from,
  replyTo,
  testRecipient,
  merchantRecipient,
  adminUrl,
  fetcher = fetch,
}) {
  return async ({ kind, orderId, address, items, total, shipping, preorder, gift, tracking }) => {
    const subject = subjects[kind] ?? subjects.received;
    const recipient =
      testRecipient ?? (kind === "merchant_paid" ? merchantRecipient : address.email);
    if (!recipient) throw new Error("Missing order email recipient");
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `merch/${orderId}/${kind}`,
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        reply_to: replyTo,
        subject: `${testRecipient ? "[Sandbox] " : ""}Renzo Vibes – ${preorder ? "Pre-order · " : ""}${subject}`,
        text: [
          `${subject} · ${orderId}`,
          ...(kind === "paid" ? ["Your payment has been verified."] : []),
          ...(kind === "merchant_paid"
            ? [
                "Open the protected shop admin to fulfil this order.",
                ...(adminUrl ? [`${adminUrl}?reference=${encodeURIComponent(orderId)}`] : []),
              ]
            : []),
          ...(preorder && ["received", "paid", "delayed"].includes(kind) ? [preorderNotice] : []),
          ...(kind === "shipped" && tracking ? [`Tracking: ${tracking}`] : []),
          "",
          ...items.map(
            ({ name, size, quantity, price }) =>
              `${quantity} × ${name} (${size}) – ${money(price * quantity)}`,
          ),
          `Shipping: ${money(shipping)}`,
          ...(gift ? ["1 × Free Renzo Vibes autograph card – CHF 0.00"] : []),
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
