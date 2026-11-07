import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import { Comments } from "@/components/Comments";
import { FavoriteCafeButton } from "@/components/FavoriteCafeButton";
import { JsonLd } from "@/components/JsonLd";
import { ProductRating } from "@/components/ProductRating";
import { getCafeBySlug, nearbyCafes } from "@/lib/cafes";
import { CAT_LABEL, countryName, cafeSlug, directionsUrl, formatPlace } from "@/lib/cafe-types";
import { CONTACT_EMAIL } from "@/lib/site";
import { getT } from "@/i18n/server";
import { INTL_LANG, isLocale, type Locale } from "@/i18n/config";
import { pageAlternates } from "@/i18n/seo";
import { rich } from "@/i18n/rich";

// Café pages are built the first time someone asks for them, then kept for a day.
export const revalidate = 86400;
export const dynamicParams = true;

type Params = { lang: string; slug: string };

const fmtDate = (iso: string, lang: Locale) => new Date(iso + "T12:00:00").toLocaleDateString(INTL_LANG[lang], { year: "numeric", month: "short", day: "numeric" });
const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};
// "Austin, TX" in the US, "Kyoto, Japan" elsewhere.
const loc = (c: { city: string; state: string; cc?: string }, lang: Locale) => (!c.cc || c.cc === "US" ? [c.city, c.state] : [c.city, countryName(c.cc, lang)]).filter(Boolean).join(", ");

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang: raw, slug } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  const c = getCafeBySlug(slug);
  if (!c) return { title: t("cafe.notFound"), robots: { index: false } };
  const title = t("cafe.meta.title", { name: c.name, loc: loc(c, lang) });
  const description = t(c.via === "name" ? "cafe.meta.desc.name" : "cafe.meta.desc.web", { name: c.name, where: formatPlace(c, lang) });
  const alternates = pageAlternates(lang, `/cafes/${cafeSlug(c)}`);
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } };
}

export default async function CafePage({ params }: { params: Promise<Params> }) {
  const { lang: rawLang, slug } = await params;
  if (!isLocale(rawLang)) notFound();
  const lang: Locale = rawLang;
  const t = getT(lang);
  const c = getCafeBySlug(slug);
  if (!c) notFound();
  const where = formatPlace(c, lang);
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
          address: { "@type": "PostalAddress", streetAddress: c.address, addressLocality: c.city, addressRegion: c.state || undefined, postalCode: c.zip, addressCountry: c.cc ?? "US" },
          geo: { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lng },
        }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-ink-faint">
        <Link href="/cafes" className="hover:text-ink-muted">
          {t("cafe.crumb")}
        </Link>{" "}
        / {loc(c, lang)}
      </nav>

      <header className="mt-3">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink leading-tight text-balance">{c.name}</h1>
        <p className="mt-2 text-ink-muted">{where}</p>
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="rounded-full border border-line-strong px-2 py-0.5 text-ink-muted">{CAT_LABEL[c.cat] ? t(`cafe.cat.${c.cat}` as "cafe.cat.cafe") : t("cafe.cat.cafe")}</span>
          <span className="rounded-full bg-matcha-soft px-2 py-0.5 text-matcha-ink">{c.via === "name" ? t("c.cf.inName") : t("c.cf.onSite")}</span>
          {c.focus && c.via !== "name" && <span className="rounded-full bg-gold-soft px-2 py-0.5 text-gold">{t("c.cf.focused")}</span>}
        </p>
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <a href={directionsUrl(c)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-matcha px-5 py-2 font-medium text-paper hover:bg-forest transition-colors">
            {t("cafe.directions")}
          </a>
          {c.url && (
            <a href={c.url} target="_blank" rel="noopener noreferrer" className="self-center text-matcha hover:text-forest underline">
              {t("cafe.website", { host: hostOf(c.url) })}
            </a>
          )}
          {c.phone && (
            <a href={`tel:${c.phone}`} className="self-center text-matcha hover:text-forest underline">
              {c.phone.replace(/^\+?1?(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3")}
            </a>
          )}
        </p>
      </header>

      <FavoriteCafeButton cafeId={c.id} name={c.name} />
      <ProductRating cafeId={c.id} productName={c.name} />

      <section className="mt-10" aria-labelledby="cafe-menu">
        <h2 id="cafe-menu" className="font-display text-xl font-semibold text-ink">
          {t("cafe.menu.h2")}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          {c.via === "name" ? t("cafe.menu.name") : t("cafe.menu.web", { date: fmtDate(c.checked, lang) })}
        </p>
        {c.ev.length > 0 && (<ul className="mt-4 flex flex-col gap-3">
          {c.ev.map((e) => (
            <li key={e.u} className="rounded-sm border border-line bg-paper-raised px-4 py-3">
              {e.s.map((q) =>
                e.st === 1 ? (
                  <p key={q} className="text-sm text-ink leading-relaxed [&:not(:first-of-type)]:mt-2">
                    {rich(t("cafe.menuItem", { item: "{item}" }), { item: <strong>{q}</strong> })}
                  </p>
                ) : (
                <p key={q} className="text-sm text-ink leading-relaxed [&:not(:first-of-type)]:mt-2">
                  &ldquo;&hellip;
                  {q
                    .replace(/\s+/g, " ")
                    .split(/(\bmatchas?\b|\bmaccha\b|抹茶|まっちゃ|マッチャ|말차)/i)
                    .map((part, i) => (/^(matchas?|maccha|抹茶|まっちゃ|マッチャ|말차)$/i.test(part) ? <strong key={i}>{part}</strong> : part))}
                  &hellip;&rdquo;
                </p>
                )
              )}
              <p className="mt-1.5 text-xs text-ink-faint">
                {rich(t(e.k === "menu" ? "cafe.from.menu" : e.k === "home" ? "cafe.from.home" : "cafe.from.other", { link: "{link}" }), {
                  link: (
                    <a href={e.u} target="_blank" rel="noopener noreferrer" className={link}>
                      {hostOf(e.u)}
                    </a>
                  ),
                })}
              </p>
            </li>
          ))}
        </ul>)}
        {(c.menu || c.platform || c.pdf) && (
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {c.menu && (
              <a href={c.menu} target="_blank" rel="noopener noreferrer" className={link}>
                {t("cafe.fullMenu")}
              </a>
            )}
            {c.platform && (
              <a href={c.platform} target="_blank" rel="noopener noreferrer" className={link}>
                {t("cafe.order")}
              </a>
            )}
            {c.pdf && (
              <a href={c.pdf} target="_blank" rel="noopener noreferrer" className={link}>
                {t("cafe.pdf")}
              </a>
            )}
          </p>
        )}
        {c.shared > 1 && <p className="mt-3 text-xs text-ink-faint">{t("cafe.shared", { count: c.shared })}</p>}
      </section>

      <Comments targetType="cafe" targetKey={c.id} subject={c.name} heading={t("cafe.reviews.heading")} placeholder={t("cafe.reviews.ph")} />

      {near.length > 0 && (
        <section className="mt-12" aria-labelledby="cafe-near">
          <h2 id="cafe-near" className="font-display text-xl font-semibold text-ink">
            {t("cafe.near")}
          </h2>
          <ul className="mt-3 flex flex-col divide-y divide-line border-y border-line">
            {near.map((n) => (
              <li key={n.id} className="flex items-baseline justify-between gap-3 py-2.5">
                <Link href={`/cafes/${cafeSlug(n)}`} className="text-ink hover:text-matcha">
                  {n.name}
                  <span className="ml-2 text-sm text-ink-faint">{loc(n, lang)}</span>
                </Link>
                <span className="text-xs tabular-nums text-ink-faint whitespace-nowrap">
                  {(() => {
                    const d = !n.cc || n.cc === "US" ? n.miles : n.miles * 1.609344;
                    return `${d < 10 ? d.toFixed(1) : Math.round(d)} ${!n.cc || n.cc === "US" ? "mi" : "km"}`;
                  })()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 text-sm text-ink-muted">
        {rich(t("cafe.correct", { link: "{link}" }), {
          link: (
            <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`MatchaDB café correction: ${c.name}`)}`} className={link}>
              {t("cafe.correct.link")}
            </a>
          ),
        })}
      </p>
    </main>
  );
}
