import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Comments } from "@/components/Comments";
import { JsonLd } from "@/components/JsonLd";
import { ProductRating } from "@/components/ProductRating";
import { getCafeBySlug, nearbyCafes } from "@/lib/cafes";
import { CAT_LABEL, cafeSlug, directionsUrl, type Cafe } from "@/lib/cafe-types";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

// Café pages are built the first time someone asks for them, then kept for a day.
export const revalidate = 86400;
export const dynamicParams = true;

type Params = { slug: string };

const fmtDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};
const where = (c: Cafe) => [c.address, c.city, `${c.state} ${c.zip}`.trim()].filter(Boolean).join(", ");
const PAGE_KIND: Record<string, string> = { menu: "menu page", home: "homepage", other: "website" };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const c = getCafeBySlug(slug);
  if (!c) return { title: "Café not found", robots: { index: false } };
  const title = `${c.name}: Matcha in ${c.city}, ${c.state}`;
  const description = `${c.name} at ${where(c)} lists matcha on its own website. See where, get directions, and read member ratings, reviews and photos.`;
  return { title, description, alternates: { canonical: `${SITE_URL}/cafes/${cafeSlug(c)}` }, openGraph: { title, description, url: `${SITE_URL}/cafes/${cafeSlug(c)}` } };
}

export default async function CafePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const c = getCafeBySlug(slug);
  if (!c) notFound();
  const near = nearbyCafes(c, 5);
  const link = "text-matcha hover:text-forest underline";

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CafeOrCoffeeShop",
          name: c.name,
          url: c.url ?? undefined,
          telephone: c.phone ?? undefined,
          address: { "@type": "PostalAddress", streetAddress: c.address, addressLocality: c.city, addressRegion: c.state, postalCode: c.zip, addressCountry: "US" },
          geo: { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lng },
        }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-ink-faint">
        <Link href="/cafes" className="hover:text-ink-muted">
          Matcha cafés
        </Link>{" "}
        / {c.city}, {c.state}
      </nav>

      <header className="mt-3">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink leading-tight text-balance">{c.name}</h1>
        <p className="mt-2 text-ink-muted">{where(c)}</p>
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="rounded-full border border-line-strong px-2 py-0.5 text-ink-muted">{CAT_LABEL[c.cat] ?? "Café"}</span>
          <span className="rounded-full bg-matcha-soft px-2 py-0.5 text-matcha-ink">Matcha on their site</span>
          {c.focus && <span className="rounded-full bg-gold-soft px-2 py-0.5 text-gold">Matcha-focused</span>}
        </p>
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <a href={directionsUrl(c)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-matcha px-5 py-2 font-medium text-paper hover:bg-forest transition-colors">
            Directions
          </a>
          {c.url && (
            <a href={c.url} target="_blank" rel="noopener noreferrer" className="self-center text-matcha hover:text-forest underline">
              Website ({hostOf(c.url)})
            </a>
          )}
          {c.phone && (
            <a href={`tel:${c.phone}`} className="self-center text-matcha hover:text-forest underline">
              {c.phone.replace(/^\+?1?(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3")}
            </a>
          )}
        </p>
      </header>

      <ProductRating cafeId={c.id} productName={c.name} />

      <section className="mt-10" aria-labelledby="cafe-menu">
        <h2 id="cafe-menu" className="font-display text-xl font-semibold text-ink">
          Matcha on the menu
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          We found matcha on this café&apos;s own website on {fmtDate(c.checked)}. We can&apos;t see what is in stock today, so check the menu or call ahead.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {c.ev.map((e) => (
            <li key={e.u} className="rounded-sm border border-line bg-paper-raised px-4 py-3">
              {e.s.map((q) =>
                e.st === 1 ? (
                  <p key={q} className="text-sm text-ink leading-relaxed [&:not(:first-of-type)]:mt-2">
                    Menu item: <strong>{q}</strong>
                  </p>
                ) : (
                <p key={q} className="text-sm text-ink leading-relaxed [&:not(:first-of-type)]:mt-2">
                  &ldquo;&hellip;
                  {q
                    .replace(/\s+/g, " ")
                    .split(/(\bmatchas?\b)/i)
                    .map((part, i) => (/^matchas?$/i.test(part) ? <strong key={i}>{part}</strong> : part))}
                  &hellip;&rdquo;
                </p>
                )
              )}
              <p className="mt-1.5 text-xs text-ink-faint">
                From the café&apos;s {PAGE_KIND[e.k]},{" "}
                <a href={e.u} target="_blank" rel="noopener noreferrer" className={link}>
                  {hostOf(e.u)}
                </a>
              </p>
            </li>
          ))}
        </ul>
        {(c.menu || c.platform || c.pdf) && (
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {c.menu && (
              <a href={c.menu} target="_blank" rel="noopener noreferrer" className={link}>
                Full menu
              </a>
            )}
            {c.platform && (
              <a href={c.platform} target="_blank" rel="noopener noreferrer" className={link}>
                Order online
              </a>
            )}
            {c.pdf && (
              <a href={c.pdf} target="_blank" rel="noopener noreferrer" className={link}>
                Menu (PDF)
              </a>
            )}
          </p>
        )}
        {c.shared > 1 && <p className="mt-3 text-xs text-ink-faint">This website covers {c.shared} locations, so the menu may differ a little from one to another.</p>}
      </section>

      <Comments targetType="cafe" targetKey={c.id} subject={c.name} heading="Reviews & photos" placeholder="What did you order? How was the matcha? Add a photo of your drink." />

      {near.length > 0 && (
        <section className="mt-12" aria-labelledby="cafe-near">
          <h2 id="cafe-near" className="font-display text-xl font-semibold text-ink">
            More matcha cafés nearby
          </h2>
          <ul className="mt-3 flex flex-col divide-y divide-line border-y border-line">
            {near.map((n) => (
              <li key={n.id} className="flex items-baseline justify-between gap-3 py-2.5">
                <Link href={`/cafes/${cafeSlug(n)}`} className="text-ink hover:text-matcha">
                  {n.name}
                  <span className="ml-2 text-sm text-ink-faint">
                    {n.city}, {n.state}
                  </span>
                </Link>
                <span className="text-xs tabular-nums text-ink-faint whitespace-nowrap">{n.miles < 10 ? n.miles.toFixed(1) : Math.round(n.miles)} mi</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 text-sm text-ink-muted">
        Closed, moved, or the menu changed?{" "}
        <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`MatchaDB café correction: ${c.name}`)}`} className={link}>
          Tell us
        </a>
        .
      </p>
    </main>
  );
}
