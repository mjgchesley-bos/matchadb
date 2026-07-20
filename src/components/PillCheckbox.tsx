"use client";

// Checkbox rendered as a toggle pill -- no client JS needed for the actual
// filtering (browsers natively submit one query param per checked box
// sharing the same `name`), but the mousedown handler below (preventing the
// browser's default focus-triggered scroll-into-view) does need a client
// boundary, which is why this lives in its own "use client" file separate
// from the Server Components in product-cards.tsx that render alongside it.
export function PillCheckbox({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string;
  value: string;
  label?: string;
  defaultChecked: boolean;
}) {
  return (
    // `relative` keeps the absolutely-positioned sr-only input's layout box
    // pinned to this label. On top of that, a browser's default action for
    // mousedown on a focusable element is to focus it AND, if not fully in
    // view, scroll it into view -- that scroll-into-view is the actual
    // jump. preventDefault stops that whole default action, and we focus
    // the input ourselves with preventScroll, the API built for exactly
    // this. The click/change that drives the actual toggle still fires
    // normally afterward.
    <label
      className="relative cursor-pointer"
      onMouseDown={(e) => {
        e.preventDefault();
        e.currentTarget.querySelector("input")?.focus({ preventScroll: true });
      }}
    >
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="inline-block rounded-full border border-line-strong px-3 py-1.5 text-sm text-ink-muted transition-colors peer-hover:border-matcha peer-checked:bg-matcha peer-checked:text-paper peer-checked:border-matcha">
        {label || value}
      </span>
    </label>
  );
}
