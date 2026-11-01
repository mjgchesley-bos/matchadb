// How prices are compared across the site. Nobody buys matcha by the gram, and tin sizes run
// from 20 g to a kilo, so every comparison is shown as the price of a standard 30 g tin
// ("per 30 g"). The database and all the math stay in dollars per gram; only what a visitor
// reads is converted, here, so the unit can be changed in one place. A figure is only ever
// calculated from a size the seller states (see price_needs_review in the build).
export const TIN_GRAMS = 30;
export const PER_TIN_LABEL = `per ${TIN_GRAMS} g`;

// Dollars per gram -> the price of a standard tin.
export const perTin = (perGram: number): number => perGram * TIN_GRAMS;

// "$4.20" for a per-gram figure, or "n/a".
export const usd30 = (perGram: number | null | undefined): string => (perGram == null ? "n/a" : `$${perTin(perGram).toFixed(2)}`);
