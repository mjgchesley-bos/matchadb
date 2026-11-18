// Designed avatars: a face built from parts, stored in profiles.avatar as "d:" + 7 base-36 characters
// (background, skin, hair style, hair colour, eyes, mouth, extra). Same parts, same picture, everywhere on the site.
export const DESIGN_BG = ["#dff0d6", "#e8f2dc", "#f3ead9", "#e2ecf6", "#fbe4ec", "#efe4f2", "#f6e6d6", "#dcefe6"];
export const DESIGN_SKIN = ["#fde3cf", "#f6cfae", "#e9b58a", "#cf9468", "#a8714a", "#7d5236", "#5a3a28", "#f8d9c4"];
export const DESIGN_HAIR = ["#2b2118", "#5a3a24", "#9a6a3a", "#d9b46a", "#b5472f", "#8a8a92", "#3f7d3a", "#c0577a"];
export const HAIR_STYLES = ["None", "Short", "Long", "Bun", "Bob", "Curly", "Cap", "Bamboo hat", "Headband", "Beret"];
export const EYES = ["Dots", "Happy", "Wide", "Sleepy", "Round glasses", "Sunglasses"];
export const MOUTHS = ["Smile", "Grin", "Flat", "Open", "Small", "Smirk"];
export const EXTRAS = ["None", "Matcha cup", "Whisk", "Leaf", "Blush", "Sparkles"];
export const DESIGN_SIZES = [DESIGN_BG.length, DESIGN_SKIN.length, HAIR_STYLES.length, DESIGN_HAIR.length, EYES.length, MOUTHS.length, EXTRAS.length] as const;
export type DesignParts = [number, number, number, number, number, number, number];

export const designCode = (p: DesignParts): string => "d:" + p.map((n) => n.toString(36)).join("");
export function parseDesign(code?: string | null): DesignParts | null {
  if (!code || !/^d:[0-9a-z]{7}$/.test(code)) return null;
  const p = code.slice(2).split("").map((c) => parseInt(c, 36)) as DesignParts;
  return p.every((n, i) => n < DESIGN_SIZES[i]) ? p : null;
}
export const randomDesign = (): DesignParts => DESIGN_SIZES.map((n) => Math.floor(Math.random() * n)) as unknown as DesignParts;
