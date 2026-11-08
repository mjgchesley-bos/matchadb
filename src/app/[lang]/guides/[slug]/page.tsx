import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import { GUIDES, guideBySlug, loadGuide } from "@/lib/guides";
import { GUIDE_MIN_GRAMS } from "@/lib/guide-data";
import { ProductCard } from "@/components/ProductCard";
import { GroupTable } from "@/components/GuideBlocks";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";
import { usd30 } from "@/lib/unit-price";
import { langOf } from "@/i18n/params";
import { fmtNum, isLocale, type Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { getC } from "@/i18n/content";
import { rich } from "@/i18n/rich";
import { pageAlternates } from "@/i18n/seo";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { slug, lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const c = getC(lang);
  const g = guideBySlug(slug);
  if (!g) return {};
  const alternates = pageAlternates(lang, `/guides/${g.slug}`);
  const title = c(`gd.${g.slug}.title`, g.title);
  const description = c(`gd.${g.slug}.desc`, g.description);
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } };
}

export default async function GuidePage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug } = await params;
  const lang = await langOf(params);
  const t = getT(lang);
  const c = getC(lang);
  const guide = guideBySlug(slug);
  if (!guide) notFound();

  const { ctx, lists } = await loadGuide(guide);
  const url = pageAlternates(lang, `/guides/${guide.slug}`).canonical;
  const h1 = c(`gd.${guide.slug}.h1`, guide.h1);
  const description = c(`gd.${guide.slug}.desc`, guide.description);
  const intro = guide.intro.map((p, i) => c(`gd.${guide.slug}.intro.${i}`, p));
  const faq = guide.faq.map((f, i) => ({ q: c(`gd.${guide.slug}.faq.${i}.q`, f.q), a: f.a(ctx, c) }));
  const related = guide.related.map((s) => guideBySlug(s)).filter((g): g is NonNullable<typeof g> => !!g);
  const stats: [string, string][] = [
    [fmtNum(lang, ctx.s.count), t("g.stat.compared")],
    [fmtNum(lang, ctx.s.brands), t("cv.stat.brands")],
    [usd30(ctx.s.median), t("cv.stat.median")],
    [ctx.s.p25 != null && ctx.s.p75 != null ? `${usd30(ctx.s.p25)}–${usd30(ctx.s.p75)}` : t("gt.na"), t("cv.stat.mid")],
  ];
  const featured = lists[0]?.products ?? [];

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              name: h1,
              url,
              description,
              isPartOf: { "@type": "WebSite", name: "MatchaDB", url: SITE_URL },
              mainEntity: {
                "@type": "ItemList",
                numberOfItems: featured.length,
                itemListElement: featured.map((p, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  url: `${SITE_URL}/products/${p.id}`,
                  name: `${p.brand_name} ${p.product_name}`,
                })),
              },
            },
            {
              "@type": "FAQPage",
              mainEntity: faq.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: t("footer.guides"), item: pageAlternates(lang, "/guides").canonical },
                { "@type": "ListItem", position: 2, name: h1, item: url },
              ],
            },
          ],
        }}
      />

      <nav aria-label={t("prod.crumb.aria")} className="text-sm text-ink-faint mb-6">
        <Link href="/guides" className="hover:text-ink">{t("footer.guides")}</Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink-muted">{h1}</span>
      </nav>

      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("g.eyebrow")}</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">{h1}</h1>
        <div className="mt-5 flex flex-col gap-4 text-lg text-ink-muted leading-relaxed">
          {intro.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
      </header>

      <section className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label={t("g.glance")}>
        {stats.map(([v, l]) => (
          <div key={l} className="border border-line rounded-sm bg-paper-raised px-4 py-3">
            <p className="font-display text-2xl text-ink tabular-nums">{v}</p>
            <p className="text-xs text-ink-faint uppercase tracking-wide mt-0.5">{l}</p>
          </div>
        ))}
      </section>

      {guide.tables.length > 0 && (
        <section className="mt-8 grid grid-cols-1 gap-6">
          {guide.tables.includes("grade") && <GroupTable title={t("cv.t.grade")} rows={ctx.grade} label={t("cv.l.grade")} lang={lang} kind="grade" />}
          {guide.tables.includes("region") && <GroupTable title={t("cv.t.region")} rows={ctx.region} label={t("cv.l.region")} lang={lang} kind="region" />}
          <p className="text-xs text-ink-faint -mt-3">
            {t("g.tbl.note")}
          </p>
        </section>
      )}

      {lists.map((l, li) => (
        <section key={l.heading} className="mt-12">
          <h2 className="font-display text-2xl font-semibold text-ink">{c(`gd.${guide.slug}.list.${li}.h`, l.heading, l.headingVars)}</h2>
          {l.note && <p className="mt-1 text-sm text-ink-muted">{c(`gd.${guide.slug}.list.${li}.n`, l.note)}</p>}
          {l.products.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {l.products.map((p) => (
                <ProductCard key={p.id} product={p} lang={lang} />
              ))}
            </div>
          ) : (
            <p className="mt-5 text-ink-muted">{t("g.none")}</p>
          )}
          {l.browse && (
            <Link
              href={`/browse?${l.browse}`}
              className="inline-block mt-6 rounded-full bg-matcha text-paper px-6 py-2.5 text-sm font-medium tracking-wide hover:bg-forest transition-colors"
            >
              {t("g.filter")}
            </Link>
          )}
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

      <section className="mt-12 max-w-3xl border border-line rounded-sm bg-paper-raised px-5 py-4" aria-labelledby="how-compared">
        <h2 id="how-compared" className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("g.how.h")}</h2>
        <p className="text-sm text-ink-muted leading-relaxed">
          {t("g.how.p", { grams: GUIDE_MIN_GRAMS, method: guide.method ? c(`gd.${guide.slug}.method`, guide.method) : "" })}
        </p>
      </section>

      {guide.slug === "ceremonial-vs-culinary-matcha" && (
        <p className="mt-10 max-w-3xl text-sm text-ink-muted">
          {rich(t("g.history", { link: "{link}" }), {
            link: (
              <Link href="/guides/what-is-ceremonial-matcha" className="text-matcha hover:text-forest">
                {t("g.history.link")} &rarr;
              </Link>
            ),
          })}
        </p>
      )}

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">{t("g.more")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map((r) => (
              <Link key={r.slug} href={`/guides/${r.slug}`} className="border border-line rounded-sm bg-paper-raised p-4 hover:border-matcha hover:bg-matcha-soft transition-colors">
                <span className="font-display text-lg font-semibold text-ink block">{c(`gd.${r.slug}.h1`, r.h1)}</span>
                <span className="text-sm text-ink-muted mt-1 block">{c(`gd.${r.slug}.desc`, r.description)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
