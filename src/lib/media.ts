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
  shirt: media("pow-pow-shirt.webp"),
  hoodie: media("pow-pow-hoodie.png"),
  goatShirt: media("renzo-goat-shirt.png"),
  hero: media("renzo-hero.webp"),
  cover: media("renzo-cover.webp"),
  hoodie2: media("renzo-hoodie.webp"),
  purpleHoodieFront: media("rv-purple-hoodie-front.webp"),
  purpleHoodieBack: media("rv-purple-hoodie-back.webp"),
};
