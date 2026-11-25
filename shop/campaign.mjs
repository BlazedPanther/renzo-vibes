// Zurich is on CET on both dates. Explicit offsets keep the boundary independent of host timezone.
export const blackFridayStart = Date.parse("2026-11-27T00:00:00+01:00");
export const blackFridayEnd = Date.parse("2026-12-04T00:00:00+01:00");
export const blackFridayActive = (time) => time >= blackFridayStart && time < blackFridayEnd;
export const autographCard = {
  name: "Free Renzo Vibes autograph card",
  image: "black-friday-2026/autograph-card-front.webp",
};
export const preorderNotice =
  "This is a pre-order. The shipping date is pending confirmation. We’ll send updates by email.";
