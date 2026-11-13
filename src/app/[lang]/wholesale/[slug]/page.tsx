import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { BrandLogo } from "@/components/product-cards";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";
import { profiled, supplierBySlug } from "@/lib/suppliers";
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

      <section className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="overflow-hidden rounded-sm border border-line bg-paper-raised">
          <h2 className="border-b border-line bg-matcha-soft px-5 py-3 font-display text-xl font-semibold text-ink">{t("ws.slug.products")}</h2>
          <ul className="list-disc pl-10 pr-5 py-4 flex flex-col gap-1.5 text-ink-muted">
            {p.products.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
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
