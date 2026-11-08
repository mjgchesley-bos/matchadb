import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import { CULTIVARS, cultivarBySlug, loadCultivar, type LoadedCultivar } from "@/lib/cultivars";
import { GroupTable } from "@/components/GuideBlocks";
import { ProductCard } from "@/components/ProductCard";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";
import { usd30 } from "@/lib/unit-price";
import { langOf } from "@/i18n/params";
import { fmtNum, isLocale, type Locale } from "@/i18n/config";
import { getT, getTV, type TFn, type TVFn } from "@/i18n/server";
import { getC, type CFn } from "@/i18n/content";
import { pageAlternates } from "@/i18n/seo";

export function generateStaticParams() {
  return CULTIVARS.map((c) => ({ slug: c.slug }));
}

function titleFor(cv: { slug: string; name: string; title: string }, lang: Locale, t: TFn, c: CFn): string {
  if (lang === "en") return cv.title;
  return c(`cvc.${cv.slug}.title`, "") || t("cv.title.std", { name: cv.name });
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { slug, lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const cv = cultivarBySlug(slug);
  if (!cv) return {};
  const t = getT(lang);
  const c = getC(lang);
  const title = titleFor(cv, lang, t, c);
  const description = c(`cvc.${cv.slug}.desc`, cv.description);
  const alternates = pageAlternates(lang, `/cultivars/${cv.slug}`);
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } };
}

function faqFor(d: LoadedCultivar, lang: Locale, t: TFn, tv: TVFn): { q: string; a: string }[] {
  const { cultivar: c, s, all, grade, region, flavors } = d;
  const out: { q: string; a: string }[] = [];
  const sep = lang === "ja" || lang === "zh" ? "、" : ", ";
  const low = (x: string) => (lang === "en" ? x.toLowerCase() : x);
  if (flavors.length >= 2) {
    const top = flavors.slice(0, 3).map((f) => `${low(tv("flavor", f.tag))} (${Math.round(f.share * 100)}%)`);
    out.push({ q: t("cv.faq.flavor.q", { name: c.name }), a: t("cv.faq.flavor.a", { name: c.name, top: top.join(sep) }) });
  }
  if (grade.length) {
    const parts = grade
      .slice(0, 4)
      .map((g) => (g.name === "Not stated" ? t("cv.faq.grade.none", { n: g.count }) : t("cv.faq.grade.part", { n: g.count, grade: low(tv("grade", g.name)) })));
    out.push({ q: t("cv.faq.grade.q", { name: c.name }), a: t("cv.faq.grade.a", { n: s.count, name: c.name, parts: parts.join(sep) }) });
  }
  if (region.length) {
    const parts = region.slice(0, 4).map((r) => `${tv("region", r.name)} (${r.count})`);
    out.push({ q: t("cv.faq.region.q", { name: c.name }), a: t("cv.faq.region.a", { name: c.name, parts: parts.join(sep) }) });
  }
  if (s.median != null && s.p25 != null && s.p75 != null) {
    const rel = all.median ? t(s.median > all.median ? "cv.faq.price.above" : s.median < all.median ? "cv.faq.price.below" : "cv.faq.price.same", { all: usd30(all.median) }) : "";
    out.push({
      q: t("cv.faq.price.q", { name: c.name }),
      a: t("cv.faq.price.a", { n: s.count, name: c.name, b: s.brands, median: usd30(s.median), lo: usd30(s.p25), hi: usd30(s.p75), rel }),
    });
  }
  return out;
}

export default async function CultivarPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug } = await params;
  const lang = await langOf(params);
  const t = getT(lang);
  const tv = getTV(lang);
  const c = getC(lang);
  const cultivar = cultivarBySlug(slug);
  if (!cultivar) notFound();

  const d = await loadCultivar(cultivar);
  const { s, all, grade, region, brands, flavors, picks, studies, organicShare } = d;
  const url = pageAlternates(lang, `/cultivars/${cultivar.slug}`).canonical;
  const faq = faqFor(d, lang, t, tv);
  const h1 = lang === "en" ? cultivar.h1 : t("cv.h1", { name: cultivar.name });
  const description = c(`cvc.${cultivar.slug}.desc`, cultivar.description);
  const intro = cultivar.intro.map((p, i) => c(`cvc.${cultivar.slug}.intro.${i}`, p));
  const profile = cultivar.profile.map(([k, v], i) => c(`cvc.${cultivar.slug}.p${i}`, `${k} :: ${v}`).split(" :: ") as [string, string]);
  const related = cultivar.related.map((r) => cultivarBySlug(r)).filter((x): x is NonNullable<typeof x> => !!x);
  const stats: [string, string][] = [
    [fmtNum(lang, s.count), t("cv.stat.plain", { name: cultivar.name })],
    [fmtNum(lang, s.brands), t("cv.stat.brands")],
    [usd30(s.median), all.median ? t("cv.stat.medianAll", { price: usd30(all.median) }) : t("cv.stat.median")],
    [s.p25 != null && s.p75 != null ? `${usd30(s.p25)}–${usd30(s.p75)}` : t("gt.na"), t("cv.stat.mid")],
  ];

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
              about: { "@type": "Thing", name: `${cultivar.name} tea cultivar` },
              isPartOf: { "@type": "WebSite", name: "MatchaDB", url: SITE_URL },
              mainEntity: {
                "@type": "ItemList",
                numberOfItems: picks.length,
                itemListElement: picks.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/products/${p.id}`, name: `${p.brand_name} ${p.product_name}` })),
              },
            },
            ...(faq.length
              ? [{ "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }]
              : []),
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: t("footer.cultivars"), item: pageAlternates(lang, "/cultivars").canonical },
                { "@type": "ListItem", position: 2, name: cultivar.name, item: url },
              ],
            },
          ],
        }}
      />

      <nav aria-label={t("prod.crumb.aria")} className="text-sm text-ink-faint mb-6">
        <Link href="/cultivars" className="hover:text-ink">{t("footer.cultivars")}</Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink-muted">{cultivar.name}</span>
      </nav>

      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("cv.eyebrow")}</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">{h1}</h1>
        <div className="mt-5 flex flex-col gap-4 text-lg text-ink-muted leading-relaxed">
          {intro.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
      </header>

      {cultivar.profile.length > 0 && (
        <section className="mt-8 max-w-3xl border border-line rounded-sm bg-paper-raised px-5 py-4" aria-label={t("cv.profile.aria")}>
          <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">{t("cv.profile")}</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-[11rem_1fr] gap-x-6 gap-y-2 text-sm">
            {profile.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-ink-faint">{k}</dt>
                <dd className="text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          {cultivar.sources.length > 0 && (
            <p className="mt-4 text-xs text-ink-faint leading-relaxed">
              {t("cv.sources")}{" "}
              {cultivar.sources.map((src, i) => (
                <span key={src.url}>
                  {i > 0 && "; "}
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-muted">
                    {src.label}
                  </a>
                </span>
              ))}
              .
            </p>
          )}
        </section>
      )}

      <section className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label={t("cv.stat.aria")}>
        {stats.map(([v, l]) => (
          <div key={l} className="border border-line rounded-sm bg-paper-raised px-4 py-3">
            <p className="font-display text-2xl text-ink tabular-nums">{v}</p>
            <p className="text-xs text-ink-faint uppercase tracking-wide mt-0.5">{l}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6">
        <GroupTable title={t("cv.t.grade")} rows={grade} label={t("cv.l.grade")} lang={lang} kind="grade" />
        <GroupTable title={t("cv.t.region")} rows={region} label={t("cv.l.region")} lang={lang} kind="region" />
        <GroupTable title={t("cv.t.brands")} rows={brands} label={t("cv.l.brand")} showBrands={false} lang={lang} />
        <p className="text-xs text-ink-faint -mt-3">
          {t("cv.tbl.note")}
          {organicShare > 0 ? t("cv.tbl.organic", { pct: Math.round(organicShare * 100) }) : ""}
        </p>
      </section>

      {flavors.length > 0 && (
        <section className="mt-10 max-w-3xl">
          <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">{t("cv.flavors")}</h2>
          <div className="flex flex-wrap gap-2">
            {flavors.map((f) => (
              <span key={f.tag} className="rounded-full bg-matcha-soft px-3 py-1 text-sm text-matcha-ink">
                {tv("flavor", f.tag)} <span className="tabular-nums opacity-70">{Math.round(f.share * 100)}%</span>
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-faint">{t("cv.flavors.note", { name: cultivar.name })}</p>
        </section>
      )}

      {picks.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold text-ink">{t("cv.picks.h", { name: cultivar.name })}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t("cv.picks.note")}</p>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {picks.map((p) => (
              <ProductCard key={p.id} product={p} lang={lang} />
            ))}
          </div>
          <Link
            href={`/browse?q=${encodeURIComponent(cultivar.name)}&ships=any`}
            className="inline-block mt-6 rounded-full bg-matcha text-paper px-6 py-2.5 text-sm font-medium tracking-wide hover:bg-forest transition-colors"
          >
            {t("cv.picks.cta", { name: cultivar.name })}
          </Link>
        </section>
      )}

      {faq.length > 0 && (
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
      )}

      {studies > 0 && (
        <section className="mt-10 max-w-3xl">
          <p className="text-sm text-ink-muted">
            {t(studies === 1 ? "cv.studies.one" : "cv.studies.other", { n: studies, name: cultivar.name })}{" "}
            <Link href={`/research?q=${encodeURIComponent(cultivar.name)}`} className="text-matcha hover:text-forest">
              {t("cv.studies.read")} &rarr;
            </Link>
          </p>
        </section>
      )}

      <section className="mt-12 max-w-3xl border border-line rounded-sm bg-paper-raised px-5 py-4" aria-labelledby="how-cultivar">
        <h2 id="how-cultivar" className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("cv.how.h")}</h2>
        <p className="text-sm text-ink-muted leading-relaxed">
          {t("cv.how.p", { name: cultivar.name })}
        </p>
      </section>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">{t("cv.other")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map((r) => (
              <Link key={r.slug} href={`/cultivars/${r.slug}`} className="border border-line rounded-sm bg-paper-raised p-4 hover:border-matcha hover:bg-matcha-soft transition-colors">
                <span className="font-display text-lg font-semibold text-ink block">{r.name}</span>
                <span className="text-sm text-ink-muted mt-1 block">{c(`cvc.${r.slug}.desc`, r.description)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
