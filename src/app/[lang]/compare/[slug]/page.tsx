import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import { PAIRS, loadComparison, pairBySlug, pairSlug, type BrandSide } from "@/lib/compare";
import { BrandLogo, gradeLabel } from "@/components/product-cards";
import { ProductCard } from "@/components/ProductCard";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";
import { usd30 } from "@/lib/unit-price";
import { langOf } from "@/i18n/params";
import { isLocale, type Locale } from "@/i18n/config";
import { getT, getTV, type TFn, type TVFn } from "@/i18n/server";
import { pageAlternates } from "@/i18n/seo";
import { shippingLabelFor } from "@/components/ShippingNote";

export function generateStaticParams() {
  return PAIRS.map(([a, b]) => ({ slug: pairSlug(a, b) }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { slug, lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  const pair = pairBySlug(slug);
  if (!pair) return {};
  const [a, b] = pair;
  const title = t("cmp.title", { a, b });
  const description = t("cmp.desc", { a, b });
  const alternates = pageAlternates(lang, `/compare/${slug}`);
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } };
}

const stripStop = (s: string | null) => (s ? s.replace(/\.+$/, "") : null);
const pct = (n: number) => `${Math.round(n * 100)}%`;

type Tools = { t: TFn; tv: TVFn; lang: Locale };
const sep = (lang: Locale) => (lang === "ja" || lang === "zh" ? "、" : ", ");
const items = (xs: { name: string; count: number }[], { t, tv, lang }: Tools) =>
  xs.length ? xs.map((x) => `${x.name === "Not stated" ? t("gt.notStated") : gradeLabel(x.name, tv)} (${x.count})`).join(sep(lang)) : t("cmp.none");
const plain = (xs: { name: string; count: number }[], { t, lang }: Tools, kind?: "region") =>
  xs.length ? xs.map((x) => `${kind === "region" ? tvOf(lang)("region", x.name) : x.name} (${x.count})`).join(sep(lang)) : t("cmp.none");
const tvOf = (lang: Locale) => getTV(lang);

function priceVerdict(a: BrandSide, b: BrandSide, { t }: Tools): string | null {
  const ma = a.powders.median;
  const mb = b.powders.median;
  if (ma == null || mb == null || a.powders.count < 3 || b.powders.count < 3) return null;
  if (Math.abs(ma - mb) / Math.max(ma, mb) < 0.05) return t("cmp.v.same", { a: a.name, b: b.name, ma: usd30(ma), mb: usd30(mb) });
  const [lo, hi] = ma < mb ? [a, b] : [b, a];
  const drop = Math.round((1 - lo.powders.median! / hi.powders.median!) * 100);
  const small = Math.min(a.powders.count, b.powders.count) < 6 ? t("cmp.v.small") : "";
  return t("cmp.v.diff", { lo: lo.name, hi: hi.name, drop, plo: usd30(lo.powders.median), phi: usd30(hi.powders.median), nlo: lo.powders.count, nhi: hi.powders.count, small });
}

function faqFor(a: BrandSide, b: BrandSide, tools: Tools, shipA: string | null, shipB: string | null): { q: string; a: string }[] {
  const { t } = tools;
  const out: { q: string; a: string }[] = [];
  const v = priceVerdict(a, b, tools);
  if (v) {
    out.push({
      q: t("cmp.q.cheaper", { a: a.name, b: b.name }),
      a: t("cmp.a.cheaper", { v, a: a.name, b: b.name, amin: usd30(a.powders.min), amax: usd30(a.powders.max), bmin: usd30(b.powders.min), bmax: usd30(b.powders.max) }),
    });
  }
  const prod = (s: BrandSide) => t(s.total === 1 ? "cmp.prod.one" : "cmp.prod.other", { n: s.total, brand: s.name });
  out.push({ q: t("cmp.q.count", { a: a.name, b: b.name }), a: t("cmp.a.count", { pa: prod(a), pb: prod(b) }) });
  out.push({
    q: t("cmp.q.region", { a: a.name, b: b.name }),
    a: t("cmp.a.region", { a: a.name, b: b.name, pa: pct(a.regionShare), pb: pct(b.regionShare), la: plain(a.regions.slice(0, 3), tools, "region"), lb: plain(b.regions.slice(0, 3), tools, "region") }),
  });
  out.push({
    q: t("cmp.q.ship", { a: a.name, b: b.name }),
    a: t("cmp.a.ship", { a: a.name, b: b.name, na: shipA ?? t("cmp.ship.none"), nb: shipB ?? t("cmp.ship.none") }),
  });
  return out;
}

export default async function ComparePage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug } = await params;
  const lang = await langOf(params);
  const t = getT(lang);
  const tv = getTV(lang);
  const tools: Tools = { t, tv, lang };
  const pair = pairBySlug(slug);
  if (!pair) notFound();
  const [nameA, nameB] = pair;

  const { a, b } = await loadComparison(nameA, nameB);
  const url = pageAlternates(lang, `/compare/${slug}`).canonical;
  const faq = faqFor(a, b, tools, stripStop(a.shippingNote), stripStop(b.shippingNote));
  const verdict = priceVerdict(a, b, tools);
  const shipOf = (n: string) => shippingLabelFor(n, lang) ?? t("cmp.noRestriction");
  const others = PAIRS.filter(([x, y]) => pairSlug(x, y) !== slug && (x === nameA || y === nameA || x === nameB || y === nameB)).slice(0, 6);

  const rows: [string, string, string][] = [
    [t("cmp.r.products"), String(a.total), String(b.total)],
    [t("cmp.r.plain"), String(a.powders.count), String(b.powders.count)],
    [t("cmp.r.median"), usd30(a.powders.median), usd30(b.powders.median)],
    [t("cmp.r.mid"), a.powders.p25 != null ? `${usd30(a.powders.p25)}–${usd30(a.powders.p75)}` : t("gt.na"), b.powders.p25 != null ? `${usd30(b.powders.p25)}–${usd30(b.powders.p75)}` : t("gt.na")],
    [t("cmp.r.low"), a.cheapest ? `${usd30(a.cheapest.price_per_gram)} (${a.cheapest.product_name})` : t("gt.na"), b.cheapest ? `${usd30(b.cheapest.price_per_gram)} (${b.cheapest.product_name})` : t("gt.na")],
    [t("cmp.r.high"), a.priciest ? `${usd30(a.priciest.price_per_gram)} (${a.priciest.product_name})` : t("gt.na"), b.priciest ? `${usd30(b.priciest.price_per_gram)} (${b.priciest.product_name})` : t("gt.na")],
    [t("cmp.r.grades"), items(a.grades, tools), items(b.grades, tools)],
    [t("cmp.r.regions"), t("cmp.r.regionsVal", { list: plain(a.regions, tools, "region"), pct: pct(a.regionShare) }), t("cmp.r.regionsVal", { list: plain(b.regions, tools, "region"), pct: pct(b.regionShare) })],
    [t("cmp.r.cultivars"), plain(a.cultivars, tools), plain(b.cultivars, tools)],
    [t("cmp.r.organic"), pct(a.organicShare), pct(b.organicShare)],
    [t("cmp.r.ships"), shipOf(nameA), shipOf(nameB)],
  ];

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              name: `${nameA} vs ${nameB}`,
              url,
              description: `${nameA} and ${nameB} matcha compared by price per 30 g, grade, growing region, cultivar and shipping.`,
              isPartOf: { "@type": "WebSite", name: "MatchaDB", url: SITE_URL },
              mainEntity: {
                "@type": "ItemList",
                numberOfItems: 2,
                itemListElement: [nameA, nameB].map((n, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/brands/${encodeURIComponent(n)}`, name: n })),
              },
            },
            { "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: t("footer.compare"), item: pageAlternates(lang, "/compare").canonical },
                { "@type": "ListItem", position: 2, name: `${nameA} vs ${nameB}`, item: url },
              ],
            },
          ],
        }}
      />

      <nav aria-label={t("prod.crumb.aria")} className="text-sm text-ink-faint mb-6">
        <Link href="/compare" className="hover:text-ink">{t("footer.compare")}</Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink-muted">{nameA} vs {nameB}</span>
      </nav>

      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("cmp.eyebrow")}</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">{nameA} vs {nameB}</h1>
        <p className="mt-5 text-lg text-ink-muted leading-relaxed">
          {t("cmp.lead", { a: nameA, b: nameB, verdict: verdict ?? "" })}
        </p>
        <p className="mt-3 text-sm text-ink-faint">{t("cmp.facts")}</p>
      </header>

      <section className="mt-8 border border-line rounded-sm bg-paper-raised" aria-label={t("cmp.aria")}>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-[13px] sm:text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-2 sm:px-5 py-3 font-normal text-xs uppercase tracking-wide text-ink-faint w-[28%]"> </th>
                {[nameA, nameB].map((n) => (
                  <th key={n} className="px-2 sm:px-4 py-3 align-bottom">
                    <Link href={`/brands/${encodeURIComponent(n)}`} className="flex items-center gap-2.5 font-display text-base sm:text-lg font-semibold text-ink hover:text-matcha">
                      <span className="hidden sm:inline-flex">
                        <BrandLogo brandName={n} size={28} maxWidth={90} />
                      </span>
                      <span>{n}</span>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, x, y]) => (
                <tr key={label} className="border-t border-line align-top">
                  <th scope="row" className="px-2 sm:px-5 py-3 text-left font-normal text-ink-faint break-words">{label}</th>
                  <td className="px-2 sm:px-4 py-3 text-ink tabular-nums break-words">{x}</td>
                  <td className="px-2 sm:px-4 py-3 text-ink tabular-nums break-words">{y}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {[a, b].map((side) => (
        <section key={side.name} className="mt-12">
          <h2 className="font-display text-2xl font-semibold text-ink">{t("cmp.range.h", { name: side.name })}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t("cmp.range.note")}</p>
          {side.spread.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {side.spread.map((p) => (
                <ProductCard key={p.id} product={p} lang={lang} />
              ))}
            </div>
          ) : (
            <p className="mt-5 text-ink-muted">{t("cmp.range.none")}</p>
          )}
          <Link href={`/brands/${encodeURIComponent(side.name)}`} className="inline-block mt-5 text-matcha hover:text-forest">
            {t("cmp.range.all", { n: side.total, name: side.name })} &rarr;
          </Link>
        </section>
      ))}

      <section className="mt-12 max-w-3xl">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("cv.faq.h")}</h2>
        <div className="mt-5 flex flex-col gap-6">
          {faq.map((f) => (
            <div key={f.q}>
              <h3 className="font-display text-lg font-semibold text-ink">{f.q}</h3>
              <p className="mt-1 text-ink-muted leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 max-w-3xl border border-line rounded-sm bg-paper-raised px-5 py-4" aria-labelledby="how-compare">
        <h2 id="how-compare" className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("cmp.how.h")}</h2>
        <p className="text-sm text-ink-muted leading-relaxed">
          {t("cmp.how.p")}
        </p>
      </section>

      {others.length > 0 && (
        <section className="mt-12">
          <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">{t("cmp.more")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {others.map(([x, y]) => (
              <Link key={pairSlug(x, y)} href={`/compare/${pairSlug(x, y)}`} className="border border-line rounded-sm bg-paper-raised p-4 hover:border-matcha hover:bg-matcha-soft transition-colors">
                <span className="font-display text-lg font-semibold text-ink block">{x} vs {y}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

