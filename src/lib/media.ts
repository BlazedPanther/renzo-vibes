/**
 * Lokale Medien (ersetzen die Lovable-Asset-Pointer `*.asset.json`).
 * Dateien liegen in public/media/ und werden NICHT mit dem Repo geliefert, solange die
 * Nutzungsrechte nicht geklärt sind – siehe MEDIA.md und `npm run fetch-media`.
 */
const base = import.meta.env.BASE_URL;
const media = (file: string) => ({ url: `${base}media/${file}` });

export const mediaFiles = {
  portrait: media("renzo-portrait.webp"),
  logo: media("renzo-vibes-logo.png"),
  hero: media("renzo-hero.webp"),
  cover: media("renzo-cover.webp"),
  // Merch: freigestellt, alle auf gleich grosser quadratischer Fläche (siehe scripts/merch-images.md)
  merchPowPowTee: media("merch-pow-pow-tee.webp"),
  merchPowPowHoodie: media("merch-pow-pow-hoodie.webp"),
  merchGoatTeeFront: media("merch-goat-tee-front.webp"),
  merchGoatTeeBack: media("merch-goat-tee-back.webp"),
  merchPurpleHoodieFront: media("merch-purple-hoodie-front.webp"),
  merchPurpleHoodieBack: media("merch-purple-hoodie-back.webp"),
};
