import Link from "@/i18n/Link";
import type { ProductRow } from "@/lib/db";
import { formatPrice } from "@/lib/price";
import { getExternalLinkInfo } from "@/lib/links";
import { ShippingChip } from "./ShippingNote";
import { BrandLogo } from "./product-cards";
import { getT, getTV } from "@/i18n/server";
import type { Locale } from "@/i18n/config";

export function ProductCard({ product: p, lang = "en" }: { product: ProductRow; lang?: Locale }) {
  const link = getExternalLinkInfo(p.source_url);
  const t = getT(lang);
  const tv = getTV(lang);
  const linkLabel = link ? (link.hostname.includes("amazon.") ? t("pc.viewAmazon") : t("pc.viewProduct")) : "";
  return (
    <div className="border border-line rounded-sm p-4 hover:border-matcha bg-paper-raised hover:bg-matcha-soft transition-colors flex flex-col gap-1">
      <Link href={`/products/${p.id}`} className="flex flex-col gap-1">
        <span className="flex items-center gap-2">
          <BrandLogo brandName={p.brand_name} logoAlt={t("pc.logoAlt", { brand: p.brand_name })} />
          <span className="text-base font-bold text-ink">{p.brand_name}</span>
        </span>
        <span className="text-sm text-ink-muted leading-snug">{p.product_name}</span>
        {link && <span className="text-xs text-ink-faint truncate">{link.hostname}</span>}
        <div className="flex flex-wrap gap-1.5 mt-1.5 text-xs">
          {p.grade && (
            <span className="rounded-full bg-matcha-soft text-matcha-ink px-2 py-0.5">{tv("grade", p.grade)}</span>
          )}
          {p.region && (
            <span className="rounded-full bg-paper-raised border border-line text-ink-muted px-2 py-0.5">
              {tv("region", p.region)}
            </span>
          )}
          {p.cultivar && (
            <span className="rounded-full bg-paper-raised border border-line text-ink-muted px-2 py-0.5">{p.cultivar}</span>
          )}
          {p.organic_certified === 1 && (
            <span className="rounded-full bg-gold-soft text-gold px-2 py-0.5">{t("pc.organic")}</span>
          )}
          <ShippingChip brand={p.brand_name} lang={lang} />
          {(JSON.parse(p.flavor_tags) as string[]).slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-paper-raised border border-line-strong text-ink-muted px-2 py-0.5"
            >
              {tv("flavor", tag)}
            </span>
          ))}
          {p.not_found === 1 && (
            <span className="rounded-full bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 px-2 py-0.5">
              {t("pc.unverifiable")}
            </span>
          )}
        </div>
        {(() => {
          const price = formatPrice(p, t("price.converted"));
          if (price.kind === "unresolved") {
            return (
              <span className="text-sm mt-1.5 text-ink-faint italic">
                {p.source_url ? t("pc.seeWebsite") : t("pc.priceNotConfirmed")}
              </span>
            );
          }
          if (price.kind === "linkOnly") {
            return <span className="text-sm mt-1.5 text-ink-faint italic">{t("pc.pricingOnPage")}</span>;
          }
          return (
            <span className="text-sm mt-1.5 tabular-nums text-ink">
              {price.text}
              {price.caution && <span className="text-amber-600 ml-1">&#9888;</span>}
            </span>
          );
        })()}
      </Link>
      {link && (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-matcha hover:text-forest transition-colors mt-1.5"
        >
          {linkLabel} &rarr;
        </a>
      )}
    </div>
  );
}

// Same info as ProductCard, but as the featured "one per price tier" pick --
// bolder border and a tier-name badge instead of the plain brand/grade line.
export function TieredPickCard({ label, product: p, lang = "en" }: { label: string; product: ProductRow; lang?: Locale }) {
  const t = getT(lang);
  const price = formatPrice(p, t("price.converted"));
  const link = getExternalLinkInfo(p.source_url);
  const linkLabel = link ? (link.hostname.includes("amazon.") ? t("pc.viewAmazon") : t("pc.viewProduct")) : "";
  return (
    <div className="border-2 border-matcha rounded-sm p-4 bg-paper hover:bg-matcha-soft transition-colors flex flex-col gap-1">
      <Link href={`/products/${p.id}`} className="flex flex-col gap-1">
        <span className="inline-block self-start rounded-full bg-matcha text-paper px-2.5 py-0.5 text-xs font-medium tracking-wide mb-1">
          {label}
        </span>
        <span className="flex items-center gap-2">
          <BrandLogo brandName={p.brand_name} logoAlt={t("pc.logoAlt", { brand: p.brand_name })} />
          <span className="text-base font-bold text-ink">{p.brand_name}</span>
        </span>
        <span className="text-sm text-ink-muted leading-snug">{p.product_name}</span>
        {link && <span className="text-xs text-ink-faint truncate">{link.hostname}</span>}
        {price.kind === "resolved" && (
          <span className="text-sm mt-1.5 tabular-nums text-ink">{price.text}</span>
        )}
      </Link>
      {link && (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-matcha hover:text-forest transition-colors mt-1.5"
        >
          {linkLabel} &rarr;
        </a>
      )}
    </div>
  );
}
