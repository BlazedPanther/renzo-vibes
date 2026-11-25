export const merchLegalSections = {
  imprint: "Impressum",
  privacy: "Datenschutz",
  payment: "Bestellung und Zahlung",
  delivery: "Versand",
  returns: "Storno, Rückgabe und Mängel",
};

export type MerchLegal = Record<keyof typeof merchLegalSections, string>;
