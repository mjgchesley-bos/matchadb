import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { BrandLogo } from "@/components/product-cards";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";
import { profiled, supplierBySlug, type CatalogItem } from "@/lib/suppliers";
import { langOf } from "@/i18n/params";
import { INTL_LANG, isLocale, type Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { rich } from "@/i18n/rich";
import { pageAlternates } from "@/i18n/seo";

// Full profiles exist only for suppliers whose own site gives enough detail to fill one in;
// every other supplier is listed on /wholesale.
export function generateStaticParams() {
  return profiled().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { slug, lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  const s = supplierBySlug(slug);
  if (!s?.profile) return {};
  const alternates = pageAlternates(lang, `/wholesale/${s.slug}`);
  const title = t("ws.slug.title", { name: s.name });
  const description = `${s.name}${s.hq ? ` (${s.hq})` : ""} supplies bulk matcha from ${s.profile.origins.join(" and ")}. ${s.profile.minimumOrder}. Terms and certifications as the supplier states them.`;
  return { title, description: lang === "en" ? description : t("ws.desc"), alternates, openGraph: { title, description, url: alternates.canonical } };
}

// One supplier product or option as a card, in the style of the consumer product cards: what it is, where it is from,
// what the supplier says it is for, its own taste ratings, the options and price it states, and a link to its page.
function CatalogCard({ item, t }: { item: CatalogItem; t: ReturnType<typeof getT> }) {
  const chip = "rounded-full px-2 py-0.5 text-xs";
  const flavor = item.flavor
    ? ([
        [t("ws.slug.f.sweet"), item.flavor.sweetness],
        [t("ws.slug.f.bitter"), item.flavor.bitterness],
        [t("ws.slug.f.aroma"), item.flavor.aroma],
        [t("ws.slug.f.foam"), item.flavor.foam],
        [t("ws.slug.f.finish"), item.flavor.finish],
      ] as [string, number][])
    : null;
  return (
    <li className="flex flex-col gap-3 rounded-sm border border-line bg-paper p-4">
      <h3 className="text-base font-bold leading-snug text-ink">{item.name}</h3>
      <div className="flex flex-wrap gap-1.5">
        {item.origin && <span className={`${chip} border border-line bg-paper-raised text-ink-muted`}>{item.origin}</span>}
        {item.cultivar && <span className={`${chip} bg-matcha-soft text-matcha-ink`}>{item.cultivar}</span>}
        {item.shading && <span className={`${chip} border border-line bg-paper-raised text-ink-muted`}>{item.shading}</span>}
        {item.harvest && <span className={`${chip} border border-line bg-paper-raised text-ink-muted`}>{item.harvest}</span>}
        {item.picking && <span className={`${chip} border border-line bg-paper-raised text-ink-muted`}>{item.picking}</span>}
        {(item.badges ?? []).map((b) => (
          <span key={b} className={`${chip} bg-gold-soft text-gold`}>{b}</span>
        ))}
        {(item.uses ?? []).map((u) => (
          <span key={u} className={`${chip} border border-line-strong bg-paper-raised text-ink-muted`}>{u}</span>
        ))}
      </div>
      <p className="text-sm leading-relaxed text-ink-muted">{item.notes}</p>
      {flavor && (
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 text-xs text-ink-faint">
          {flavor.map(([label, n]) => (
            <div key={label} className="contents">
              <dt>{label}</dt>
              <dd className="flex gap-1" role="img" aria-label={`${label}: ${n} / 5`}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} aria-hidden="true" className={`h-2 w-2 rounded-full border ${i <= n ? "border-matcha bg-matcha" : "border-line-strong"}`} />
                ))}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {item.options && item.options.length > 0 && (
        <div className="text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{t("ws.slug.p.opts")}</p>
          <ul className="mt-1 flex flex-col gap-0.5 text-ink-muted">
            {item.options.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-auto border-t border-line pt-3">
        <p className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">{t("ws.slug.p.price")}</span>
          <span className="tabular-nums font-medium text-ink">{item.price ?? t("ws.slug.p.onReq")}</span>
        </p>
        {item.priceNote && <p className="mt-1 text-xs leading-snug text-ink-faint">{item.priceNote}</p>}
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-medium text-matcha hover:text-forest">
            {t("ws.slug.p.view")} &rarr;
          </a>
        )}
      </div>
    </li>
  );
}

export default async function SupplierPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug } = await params;
  const lang = await langOf(params);
  const t = getT(lang);
  const s = supplierBySlug(slug);
  if (!s || !s.profile) notFound();
  const p = s.profile;
  const url = pageAlternates(lang, `/wholesale/${s.slug}`).canonical;
  const verified = new Intl.DateTimeFormat(INTL_LANG[lang], { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${s.verified}T00:00:00Z`));
  const hq = s.hq ?? "";

  const rows: { label: string; value: React.ReactNode }[] = [
    ...(hq ? [{ label: t("ws.slug.r.hq"), value: hq }] : []),
    { label: t("ws.slug.r.src"), value: p.origins.join(" and ") },
    { label: t("ws.slug.r.grades"), value: p.organic },
    { label: t("ws.slug.r.min"), value: p.minimumOrder },
    { label: t("ws.slug.r.docs"), value: p.documentation },
    { label: t("ws.slug.r.samples"), value: p.samples },
    { label: t("ws.slug.r.pl"), value: p.privateLabel },
    { label: t("ws.slug.r.ship"), value: p.shipping },
    { label: t("ws.slug.r.price"), value: p.pricing },
    { label: t("ws.slug.r.sells"), value: p.customers },
  ];

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: s.name,
          url: s.website,
          description: s.summary,
          ...(hq ? { address: { "@type": "PostalAddress", addressLocality: hq.split(",")[0].trim(), addressCountry: hq.split(",").pop()?.trim() } } : {}),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "MatchaDB", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: t("footer.wholesale"), item: pageAlternates(lang, "/wholesale").canonical },
            { "@type": "ListItem", position: 3, name: s.name, item: url },
          ],
        }}
      />
      <nav aria-label={t("prod.crumb.aria")} className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/" className="hover:text-matcha transition-colors">MatchaDB</Link>
        <span aria-hidden="true">/</span>
        <Link href="/wholesale" className="hover:text-matcha transition-colors">{t("footer.wholesale")}</Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink-faint">{s.name}</span>
      </nav>

      <header className="mt-6 rounded-sm border border-line bg-paper-raised p-5 sm:p-7">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("ws.slug.eyebrow")}</p>
        <div className="flex items-center gap-4">
          <BrandLogo brandName={s.name} size={64} maxWidth={200} allowTallerThanSize />
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink leading-tight text-balance">{s.name}</h1>
        </div>
        <p className="mt-4 max-w-3xl text-lg text-ink-muted leading-relaxed">{s.summary}</p>
        <p className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-5">
          <a
            href={s.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full bg-matcha px-6 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-forest"
          >
            {t("ws.slug.visit", { name: s.name })}
          </a>
          {(s.links ?? []).map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full border border-line-strong bg-paper-raised px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-matcha-soft"
            >
              {l.label}
            </a>
          ))}
        </p>
      </header>

      {s.catalog && s.catalog.length > 0 && (
        <section className="mt-6 overflow-hidden rounded-sm border border-line bg-paper-raised" aria-labelledby="catalog-h">
          <h2 id="catalog-h" className="border-b border-line bg-matcha-soft px-5 py-3 font-display text-xl font-semibold text-ink">{t("ws.slug.catalog")}</h2>
          <p className="px-5 pt-4 text-sm text-ink-faint">{t("ws.slug.catalogNote", { name: s.name, date: verified })}</p>
          <ul className="grid gap-4 p-5 sm:grid-cols-2">
            {s.catalog.map((item) => (
              <CatalogCard key={item.name} item={item} t={t} />
            ))}
          </ul>
          <p className="border-t border-line px-5 py-3 text-xs leading-relaxed text-ink-faint">
            {s.catalog.some((c) => c.flavor) && <>{t("ws.slug.f.note")} </>}
            {s.catalogNote}
          </p>
        </section>
      )}

      <section className="mt-6 overflow-hidden rounded-sm border border-line bg-paper-raised" aria-labelledby="terms-h">
        <h2 id="terms-h" className="border-b border-line bg-matcha-soft px-5 py-3 font-display text-xl font-semibold text-ink">{t("ws.slug.terms")}</h2>
        <dl className="divide-y divide-line px-5">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-1 sm:grid-cols-[11rem_1fr] gap-x-6 gap-y-1 py-3.5">
              <dt className="text-sm text-ink-faint">{r.label}</dt>
              <dd className="text-ink leading-relaxed">{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={`mt-6 grid gap-6 ${s.catalog?.length ? "" : "sm:grid-cols-2"}`}>
        {!s.catalog?.length && (
        <div className="overflow-hidden rounded-sm border border-line bg-paper-raised">
          <h2 className="border-b border-line bg-matcha-soft px-5 py-3 font-display text-xl font-semibold text-ink">{t("ws.slug.products")}</h2>
          <ul className="list-disc pl-10 pr-5 py-4 flex flex-col gap-1.5 text-ink-muted">
            {p.products.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        )}
        <div className="overflow-hidden rounded-sm border border-line bg-paper-raised">
          <h2 className="border-b border-line bg-matcha-soft px-5 py-3 font-display text-xl font-semibold text-ink">{t("ws.slug.certs")}</h2>
          <ul className="list-disc pl-10 pr-5 py-4 flex flex-col gap-1.5 text-ink-muted">
            {p.certifications.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-6 rounded-sm border border-dashed border-line-strong px-5 py-4 text-sm text-ink-muted leading-relaxed">
        <p>
          <strong className="text-ink">{t("ws.slug.where")}</strong> {t("ws.slug.note", { name: s.name, date: verified })}{" "}
          {s.sources.map((src, i) => (
            <span key={src.url}>
              {i > 0 && ", "}
              <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-matcha underline hover:text-forest">
                {src.label}
              </a>
            </span>
          ))}
          {lang === "ja" || lang === "zh" ? "。" : "."}{" "}
          {rich(t("ws.slug.disclaimer", { link: "{link}" }), {
            link: (
              <a href={`mailto:${CONTACT_EMAIL}?subject=Wholesale%20listing%20update:%20${encodeURIComponent(s.name)}`} className="text-matcha underline hover:text-forest">
                {t("ws.slug.tell")}
              </a>
            ),
          })}
        </p>
      </section>

      <p className="mt-8 text-sm">
        <Link href="/wholesale" className="text-matcha hover:text-forest">&larr; {t("ws.slug.all")}</Link>
      </p>
    </main>
  );
}
