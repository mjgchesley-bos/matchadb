import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import { Comments } from "@/components/Comments";
import { JsonLd } from "@/components/JsonLd";
import { formatPlace } from "@/lib/cafe-types";
import { getStores } from "@/lib/stores";
import { SITE_URL } from "@/lib/site";
import { langOf } from "@/i18n/params";
import { isLocale, type Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { pageAlternates } from "@/i18n/seo";

// A shop on the stores map that has its own page, for the comments members left about it. Only stores that carry
// a `commentsFrom` id are linked from the map; the id keeps comments left when the venue was on the café map.
export function generateStaticParams() {
  return getStores().filter((s) => s.commentsFrom).map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }): Promise<Metadata> {
  const { lang: raw, id } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const s = getStores().find((x) => x.id === id);
  if (!s) return {};
  const alternates = pageAlternates(lang, `/stores/${s.id}`);
  const title = `${s.name}, ${s.city}`;
  return { title, description: s.note ?? `${s.name} in ${s.city}: a shop that sells matcha.`, alternates, openGraph: { title, url: alternates.canonical } };
}

export default async function StorePage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { id } = await params;
  const lang = await langOf(params);
  const t = getT(lang);
  const s = getStores().find((x) => x.id === id);
  if (!s) notFound();
  const place = formatPlace(s, lang);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${s.name}, ${place}`)}`;
  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Store",
          name: s.name,
          url: s.url,
          description: s.note,
          address: { "@type": "PostalAddress", streetAddress: s.address, addressLocality: s.city, postalCode: s.zip, addressCountry: s.cc ?? "US" },
          geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng },
          mainEntityOfPage: `${SITE_URL}/stores/${s.id}`,
        }}
      />
      <nav className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/" className="hover:text-matcha transition-colors">MatchaDB</Link>
        <span aria-hidden="true">/</span>
        <Link href="/stores" className="hover:text-matcha transition-colors">{t("c.st.page.crumb")}</Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink-faint">{s.name}</span>
      </nav>
      <header className="mt-6 rounded-sm border border-line bg-paper-raised p-5 sm:p-7">
        <h1 className="font-display text-3xl font-semibold text-ink leading-tight">{s.name}</h1>
        <p className="mt-2 text-ink-muted">{place}</p>
        {s.note && <p className="mt-4 max-w-2xl leading-relaxed text-ink-muted">{s.note}</p>}
        <p className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-5">
          {s.url && (
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-full bg-matcha px-6 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-forest">
              {t("c.st.website")}
            </a>
          )}
          <a href={directions} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-full border border-line-strong bg-paper-raised px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-matcha-soft">
            {t("c.cf.directions")}
          </a>
        </p>
      </header>
      {s.commentsFrom && (
        <div className="mt-6 rounded-sm border border-line bg-paper-raised p-5 sm:p-6 [&>section]:mt-0">
          <Comments targetType="cafe" targetKey={s.commentsFrom} subject={s.name} />
        </div>
      )}
      <p className="mt-6 text-sm">
        <Link href="/stores" className="text-matcha hover:text-forest">&larr; {t("c.st.page.back")}</Link>
      </p>
    </main>
  );
}
