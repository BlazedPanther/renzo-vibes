// Zurich is on CET on both dates. Explicit offsets keep the boundary independent of host timezone.
export const blackFridayStart = Date.parse("2026-11-27T00:00:00+01:00");
export const blackFridayEnd = Date.parse("2026-12-04T00:00:00+01:00");
export const blackFridayActive = (time) => time >= blackFridayStart && time < blackFridayEnd;
export const autographCard = {
  name: "Gratis Renzo Vibes Autogrammkarte",
  image: "black-friday-2026/autograph-card-front.webp",
};
export const preorderNotice =
  "Vorbestellung — nicht sofort lieferbar. Ein Versandtermin steht derzeit noch nicht fest. Wir informieren dich per E-Mail über den Status.";
