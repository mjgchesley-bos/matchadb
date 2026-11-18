import type { Cafe } from "@/lib/cafe-types";

// A clean "Matcha Latte $7" pulled from the quotes we saved from a café's own menu, for its search snippet.
// Deliberately strict: an item name of 1-4 capitalised words that includes "matcha", followed straight away by a
// price. Anything that does not match that shape returns null and the page uses its plain description instead.
const WORD = "[A-Z][A-Za-z'’&.-]{1,18}";
const ITEM = new RegExp(`((?:${WORD}\\s){0,2}Matcha(?:\\s(?:${WORD}|&|and|with)){0,3})\\s*[-–:·.]?\\s*\\$\\s?(\\d{1,2}(?:\\.\\d{2})?)(?![\\d.])`);
// Words that mean the "item" is really page chrome or a shop product, not a drink.
const BAD = /add to|cart|powder|tin\b|sale|regular price|mix\b|bag\b|ceremonial grade|order|menu\b|share|login|cookie|shipping|gift|subscribe|ounce|\boz\b|gram|\bg\b|kit\b|whisk|bowl|unavailable|organic|pure|blend|drinks?|sold out|special|show more|more/i;
// Real menu items end in one of these (or are plain "Matcha"), so a stray product name or page heading is dropped.
const END = /(matcha|latte|tea|smoothie|lemonade|frappe|frappuccino|cappuccino|cupcake|cookie|loaf|madeleine|madeline|tiramisu|croissant|muffin|scone|donut|doughnut|cake|shake|float|spritz|refresher|cold foam|affogato)$/i;

export type MatchaItem = { name: string; price: string };

export function matchaItem(c: Pick<Cafe, "ev" | "shared">): MatchaItem | null {
  if (c.shared > 1) return null; // the menu belongs to a shared site; prices and items may not be this location's
  const evs = [...c.ev].filter((e) => e.st >= 2).sort((a, b) => b.st - a.st || b.n - a.n);
  for (const e of evs) {
    for (const s of e.s) {
      const m = ITEM.exec(s);
      if (!m) continue;
      const name = m[1].replace(/\s+/g, " ").trim();
      if (BAD.test(name) || !END.test(name) || name.length > 40) continue;
      if ((name.match(/matcha/gi) ?? []).length > 1) continue;
      const price = Number(m[2]);
      if (!(price >= 2 && price <= 15)) continue;
      return { name, price: `$${m[2].includes(".") ? price.toFixed(2).replace(/\.00$/, "") : price}` };
    }
  }
  return null;
}
