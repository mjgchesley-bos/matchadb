import { shippingInfo, shippingLabel } from "@/lib/shipping";

// Compact chip for product cards: only appears for a brand whose own shipping
// policy limits where it sells (see src/lib/shipping.ts).
export function ShippingChip({ brand }: { brand: string }) {
  const label = shippingLabel(brand);
  if (!label) return null;
  return <span className="rounded-full bg-gold-soft text-gold px-2 py-0.5">{label}</span>;
}

// Fuller notice for brand and product pages: says what the limit is, quotes
// the brand's own wording, and links to the policy it came from.
export function ShippingNote({ brand }: { brand: string }) {
  const info = shippingInfo(brand);
  const label = shippingLabel(brand);
  if (!info || !label) return null;
  return (
    <div className="mt-4 rounded-sm border border-line-strong bg-gold-soft px-4 py-3 text-sm text-ink-muted max-w-2xl" role="note">
      <p className="font-medium text-ink">{label}</p>
      <p className="mt-1 leading-relaxed">
        {info.note} Check the brand&apos;s{" "}
        <a href={info.source} target="_blank" rel="noopener noreferrer" className="text-matcha hover:text-forest underline">
          shipping policy
        </a>{" "}
        before ordering (read {info.checked}).
      </p>
    </div>
  );
}
