// Designed avatars: a face built from parts, stored in profiles.avatar as "d:" + 7 base-36 characters
// (background, skin, hair style, hair colour, eyes, mouth, extra). Same parts, same picture, everywhere on the site.
export const DESIGN_BG = ["#dff0d6", "#e8f2dc", "#f3ead9", "#e2ecf6", "#fbe4ec", "#efe4f2", "#f6e6d6", "#dcefe6"];
export const DESIGN_SKIN = ["#fde3cf", "#f6cfae", "#e9b58a", "#cf9468", "#a8714a", "#7d5236", "#5a3a28", "#f8d9c4"];
export const DESIGN_HAIR = ["#2b2118", "#5a3a24", "#9a6a3a", "#d9b46a", "#b5472f", "#8a8a92", "#3f7d3a", "#c0577a", "#e9d8a6", "#3a6ab0", "#7a4a8a", "#1c1c22"];
export const HAIR_STYLES = ["None", "Short", "Long", "Bun", "Bob", "Curly", "Cap", "Bamboo hat", "Headband", "Beret", "Ponytail", "Pigtails", "Pixie", "Space buns", "Long wavy", "Braid", "Buzz cut", "Side part", "Slicked back", "Man bun", "Mohawk", "Pompadour", "Beanie", "Bucket hat", "Undercut"];
export const EYES = ["Dots", "Happy", "Wide", "Sleepy", "Round glasses", "Sunglasses", "Lashes", "Wink", "Cat-eye glasses", "Aviators", "Heart sunglasses", "Square glasses"];
export const MOUTHS = ["Smile", "Grin", "Flat", "Open", "Small", "Smirk", "Lipstick", "Kiss", "Tongue out"];
export const EXTRAS = ["None", "Matcha cup", "Whisk", "Leaf", "Blush", "Sparkles", "Earrings", "Flower", "Bow", "Headphones", "Freckles", "Cat ears", "Stubble", "Beard", "Moustache", "Goatee"];
export const DESIGN_SIZES = [DESIGN_BG.length, DESIGN_SKIN.length, HAIR_STYLES.length, DESIGN_HAIR.length, EYES.length, MOUTHS.length, EXTRAS.length] as const;
export type DesignParts = [number, number, number, number, number, number, number];

// Full-body figure: what the avatar wears. Stored as two optional extra characters after the seven face parts (style, colour);
// older codes without them mean "matcha-green robe".
export const OUTFIT_STYLES = ["Robe", "Apron", "Hoodie", "T-shirt", "Jacket", "Dress", "Skirt & top", "Sweater", "Overalls", "Tank top", "Button-up", "Polo", "Suit & tie", "Cardigan", "Tracksuit"];
export const OUTFIT_COLORS = ["#3f7d3a", "#2f5d8a", "#b5472f", "#7a4a8a", "#d9b46a", "#2b2b33", "#c0577a", "#e9e4d6", "#f2a0b8", "#8fbf7a", "#3a8a8a", "#e8863a"];
export const SHOE_STYLES = ["Classic", "Sneakers", "High-tops", "Boots", "Heels", "Sandals", "Loafers", "Slippers"];
export const SHOE_COLORS = ["#5a4330", "#f4efe4", "#2b2b33", "#b5472f", "#2f5d8a", "#c0577a", "#3f7d3a", "#d9b46a"];
export const RETIRED_EXTRAS = [1]; // the matcha cup; kept as a reserved slot so saved avatars still decode, but it no longer shows or can be picked
export type Outfit = [number, number, number, number];

export const designCode = (p: DesignParts, o: Outfit = [0, 0, 0, 0]): string => "d:" + p.map((n) => n.toString(36)).join("") + (o[2] !== 0 || o[3] !== 0 ? o.map((n) => n.toString(36)).join("") : o[0] === 0 && o[1] === 0 ? "" : [o[0], o[1]].map((n) => n.toString(36)).join(""));
export function parseDesign(code?: string | null): DesignParts | null {
  if (!code || !/^d:[0-9a-z]{7}([0-9a-z]{2}|[0-9a-z]{4})?$/.test(code)) return null;
  const p = code.slice(2, 9).split("").map((c) => parseInt(c, 36)) as DesignParts;
  return p.every((n, i) => n < DESIGN_SIZES[i]) ? p : null;
}
export function parseOutfit(code?: string | null): Outfit {
  if (!code || !/^d:[0-9a-z]{9}([0-9a-z]{2})?$/.test(code)) return [0, 0, 0, 0];
  const s = parseInt(code[9], 36), c = parseInt(code[10], 36);
  const hs = code.length > 11 ? parseInt(code[11], 36) : 0, hc = code.length > 12 ? parseInt(code[12], 36) : 0;
  if (s >= OUTFIT_STYLES.length || c >= OUTFIT_COLORS.length) return [0, 0, 0, 0];
  return hs < SHOE_STYLES.length && hc < SHOE_COLORS.length ? [s, c, hs, hc] : [s, c, 0, 0];
}
export const randomDesign = (): DesignParts => {
  const p = DESIGN_SIZES.map((n) => Math.floor(Math.random() * n)) as unknown as DesignParts;
  if (RETIRED_EXTRAS.includes(p[6])) p[6] = 0;
  return p;
};
