import type { Metadata } from "next";
import { PageHero } from "@/components/PageUI";
import Link from "@/i18n/Link";
import { getProductById } from "@/lib/db";
import { formatPrice } from "@/lib/price";
import { usd30 } from "@/lib/unit-price";
import { shippingLabel } from "@/lib/shipping";
import { langOf } from "@/i18n/params";
import { getT, getTV } from "@/i18n/server";
import { toStr } from "@/lib/searchParams";

// Side-by-side comparison of up to three products picked with "Add to compare". Personal pages, so not indexed.
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function CompareProducts({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const lang = await langOf(params);
  const t = getT(lang);
  const tv = getTV(lang);
  const sp = await searchParams;
  const ids = [...new Set((toStr(sp.ids) ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 3);
  const found = (await Promise.all(ids.map((id) => getProductById(id)))).filter((p): p is NonNullable<typeof p> => !!p);

  if (found.length < 2) {
    return (
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        <h1 className="font-display text-3xl font-semibold text-ink">{t("cmpp.h1")}</h1>
        <p className="mt-4 text-ink-muted">{t("cmpp.empty")}</p>
        <Link href="/browse" className="mt-6 inline-block text-matcha underline hover:text-forest">{t("cmpp.back")}</Link>
      </main>
    );
  }

  const prices = found.map((p) => p.price_per_gram).filter((v): v is number => v != null && v > 0);
  const lowest = prices.length > 1 ? Math.min(...prices) : null;
  const dash = <span className="text-ink-faint">–</span>;
  const list = (xs: string[], kind: "use" | "flavor") => (xs.length ? xs.map((x) => tv(kind, x)).join(", ") : dash);

  const rows: { label: string; cells: React.ReactNode[] }[] = [
    { label: t("cmpp.row.brand"), cells: found.map((p) => <Link key={p.id} href={`/brands/${encodeURIComponent(p.brand_name)}`} className="text-matcha hover:text-forest underline">{p.brand_name}</Link>) },
    {
      label: t("cmpp.row.price"),
      cells: found.map((p) => {
        const d = formatPrice(p, t("price.converted"));
        return d.kind === "resolved" ? d.text : dash;
      }),
    },
    {
      label: t("cmpp.row.per30"),
      cells: found.map((p) => (p.price_per_gram ? (
        <span key={p.id} className={lowest != null && p.price_per_gram === lowest ? "font-semibold text-forest" : ""}>
          {usd30(p.price_per_gram)}
          {lowest != null && p.price_per_gram === lowest && <span className="ml-2 rounded-full bg-matcha-soft px-2 py-0.5 text-xs font-medium">{t("cmpp.lowest")}</span>}
        </span>
      ) : dash)),
    },
    { label: t("cmpp.row.size"), cells: found.map((p) => (p.price_size_grams ? `${p.price_size_grams} g` : dash)) },
    { label: t("cmpp.row.grade"), cells: found.map((p) => p.grade ?? dash) },
    { label: t("cmpp.row.region"), cells: found.map((p) => (p.region ? tv("region", p.region) : dash)) },
    { label: t("cmpp.row.cultivar"), cells: found.map((p) => p.cultivar ?? dash) },
    { label: t("cmpp.row.organic"), cells: found.map((p) => (p.organic_certified ? t("cmpp.yes") : t("cmpp.no"))) },
    { label: t("cmpp.row.uses"), cells: found.map((p) => list(p.useTags, "use")) },
    { label: t("cmpp.row.flavor"), cells: found.map((p) => list(p.flavorTags, "flavor")) },
    { label: t("cmpp.row.theanine"), cells: found.map((p) => (p.l_theanine_mg_g != null ? `${p.l_theanine_mg_g} mg/g` : dash)) },
    { label: t("cmpp.row.egcg"), cells: found.map((p) => (p.egcg_mg_g != null ? `${p.egcg_mg_g} mg/g` : dash)) },
    { label: t("cmpp.row.ships"), cells: found.map((p) => shippingLabel(p.brand_name) ?? dash) },
    { label: t("cmpp.row.source"), cells: found.map((p) => (p.source_url ? <a key={p.id} href={p.source_url} target="_blank" rel="noopener noreferrer" className="text-matcha hover:text-forest underline">{t("cmpp.source")}</a> : dash)) },
  ];

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
      <PageHero title={t("cmpp.h1")} />
      <div className="mt-6 overflow-x-auto rounded-md border-2 border-line bg-paper-raised p-4 shadow-sm sm:p-6">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr className="align-bottom">
              <th className="w-36 pb-3 pr-4 text-left font-normal" />
              {found.map((p) => (
                <th key={p.id} className="border-b border-line-strong pb-3 pr-4 text-left align-bottom">
                  <Link href={`/products/${p.id}`} className="font-display text-lg font-semibold leading-snug text-ink hover:text-matcha">{p.product_name}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-line align-top">
                <th scope="row" className="py-3 pr-4 text-left font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-forest">{r.label}</th>
                {r.cells.map((c, i) => (
                  <td key={i} className="py-3 pr-4 text-ink">{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-6 rounded-sm border-2 border-line bg-paper-raised px-5 py-3 text-xs text-ink-faint">{t("cmpp.note")}</p>
      <Link href="/browse" className="mt-4 inline-block rounded-full border-2 border-matcha px-5 py-2 text-sm font-medium text-matcha hover:bg-matcha-soft">{t("cmpp.back")}</Link>
    </main>
  );
}
