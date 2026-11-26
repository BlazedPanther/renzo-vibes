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
    ? new Intl.DateTimeFormat("de-CH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Zurich",
      }).format(time)
    : "—";
const admin = "/merch-admin";
const stateLabels = {
  awaiting_payment: "wartet auf Zahlung",
  paid_preorder: "bezahlt, offen",
  in_preparation: "in Vorbereitung",
  ready_to_ship: "versandbereit",
  delayed: "verzögert",
  shipped: "verschickt",
  refunded: "zurückerstattet",
  cancelled: "abgebrochen",
  expired: "abgelaufen",
};
const stateLabel = (state) => stateLabels[state] ?? String(state ?? "").replaceAll("_", " ");
const paymentLabel = (status) =>
  ({ paid: "bezahlt", expired: "abgelaufen", pending: "offen" })[status] ?? status;

export function adminPage(
  { orders, stock, mailWaiting, stockMode },
  page,
  status = "",
  reference = "",
) {
  const pageLink = (next) =>
    `${admin}?${new URLSearchParams({ page: String(next), status, reference })}`;
  return `<!doctype html>
<html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Merch-Verwaltung | Renzo Vibes</title>
<style>
:root{color-scheme:dark;font:1rem system-ui;background:#111;color:#fff}
body{max-width:75rem;margin:auto;padding:1rem} h1,h2,a{color:#e5bd68}
section,article{border:1px solid #555;border-radius:.5rem;padding:1rem;margin:1rem 0}
article{background:#181818}
article h3{font-size:.95rem;font-weight:600;color:#bbb;margin:0 0 .5rem;word-break:break-all}
address{font-style:normal;line-height:1.5;margin:.5rem 0;padding:.6rem .8rem;background:#222;border-radius:.35rem;width:fit-content}
form{display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;margin:.5rem 0}
input,select,button{font:inherit;padding:.55rem .7rem;max-width:100%;border-radius:.3rem}
button{background:#e5bd68;color:#111;border:0;font-weight:700;cursor:pointer}
.badge{display:inline-block;padding:.15rem .5rem;border-radius:999px;font-size:.85rem;font-weight:700}
.paid{background:#2f7d32;color:#fff}.open{background:#8a6d1a;color:#fff}.done{background:#444;color:#fff}
nav{display:flex;gap:1rem}
.help{color:#bbb;font-size:.9rem}
</style>
<main>
<h1>Renzo Vibes Merch</h1>
<section>
<h2>Lager</h2>
<p>${
    stockMode === "unlimited-test"
      ? "Testumgebung: unbegrenzter Bestand, hier wird kein echtes Lager geführt."
      : stockMode === "open-preorder"
        ? "Vorbestellungen haben kein Lagerlimit. Bitte die Bestellungen unten mit der bestätigten Liefermenge abgleichen."
        : "Hier Wareneingänge und Verkäufe über andere Kanäle erfassen. Offene Reservationen sind bereits abgezogen."
  }</p>
${
  stockMode !== "tracked"
    ? ""
    : stock
        .map(
          ({ id, name, size, stock: quantity }) => `
<form method="post" action="${admin}/stock">
  <input type="hidden" name="id" value="${html(id)}">
  <input type="hidden" name="mutation" value="${randomUUID()}">
  <strong>${html(name)} · ${html(size)} · ${quantity} verfügbar</strong>
  <label>Änderung <input name="delta" type="number" min="-10000" max="10000" step="1" required></label>
  <label>Grund <select name="reason">
    <option value="received">Ware erhalten</option><option value="external-sale">Verkauf über anderen Kanal</option>
    <option value="correction">Lagerkorrektur</option>
  </select></label>
  <button>Lager ändern</button>
</form>`,
        )
        .join("")
}
</section>
<section>
<h2>Bestellungen</h2><p>Mails in Warteschlange: ${mailWaiting}</p>
<p class="help">Nur Bestellungen mit <span class="badge paid">bezahlt</span> verschicken. Geld zurück immer zuerst in SumUp, danach hier vermerken.</p>
<form method="get" action="${admin}">
 <label>Zahlung <select name="status">
 ${["", "pending", "paid", "expired"].map((value) => `<option value="${value}" ${value === status ? "selected" : ""}>${{ "": "Alle", pending: "offen", paid: "bezahlt", expired: "abgelaufen" }[value]}</option>`).join("")}
 </select></label>
 <label>Bestellnummer <input name="reference" value="${html(reference)}" maxlength="36"></label>
 <button>Filtern</button>
</form>
${
  orders
    .slice(0, 50)
    .map(
      (order) => `<article>
  <h3>${html(order.reference)}</h3>
  ${order.preorder ? `<p><strong>VORBESTELLUNG</strong> · <span class="badge ${order.status === "paid" ? (order.shipped || order.fulfillment === "refunded" ? "done" : "paid") : "open"}">${html(stateLabel(order.fulfillment))}</span></p>` : ""}
  <p>${date(order.created)} · ${money(order.total)} · Zahlung: ${html(
    order.status === "pending"
      ? order.payment === "FAILED"
        ? "Fehlversuch, wartet auf Zahlung oder Ablauf"
        : order.providerId
          ? "offen"
          : "Zahlungsseite nicht bestätigt"
      : paymentLabel(order.status),
  )} · Versand: ${order.shipped ? `Verschickt ${date(order.shipped)}` : "noch nicht verschickt"}</p>
  ${order.status === "pending" && order.expires < Date.now() ? "<p>Zahlungsfrist abgelaufen. Wird noch mit SumUp abgeglichen.</p>" : ""}
  ${
    order.address
      ? `<address>${html(order.address.name)}<br>${html(order.address.street)}<br>
    ${html(order.address.postcode)} ${html(order.address.city)} · CH<br>${html(order.address.email)}</address>`
      : ""
  }
  <ul>${order.items.map(({ name, size, quantity }) => `<li>${quantity} × ${html(name)} · ${html(size)}</li>`).join("")}</ul>
  ${order.gift && order.status === "paid" ? "<p><strong>Ins Paket: 1 Gratis-Autogrammkarte</strong></p>" : ""}
  ${order.tracking ? `<p>Sendungsnummer: ${html(order.tracking)}</p>` : ""}
  ${order.refundRef ? `<p>SumUp-Rückerstattung: ${html(order.refundRef)}</p>` : ""}
  ${order.events?.length ? `<details><summary>Verlauf</summary><ul>${order.events.map(({ state, created }) => `<li>${date(created)} · ${html(stateLabel(state))}</li>`).join("")}</ul></details>` : ""}
  ${
    order.preorder && order.status === "paid" && order.fulfillment !== "refunded"
      ? `
    <form method="post" action="${admin}/ship">
    <input type="hidden" name="id" value="${html(order.reference)}">
    <label>Status <select name="state">${order.shipped ? "" : '<option value="in_preparation">In Vorbereitung (Mail an Kunde)</option><option value="ready_to_ship">Versandbereit (keine Mail)</option><option value="delayed">Verzögert (Mail an Kunde)</option><option value="shipped">Verschickt (Mail an Kunde)</option>'}
    <option value="refunded">In SumUp bereits zurückerstattet (Mail an Kunde)</option></select></label>
    ${order.shipped ? "" : '<label>Sendungsnummer (nur bei Verschickt) <input name="tracking" maxlength="80"></label>'}
    <label>SumUp-Rückerstattungsnr. (nur bei Rückerstattung) <input name="refundRef" maxlength="80"></label>
    <button>Speichern</button>
    </form>`
      : ""
  }
  ${
    !order.preorder && order.status === "paid" && !order.shipped
      ? `<form method="post" action="${admin}/ship">
    <input type="hidden" name="id" value="${html(order.reference)}"><button>Als verschickt markieren</button>
  </form>`
      : ""
  }
</article>`,
    )
    .join("") || "<p>Noch keine Bestellungen.</p>"
}
<nav>${page ? `<a href="${html(pageLink(page - 1))}">Neuere</a>` : ""}
${orders.length > 50 ? `<a href="${html(pageLink(page + 1))}">Ältere</a>` : ""}</nav>
</section></main></html>`;
}
