import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import { CultivarMap } from "@/components/CultivarMap";
import { JsonLd } from "@/components/JsonLd";
import { producerBySlug } from "@/lib/producers";
import { PRODUCER_IMAGES } from "@/lib/producer-images";
import { CULTIVAR_IMAGES } from "@/lib/cultivar-images";
import { cultivarBySlug } from "@/lib/cultivars";
import { REGION_COORDINATES } from "@/lib/regions";
import { getBrandProducts, getComparablePrices } from "@/lib/db";
import { usd30 } from "@/lib/unit-price";
import { isLocale, type Locale } from "@/i18n/config";
import { pageAlternates } from "@/i18n/seo";

// Built the first time someone asks for it, then kept for a day.
export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type Params = { lang: string; slug: string };
const imageOf = (key: string) => PRODUCER_IMAGES[key] ?? CULTIVAR_IMAGES[key];

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang: raw, slug } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const p = producerBySlug(slug);
  if (!p) return { title: "Producer not found", robots: { index: false } };
  const title = `${p.name}: History, Family and Matcha`;
  const description = `${p.headline}. Founded ${p.founded}, based in ${p.basedIn}. Its story, the people behind it, where it is, and its matcha compared in MatchaDB.`;
  const alternates = pageAlternates(lang, `/producers/${p.slug}`);
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } };
}

export default async function ProducerPage({ params }: { params: Promise<Params> }) {
  const { lang: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const lang: Locale = raw;
  const p = producerBySlug(slug);
  if (!p) notFound();
  const [products, comparable] = await Promise.all([getBrandProducts(p.brand), getComparablePrices()]);
  const per30 = comparable.filter((c) => c.brand === p.brand).map((c) => c.pricePerGram).sort((a, b) => a - b);
  const images = p.images.map(imageOf).filter(Boolean);
  const region = REGION_COORDINATES[p.base];
  const pins = region ? [{ name: p.basedIn, sub: region.country, lat: region.lat, lng: region.lng, count: products.length, href: null }] : [];
  const url = pageAlternates(lang, `/producers/${p.slug}`).canonical;
  const related = p.related.map(producerBySlug).filter((x): x is NonNullable<typeof x> => !!x);
  const cultivars = p.cultivars.map(cultivarBySlug).filter((x): x is NonNullable<typeof x> => !!x);
  const h2 = "font-display text-2xl font-semibold text-ink";
  const label = "font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3";

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${url}#org`,
              name: p.name,
              ...(p.native ? { alternateName: p.native } : {}),
              url,
              foundingDate: p.founded.replace(/^c\. /, "").slice(0, 4),
              location: { "@type": "Place", name: p.basedIn },
              description: p.headline,
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Producers", item: pageAlternates(lang, "/producers").canonical },
                { "@type": "ListItem", position: 2, name: p.name, item: url },
              ],
            },
          ],
        }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-ink-faint mb-6">
        <Link href="/producers" className="hover:text-ink">Producers</Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink-muted">{p.name}</span>
      </nav>

      <header className="rounded-md border-2 border-matcha bg-gradient-to-br from-matcha-soft to-paper-raised p-5 shadow-sm sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="min-w-0">
            <p className={label}>{p.kind}</p>
            <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">
              {p.name}
              {p.native && <span className="ml-3 text-2xl sm:text-3xl text-ink-muted">{p.native}</span>}
            </h1>
            <p className="mt-4 text-lg text-ink-muted leading-relaxed">{p.headline}.</p>
            <p className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full border border-line-strong bg-paper-raised px-3 py-1 text-ink-muted">Founded {p.founded}</span>
              <span className="rounded-full border border-line-strong bg-paper-raised px-3 py-1 text-ink-muted">{p.basedIn}</span>
            </p>
            <div className="mt-5 rounded-sm border-2 border-matcha/60 bg-paper-raised px-4 py-3 text-sm text-ink-muted">
              {products.length > 0 ? (
                <p>
                  <strong className="text-ink">{products.length} {p.name} product{products.length === 1 ? "" : "s"}</strong> in MatchaDB
                  {per30.length >= 2 ? `, a standard 30 g tin running ${usd30(per30[0])} to ${usd30(per30[per30.length - 1])}` : ""}.{" "}
                  <Link href={`/brands/${encodeURIComponent(p.brand)}`} className="font-medium text-matcha underline hover:text-forest">See every product and where to buy</Link>
                </p>
              ) : (
                <p>We don&apos;t list any products from this company yet.</p>
              )}
            </div>
          </div>
          <section className="rounded-sm border-2 border-line-strong bg-paper-raised px-5 py-4" aria-label="Key facts">
            <h2 className={label}>At a glance</h2>
            <dl className="grid grid-cols-[6.5rem_1fr] gap-x-4 gap-y-2.5 text-sm">
              {p.facts.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-ink-faint">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex min-w-0 flex-col gap-6">
      {images.length > 0 && (
        <section className="" aria-label={`Pictures related to ${p.name}`}>
          <div className="grid gap-3 sm:grid-cols-2">
            {images.slice(0, 2).map((im, i) => (
              <figure key={im.key} className="overflow-hidden rounded-sm border-2 border-line bg-paper-raised">
                <Image src={im.src} alt={im.alt} width={im.w} height={im.h} sizes="(min-width: 640px) 45vw, 100vw" priority={i === 0} className="h-60 w-full object-cover sm:h-72" />
                <figcaption className="px-3 py-2 text-xs leading-relaxed text-ink-faint">
                  {im.caption}. <a href={im.page} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-muted">{im.credit}</a>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className=" flex flex-col gap-4 rounded-sm border-2 border-line bg-paper-raised px-5 py-5 text-ink-muted leading-relaxed" aria-labelledby="pr-story">
        <h2 id="pr-story" className={label}>The story</h2>
        {p.story.map((para) => (
          <p key={para.slice(0, 30)}>{para}</p>
        ))}
      </section>

      {p.timeline.length > 0 && (
        <section className=" rounded-sm border-2 border-line bg-paper-raised px-5 py-5" aria-labelledby="pr-time">
          <h2 id="pr-time" className={label}>Timeline</h2>
          <ol className="ml-1 flex flex-col gap-3 border-l-2 border-line pl-5">
            {p.timeline.map((t) => (
              <li key={t.year + t.text.slice(0, 12)} className="relative">
                <span className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-matcha" aria-hidden="true" />
                <p className="font-mono text-xs tracking-[0.12em] text-forest">{t.year}</p>
                <p className="text-sm text-ink-muted">{t.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {p.people.length > 0 && (
        <section className=" rounded-sm border-2 border-line bg-paper-raised px-5 py-5" aria-labelledby="pr-people">
          <h2 id="pr-people" className={label}>The people and the family</h2>
          <ul className="flex flex-col gap-2">
            {p.people.map((x) => (
              <li key={x.name} className="rounded-sm border border-line bg-paper px-4 py-3">
                <p className="font-medium text-ink">{x.name}{x.native ? <span className="ml-2 text-ink-muted">{x.native}</span> : null}</p>
                <p className="text-sm text-ink-muted">{x.role}.</p>
              </li>
            ))}
          </ul>
        </section>
      )}

        </div>
        <div className="flex min-w-0 flex-col gap-6">
      {p.current.length > 0 && (
        <section className=" rounded-sm border-2 border-line bg-paper-raised px-5 py-5" aria-labelledby="pr-now">
          <h2 id="pr-now" className={label}>Today</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-ink-muted">
            {p.current.map((c) => (
              <li key={c.slice(0, 30)}>{c}</li>
            ))}
          </ul>
        </section>
      )}

      {p.awards.length > 0 && (
        <section className=" rounded-sm border-2 border-line bg-paper-raised px-5 py-5" aria-labelledby="pr-awards">
          <h2 id="pr-awards" className={label}>Awards and certifications</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-ink-muted">
            {p.awards.map((a) => (
              <li key={a.slice(0, 30)}>{a}</li>
            ))}
          </ul>
        </section>
      )}

      {cultivars.length > 0 && (
        <p className=" rounded-sm border border-line bg-matcha-soft px-5 py-3 text-sm text-ink-muted">
          Tea plants tied to this company:{" "}
          {cultivars.map((c, i) => (
            <span key={c.slug}>
              {i > 0 && ", "}
              <Link href={`/cultivars/${c.slug}`} className="text-matcha underline hover:text-forest">{c.name}</Link>
            </span>
          ))}
          .
        </p>
      )}

      {pins.length > 0 && (
        <section className=" rounded-sm border-2 border-line bg-paper-raised px-5 py-5" aria-labelledby="pr-map">
          <h2 id="pr-map" className={label}>Where it is</h2>
          <p className="max-w-3xl text-sm text-ink-muted">Based in {p.basedIn}. The pin marks the town, not a street address.</p>
          <div className="mt-4">
            <CultivarMap pins={pins} label={`Map showing ${p.basedIn}`} one="{n} product in MatchaDB" many="{n} products in MatchaDB" openLabel="" />
          </div>
        </section>
      )}

        </div>
      </div>
      <p className="mt-8 max-w-3xl rounded-sm border border-line bg-paper-raised px-5 py-4 text-xs leading-relaxed text-ink-faint">
        Sources:{" "}
        {p.sources.map((s, i) => (
          <span key={s.url}>
            {i > 0 && "; "}
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-muted">{s.label}</a>
          </span>
        ))}
        . Most of this is the company&apos;s own account of its history; where it says something about itself, the page says so. Spotted a mistake?{" "}
        <Link href="/contact" className="underline hover:text-ink-muted">Tell us</Link>.
      </p>

      {related.length > 0 && (
        <section className="mt-12" aria-labelledby="pr-more">
          <h2 id="pr-more" className={label}>More producers</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {related.map((r) => (
              <Link key={r.slug} href={`/producers/${r.slug}`} className="rounded-sm border border-line bg-paper-raised p-4 hover:border-matcha hover:bg-matcha-soft">
                <span className="block font-display text-lg font-semibold text-ink">{r.name}</span>
                <span className="mt-1 block text-xs text-ink-faint">Founded {r.founded} · {r.basedIn}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
