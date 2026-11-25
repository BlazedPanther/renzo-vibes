import { randomUUID } from "node:crypto";

const html = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character],
  );
const money = (cents) => `CHF ${(cents / 100).toFixed(2)}`;
const date = (time) =>
  time
    ? new Intl.DateTimeFormat("en-CH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Zurich",
      }).format(time)
    : "—";
const admin = "/merch-admin";

export function adminPage(
  { orders, stock, mailWaiting, stockMode },
  page,
  status = "",
  reference = "",
) {
  const pageLink = (next) =>
    `${admin}?${new URLSearchParams({ page: String(next), status, reference })}`;
  return `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Merch administration | Renzo Vibes</title>
<style>
:root{color-scheme:dark;font:1rem system-ui;background:#111;color:#fff}
body{max-width:75rem;margin:auto;padding:1rem} h1,h2,a{color:#e5bd68}
section,article{border:1px solid #555;border-radius:.35rem;padding:1rem;margin:1rem 0}
form{display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;margin:.5rem 0}
input,select,button{font:inherit;padding:.45rem;max-width:100%}
nav{display:flex;gap:1rem}
</style>
<main>
<h1>Renzo Vibes Merch</h1>
<section>
<h2>Available stock</h2>
<p>${
    stockMode === "unlimited-test"
      ? "Sandbox availability is unlimited. No physical stock is recorded here."
      : "Record receipts and other-channel sales here. Available quantities exclude open reservations."
  }</p>
${
  stockMode === "unlimited-test"
    ? ""
    : stock
        .map(
          ({ id, name, size, stock: quantity }) => `
<form method="post" action="${admin}/stock">
  <input type="hidden" name="id" value="${html(id)}">
  <input type="hidden" name="mutation" value="${randomUUID()}">
  <strong>${html(name)} · ${html(size)} · ${quantity} available</strong>
  <label>Change <input name="delta" type="number" min="-10000" max="10000" step="1" required></label>
  <label>Reason <select name="reason">
    <option value="received">Stock received</option><option value="external-sale">Other-channel sale</option>
    <option value="correction">Stock correction</option>
  </select></label>
  <button>Record stock change</button>
</form>`,
        )
        .join("")
}
</section>
<section>
<h2>Orders</h2><p>Confirmation emails queued: ${mailWaiting}</p>
<form method="get" action="${admin}">
 <label>Payment <select name="status">
 ${["", "pending", "paid", "expired"].map((value) => `<option value="${value}" ${value === status ? "selected" : ""}>${value || "All"}</option>`).join("")}
 </select></label>
 <label>Order reference <input name="reference" value="${html(reference)}" maxlength="36"></label>
 <button>Filter orders</button>
</form>
${
  orders
    .slice(0, 50)
    .map(
      (order) => `<article>
  <h3>${html(order.reference)}</h3>
  ${order.preorder ? `<p><strong>VORBESTELLUNG</strong> · ${html(order.fulfillment?.replaceAll("_", " "))}</p>` : ""}
  <p>${date(order.created)} · ${money(order.total)} · Payment: ${html(
    order.status === "pending"
      ? order.payment === "FAILED"
        ? "Failed attempt, awaiting payment or expiry"
        : order.providerId
          ? "Pending"
          : "Checkout creation unconfirmed"
      : order.status,
  )} · Shipping: ${order.shipped ? `Sent ${date(order.shipped)}` : "Not shipped"}</p>
  ${order.status === "pending" && order.expires < Date.now() ? "<p>Past payment window. Reservation held pending provider verification.</p>" : ""}
  ${
    order.address
      ? `<address>${html(order.address.name)}<br>${html(order.address.street)}<br>
    ${html(order.address.postcode)} ${html(order.address.city)} · CH<br>${html(order.address.email)}</address>`
      : ""
  }
  <ul>${order.items.map(({ name, size, quantity }) => `<li>${quantity} × ${html(name)} · ${html(size)}</li>`).join("")}</ul>
  ${order.gift && order.status === "paid" ? "<p>Packliste: 1 Gratis-Autogrammkarte · CHF 0.00</p>" : ""}
  ${order.tracking ? `<p>Tracking: ${html(order.tracking)}</p>` : ""}
  ${order.refundRef ? `<p>SumUp refund reference: ${html(order.refundRef)}</p>` : ""}
  ${order.events?.length ? `<details><summary>Status history</summary><ul>${order.events.map(({ state, created }) => `<li>${date(created)} · ${html(state.replaceAll("_", " "))}</li>`).join("")}</ul></details>` : ""}
  ${
    order.preorder && order.status === "paid" && order.fulfillment !== "refunded"
      ? `
    <form method="post" action="${admin}/ship">
    <input type="hidden" name="id" value="${html(order.reference)}">
    <label>Fulfillment <select name="state">${order.shipped ? "" : '<option value="in_preparation">In preparation</option><option value="ready_to_ship">Ready to ship</option><option value="delayed">Delayed</option><option value="shipped">Shipped</option>'}
    <option value="refunded">Refund already completed in SumUp</option></select></label>
    ${order.shipped ? "" : '<label>Tracking when shipping <input name="tracking" maxlength="80"></label>'}
    <label>SumUp refund reference <input name="refundRef" maxlength="80"></label>
    <button>Save fulfillment</button>
    </form>`
      : ""
  }
  ${
    !order.preorder && order.status === "paid" && !order.shipped
      ? `<form method="post" action="${admin}/ship">
    <input type="hidden" name="id" value="${html(order.reference)}"><button>Mark as shipped</button>
  </form>`
      : ""
  }
</article>`,
    )
    .join("") || "<p>No orders yet.</p>"
}
<nav>${page ? `<a href="${html(pageLink(page - 1))}">Newer</a>` : ""}
${orders.length > 50 ? `<a href="${html(pageLink(page + 1))}">Older</a>` : ""}</nav>
</section></main></html>`;
}
