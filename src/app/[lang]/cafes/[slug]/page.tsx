import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import { Comments } from "@/components/Comments";
import { FavoriteCafeButton } from "@/components/FavoriteCafeButton";
import { ReportNoMatchaButton } from "@/components/ReportNoMatchaButton";
import { CafeMenuManager } from "@/components/CafeMenuManager";
import { JsonLd } from "@/components/JsonLd";
import { ProductRating } from "@/components/ProductRating";
import { chainSiblings, getCafeBySlug, nearbyCafes } from "@/lib/cafes";
import { citySlug, cityPath, getPlaceIndex, MIN_CAFES_FOR_CITY_PAGE } from "@/lib/cafe-places";
import { CAT_LABEL, countryName, cafeSlug, directionsUrl, formatPlace } from "@/lib/cafe-types";
import { getCafeProfile, getCafeExtras } from "@/lib/cafe-profiles";
import { MiniMap } from "@/components/MiniMap";
import { SocialIcons } from "@/components/SocialIcons";
import { matchaItem } from "@/lib/cafe-snippet";
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
const SOCIAL: Record<string, string> = { "instagram.com": "Instagram", "facebook.com": "Facebook", "tiktok.com": "TikTok", "yelp.com": "Yelp", "x.com": "X", "twitter.com": "X", "youtube.com": "YouTube", "tripadvisor.com": "Tripadvisor" };
const loc = (c: { city: string; state: string; cc?: string }, lang: Locale) => (!c.cc || c.cc === "US" ? [c.city, c.state] : [c.city, countryName(c.cc, lang)]).filter(Boolean).join(", ");

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang: raw, slug } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  const c = getCafeBySlug(slug);
  if (!c) return { title: t("cafe.notFound"), robots: { index: false } };
  let title = t("cafe.meta.title", { name: c.name, loc: loc(c, lang) });
  let description = t(c.via === "name" ? "cafe.meta.desc.name" : c.via === "reported" ? "cafe.meta.desc.reported" : "cafe.meta.desc.web", { name: c.name, where: formatPlace(c, lang) });
  if (lang === "en") {
    // People search "{café} menu"; say so in the title, and when the café's own menu shows a clean matcha item with a price, quote it.
    title = `${c.name} Menu: Matcha in ${loc(c, lang)}`;
    const item = c.via === "web" || !c.via ? matchaItem(c) : null;
    const tail = "Menu, directions, and member ratings and reviews.";
    if (item) description = `${c.name} in ${c.city || loc(c, lang)} lists ${item.name} at ${item.price} on its own menu. ${tail}`;
    else if (c.via === "name") description = `${c.name} at ${formatPlace(c, lang)} is named for matcha. ${tail}`;
    else if (c.via === "reported") description = `${c.name} at ${formatPlace(c, lang)} is reported by locals to serve matcha. ${tail}`;
    else description = `${c.name} at ${formatPlace(c, lang)} lists matcha on its own website. ${tail}`;
    // Japanese cafés are searched for by their Japanese name, so the title and snippet carry the Japanese words too.
    if (c.cc === "JP" && /[぀-ヿ一-鿿]/.test(c.name)) {
      title = `${c.name} メニュー・抹茶 | Matcha menu in ${c.city || "Japan"}`;
      description = `${c.name}の抹茶メニュー、住所、地図。${description}`;
    }
  }
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
  const cc = (c.cc || "US").toUpperCase();
  const cityEntry = c.city ? getPlaceIndex().cities.get(`${cc}/${citySlug(c.city, cc === "US" ? c.state : "")}`) : undefined;
  const cityHub = cityEntry && cityEntry.cafes.length >= MIN_CAFES_FOR_CITY_PAGE ? cityPath(cityEntry) : null;
  const siblings = chainSiblings(c);
  const profile = getCafeProfile(c.id);
  const link = "text-matcha hover:text-forest underline";
  // The café's other pages and handles (Instagram, Yelp, TikTok...): every source host that is not its own website.
  const ownHost = c.url ? hostOf(c.url) : "";
  const extra = getCafeExtras(c.id);
  const socialKey = (u: string) => {
    const h = hostOf(u);
    return h === "instagram.com" ? "instagram" : h === "facebook.com" ? "facebook" : h === "tiktok.com" ? "tiktok" : h === "x.com" || h === "twitter.com" ? "x" : h === "youtube.com" ? "youtube" : null;
  };
  const socialLinks: Record<string, string> = { ...(extra?.social ?? {}) };
  for (const u of [...c.ev.map((e) => e.u), ...(profile?.links ?? []).map((l) => l.url)]) {
    const k = socialKey(u);
    if (k && !socialLinks[k]) socialLinks[k] = u;
  }
  // Other pages that mention the café (news, review sites): shown as small source links, not icons.
  const socials = [...new Map(c.ev.filter((e) => hostOf(e.u) !== ownHost && !socialKey(e.u)).map((e) => [hostOf(e.u), e.u] as const)).entries()].map(([host, url]) => ({ host, url, label: SOCIAL[host] ?? host }));
  const phone = c.phone ?? extra?.phone ?? null;
  const hours = profile?.hours ?? extra?.hours ?? null;

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CafeOrCoffeeShop",
          name: c.name,
          url: c.url ?? undefined,
          telephone: c.phone ?? undefined,
          hasMenu: c.menu ?? undefined,
          address: { "@type": "PostalAddress", streetAddress: c.address, addressLocality: c.city, addressRegion: c.state || undefined, postalCode: c.zip, addressCountry: c.cc ?? "US" },
          geo: { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lng },
        }}
      />

      <nav aria-label={t("prod.crumb.aria")} className="text-sm text-ink-faint">
        <Link href="/matcha-map" className="hover:text-ink-muted">
          {t("cafe.crumb")}
        </Link>{" "}
        / {loc(c, lang)}
      </nav>

      <header className="mt-3 rounded-sm border-2 border-line-strong bg-paper-raised p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink leading-tight text-balance">{c.name}</h1>
            <p className="mt-2 text-ink-muted">{where}</p>
            <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="rounded-full border border-line-strong px-2 py-0.5 text-ink-muted">{CAT_LABEL[c.cat] ? t(`cafe.cat.${c.cat}` as "cafe.cat.cafe") : t("cafe.cat.cafe")}</span>
              <span className="rounded-full bg-matcha-soft px-2 py-0.5 text-matcha-ink">{c.via === "name" ? t("c.cf.inName") : c.via === "reported" ? t("c.cf.reported") : t("c.cf.onSite")}</span>
            </p>
            <ProductRating key={c.id} cafeId={c.id} productName={c.name} className="mt-4 rounded-sm border border-line bg-paper px-4 py-3 max-w-md" />
            {extra?.desc && !profile?.about && (
              <p className="mt-4 max-w-prose text-sm italic leading-relaxed text-ink-muted">
                &ldquo;{extra.desc}&rdquo; <span className="not-italic text-ink-faint">· {ownHost}</span>
              </p>
            )}
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <a href={directionsUrl(c)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-matcha px-5 py-2 font-medium text-paper hover:bg-forest transition-colors">
                {t("cafe.directions")}
              </a>
              {c.url && (
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="self-center text-matcha hover:text-forest underline">
                  {t("cafe.website", { host: hostOf(c.url) })}
                </a>
              )}
              {c.menu && (
                <a href={c.menu} target="_blank" rel="noopener noreferrer" className="self-center text-matcha hover:text-forest underline">
                  {t("cafe.fullMenu")}
                </a>
              )}
              {c.platform && (
                <a href={c.platform} target="_blank" rel="noopener noreferrer" className="self-center text-matcha hover:text-forest underline">
                  {t("cafe.order")}
                </a>
              )}
              {c.pdf && (
                <a href={c.pdf} target="_blank" rel="noopener noreferrer" className="self-center text-matcha hover:text-forest underline">
                  {t("cafe.pdf")}
                </a>
              )}
              {phone && (
                <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="self-center text-matcha hover:text-forest underline">
                  {phone.replace(/^\+?1?[\s-]*(\d{3})[\s.-]*(\d{3})[\s.-]*(\d{4})$/, "($1) $2-$3")}
                </a>
              )}
            </p>
            <div className="mt-4"><SocialIcons links={socialLinks} /></div>
            {socials.length > 0 && (
              <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-faint">
                <span>{lang === "en" ? "Also mentioned by" : ""}</span>
                {socials.map((x) => (
                  <a key={x.host} href={x.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-muted">{x.label}</a>
                ))}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <FavoriteCafeButton cafeId={c.id} name={c.name} />
              <ReportNoMatchaButton cafeId={c.id} name={c.name} />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <MiniMap lat={c.lat} lng={c.lng} label={`Map of ${c.name}`} />
            {hours && hours.length > 0 && (
              <div className="rounded-sm border border-line p-4">
                <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-forest">Hours</h2>
                <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-muted">{hours.map((h) => <li key={h}>{h}</li>)}</ul>
                <p className="mt-2 text-xs text-ink-faint">{profile?.hours ? "As reported at opening; check before you go." : "From their website; check before you go."}</p>
              </div>
            )}
          </div>
        </div>
      </header>

      {profile && (
        <section aria-labelledby="cafe-about" className="mt-8 rounded-sm border-2 border-line-strong bg-paper-raised p-5 sm:p-6">
          <h2 id="cafe-about" className="font-mono text-xs uppercase tracking-[0.2em] text-forest">About {c.name}</h2>
          {profile.about && <p className="mt-3 max-w-prose leading-relaxed text-ink">{profile.about}</p>}
          {profile.matcha && <p className="mt-3 text-sm text-ink-muted"><strong className="font-semibold text-ink">The matcha:</strong> {profile.matcha}</p>}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {profile.menu && profile.menu.length > 0 && (
              <div className="rounded-sm border border-line p-4">
                <h3 className="font-display text-base font-semibold text-ink">Matcha menu highlights</h3>
                <ul className="mt-2 flex flex-col gap-2 text-sm">
                  {profile.menu.map((m) => (
                    <li key={m.name}><span className="font-medium text-ink">{m.name}</span>{m.note && <span className="text-ink-muted"> · {m.note}</span>}</li>
                  ))}
                </ul>
              </div>
            )}
            {((profile.hours && profile.hours.length > 0) || (profile.facts && profile.facts.length > 0)) && (
              <div className="flex flex-col gap-4">
                {profile.hours && profile.hours.length > 0 && (
                  <div className="rounded-sm border border-line p-4">
                    <h3 className="font-display text-base font-semibold text-ink">When to go</h3>
                    <ul className="mt-2 flex flex-col gap-1.5 text-sm text-ink-muted">{profile.hours.map((h) => <li key={h}>{h}</li>)}</ul>
                  </div>
                )}
                {profile.facts && profile.facts.length > 0 && (
                  <dl className="rounded-sm border border-line p-4 text-sm">
                    {profile.facts.map(([k, v]) => (
                      <div key={k} className="flex gap-3 py-1"><dt className="w-20 shrink-0 text-ink-faint">{k}</dt><dd className="text-ink">{v}</dd></div>
                    ))}
                  </dl>
                )}
              </div>
            )}
          </div>
          {profile.links && profile.links.length > 0 && (
            <p className="mt-4 flex flex-wrap gap-2 text-sm">
              {profile.links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-line-strong px-3 py-1 text-ink hover:bg-matcha-soft">{l.label}</a>
              ))}
            </p>
          )}
          {profile.sources && profile.sources.length > 0 && (
            <p className="mt-4 text-xs text-ink-faint">
              Sources:{" "}
              {profile.sources.map((x, i) => (
                <span key={x.url}>{i > 0 && " · "}<a href={x.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-muted">{x.label}</a></span>
              ))}
            </p>
          )}
        </section>
      )}

      <Comments targetType="cafe" targetKey={c.id} subject={c.name} heading={t("cafe.reviews.heading")} placeholder={t("cafe.reviews.ph")} siblings={siblings} />

      <CafeMenuManager cafeId={c.id} cafeName={c.name} />

      {cityHub && (
        <p className="mt-8 text-sm">
          <Link href={cityHub} className="text-matcha underline hover:text-forest">{t("pl.more", { city: c.city })}</Link>
        </p>
      )}

      <details className="group mt-10 rounded-sm border border-line bg-paper-raised">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
          <h2 id="cafe-menu" className="font-display text-lg font-semibold text-ink">
            {t("cafe.menu.h2")}
          </h2>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 8l5 5 5-5" /></svg>
        </summary>
        <div className="px-4 pb-4">
        <p className="text-sm text-ink-muted">
          {c.via === "name" ? t("cafe.menu.name") : c.via === "reported" ? t("cafe.menu.reported") : t("cafe.menu.web", { date: fmtDate(c.checked, lang) })}
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
        {c.shared > 1 && <p className="mt-3 text-xs text-ink-faint">{t("cafe.shared", { count: c.shared })}</p>}
        </div>
      </details>


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
