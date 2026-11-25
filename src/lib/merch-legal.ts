export const merchLegalSections = {
  imprint: "Seller information",
  privacy: "Privacy policy",
  payment: "Ordering and payment",
  delivery: "Shipping",
  returns: "Cancellations, returns and faulty goods",
};

export type MerchLegal = Record<keyof typeof merchLegalSections, string>;
