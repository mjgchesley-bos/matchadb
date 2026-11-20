import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { notFound, permanentRedirect } from "next/navigation";
import { Comments } from "@/components/Comments";
import { FavoriteCafeButton } from "@/components/FavoriteCafeButton";
import { ReportNoMatchaButton } from "@/components/ReportNoMatchaButton";
import { CafeMenuManager } from "@/components/CafeMenuManager";
import { JsonLd } from "@/components/JsonLd";
import { ProductRating } from "@/components/ProductRating";
import { chainSiblings, getCafeBySlug, nearbyCafes, redirectedCafeSlug } from "@/lib/cafes";
import { countryName, cafeSlug, directionsUrl, formatPlace } from "@/lib/cafe-types";
import { getCafeProfile, getCafeExtras } from "@/lib/cafe-profiles";
import { MiniMap } from "@/components/MiniMap";
import { OwnerCafeSections } from "@/components/OwnerCafeSections";
import { getOwnerData } from "@/lib/cafe-owner-page-server";
import { accentStyle, cafeMediaUrl, DAYS } from "@/lib/cafe-owner-page";
import { SocialIcons } from "@/components/SocialIcons";
import { matchaItem } from "@/lib/cafe-snippet";
import { CONTACT_EMAIL } from "@/lib/site";
import { getT } from "@/i18n/server";
import { INTL_LANG, isLocale, localePath, type Locale } from "@/i18n/config";
import { pageAlternates } from "@/i18n/seo";
import { rich } from "@/i18n/rich";

const fmtDate = (iso: string, lang: Locale) => new Date(iso + "T12:00:00").toLocaleDateString(INTL_LANG[lang], { year: "numeric", month: "short", day: "numeric" });
// Café pages are built the first time someone asks for them, then kept for a day.
export const revalidate = 86400;
export const dynamicParams = true;

type Params = { lang: string; slug: string };

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
  if (!c) {
    const to = redirectedCafeSlug(slug);
    if (to) permanentRedirect(localePath(lang, `/cafes/${to}`));
    notFound();
  }
  // A venue renamed with its place in brackets keeps working at its old address, which now forwards to the current one (one page for Google, not two).
  if (slug !== cafeSlug(c)) permanentRedirect(localePath(lang, `/cafes/${cafeSlug(c)}`));
  const where = formatPlace(c, lang);
  const near = nearbyCafes(c, 5);
  const cc = (c.cc || "US").toUpperCase();
  const siblings = chainSiblings(c);
  const profile = getCafeProfile(c.id);
  const owner = await getOwnerData(c.id);  // set when the verified owner has customised the page
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
  // Link-in-bio pages (Linktree and friends) are shown as their own "All links" icon, not as the café's website.
  const HUBS = /(^|\.)(linktr\.ee|beacons\.ai|bio\.link|lnk\.bio|linkin\.bio|campsite\.bio|taplink\.cc|solo\.to|msha\.ke|stan\.store|carrd\.co)$/i;
  const isHub = (u: string | null | undefined) => !!u && HUBS.test(hostOf(u));
  const hubUrl = [c.url, ...c.ev.map((e) => e.u), ...(profile?.links ?? []).map((l) => l.url)].find((u) => isHub(u)) ?? null;
  if (hubUrl) socialLinks.linkinbio = hubUrl;
  const siteUrl = c.url && !isHub(c.url) ? c.url : null;
  // Pages that mention the café (news, review sites), one per site, never the café's own site, its social profiles or its link-in-bio page.
  const usedHosts = new Set([ownHost, ...Object.values(socialLinks).map((u) => hostOf(u))]);
  const aroundWeb = [
    ...c.ev.map((e) => ({ url: e.u, label: "" })),
    ...(profile?.sources ?? []).map((x) => ({ url: x.url, label: x.label })),
  ].filter((x) => !socialKey(x.url) && !isHub(x.url) && !usedHosts.has(hostOf(x.url)));
  const aroundWebList = [...new Map(aroundWeb.map((x) => [hostOf(x.url), x] as const)).values()].map((x) => ({ ...x, host: hostOf(x.url), label: x.label || SOCIAL[hostOf(x.url)] || hostOf(x.url) }));
  for (const [k, v] of Object.entries(owner?.page.links ?? {})) socialLinks[k] = v;
  if (owner?.page.website_url) socialLinks.website = owner.page.website_url;
  const phone = owner?.page.phone ?? c.phone ?? extra?.phone ?? null;
  const ownerHours = owner ? DAYS.filter(([k]) => owner.page.hours[k]).map(([k, name]) => `${name}: ${owner.page.hours[k]}`) : [];
  const hours = ownerHours.length ? ownerHours : (profile?.hours ?? extra?.hours ?? null);

  return (
    <main style={owner ? accentStyle(owner.page.accent) : undefined} className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
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

      {owner?.page.cover_path && (
        // eslint-disable-next-line @next/next/no-img-element -- owner cover photo from storage
        <img src={cafeMediaUrl(owner.page.cover_path)} alt={`${c.name}`} className="mt-3 h-40 w-full rounded-sm border-2 border-line-strong object-cover sm:h-64" />
      )}
      {owner?.page.announcement && (
        <p className="mt-3 rounded-sm border-2 border-matcha bg-matcha-soft px-4 py-3 text-sm font-medium text-forest" role="status">{owner.page.announcement}</p>
      )}
      <header className="mt-3 rounded-sm border-2 border-line-strong bg-paper-raised p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink leading-tight text-balance">{c.name}</h1>
            <p className="mt-2 text-ink-muted">{where}</p>
            {owner?.page.tagline && <p className="mt-2 font-display text-lg text-forest">{owner.page.tagline}</p>}
            {owner && <p className="mt-2"><span className="inline-flex items-center gap-1.5 rounded-full border border-matcha bg-matcha-soft px-3 py-0.5 text-xs font-medium text-forest">✓ Verified owner</span></p>}
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
              {siteUrl && (
                <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="self-center rounded-full border border-matcha px-4 py-1.5 font-medium text-matcha hover:bg-matcha-soft">
                  {t("cafe.website", { host: hostOf(siteUrl) })}
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
              {owner?.page.order_url && (
                <a href={owner.page.order_url} target="_blank" rel="noopener noreferrer" className="self-center rounded-full border border-matcha px-4 py-1.5 font-medium text-matcha hover:bg-matcha-soft">Order online</a>
              )}
              {owner?.page.reservation_url && (
                <a href={owner.page.reservation_url} target="_blank" rel="noopener noreferrer" className="self-center rounded-full border border-matcha px-4 py-1.5 font-medium text-matcha hover:bg-matcha-soft">Reserve a table</a>
              )}
              {owner?.page.public_email && (
                <a href={`mailto:${owner.page.public_email}`} className="self-center text-matcha hover:text-forest underline">{owner.page.public_email}</a>
              )}
              {phone && (
                <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="self-center text-matcha hover:text-forest underline">
                  {phone.replace(/^\+?1?[\s-]*(\d{3})[\s.-]*(\d{3})[\s.-]*(\d{4})$/, "($1) $2-$3")}
                </a>
              )}
            </p>
            <div className="mt-4"><SocialIcons links={socialLinks} /></div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <FavoriteCafeButton cafeId={c.id} name={c.name} />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <MiniMap lat={c.lat} lng={c.lng} label={`Map of ${c.name}`} />
            {hours && hours.length > 0 && (
              <div className="rounded-sm border border-line p-4">
                <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-forest">Hours</h2>
                <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-muted">{hours.map((h) => <li key={h}>{h}</li>)}</ul>
                <p className="mt-2 text-xs text-ink-faint">{ownerHours.length ? "Set by the owner." : profile?.hours ? "As reported at opening; check before you go." : "From their website; check before you go."}</p>
              </div>
            )}
          </div>
        </div>
      </header>

      {owner && <OwnerCafeSections name={c.name} page={owner.page} photos={owner.photos} files={owner.files} products={owner.products} />}

      {profile && !owner?.page.bio && (
        <section aria-labelledby="cafe-about" className="mt-6 overflow-hidden rounded-md border-2 border-matcha bg-gradient-to-br from-matcha-soft to-paper-raised shadow-sm">
          <div className="border-b-2 border-matcha/40 px-5 py-4 sm:px-7">
            <h2 id="cafe-about" className="font-mono text-xs uppercase tracking-[0.2em] text-forest">About</h2>
            <p className="mt-1 font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">{c.name}</p>
          </div>
          <div className="flex flex-col gap-5 p-5 sm:p-7">
            {profile.about && <p className="max-w-3xl text-base leading-relaxed text-ink sm:text-lg">{profile.about}</p>}
            {profile.matcha && (
              <div className="flex items-start gap-3 rounded-md border-2 border-matcha/50 bg-paper-raised px-4 py-3 shadow-sm">
                <span aria-hidden="true" className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-matcha bg-matcha-soft text-sm font-semibold text-forest">茶</span>
                <p className="text-sm leading-relaxed text-ink-muted"><span className="block font-mono text-xs uppercase tracking-[0.2em] text-forest">The matcha</span>{profile.matcha}</p>
              </div>
            )}
            {profile.menu && profile.menu.length > 0 && (
              <div>
                <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-forest">Matcha menu highlights</h3>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {profile.menu.map((m) => (
                    <li key={m.name} className="rounded-md border-2 border-line bg-paper-raised px-4 py-3 shadow-sm">
                      <p className="flex items-center gap-2 font-display text-base font-semibold text-ink"><span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-matcha" />{m.name}</p>
                      {m.note && <p className="mt-1 text-sm leading-snug text-ink-muted">{m.note}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {profile.facts && profile.facts.length > 0 && (
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {profile.facts.map(([k, v]) => (
                  <div key={k} className="rounded-md border-2 border-matcha/50 bg-paper-raised px-4 py-3 shadow-sm">
                    <dt className="font-mono text-xs uppercase tracking-[0.2em] text-forest">{k}</dt>
                    <dd className="mt-1 text-sm leading-snug text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>
      )}

      {aroundWebList.length > 0 && (
        <section aria-labelledby="cafe-web" className="mt-6 rounded-sm border-2 border-line bg-paper-raised p-5 sm:p-6">
          <h2 id="cafe-web" className="font-mono text-xs uppercase tracking-[0.2em] text-forest">{lang === "en" ? "From around the web" : t("cafe.menu.h2")}</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {aroundWebList.map((x) => (
              <li key={x.host}>
                <a href={x.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-sm border border-line bg-paper px-4 py-2.5 text-sm hover:border-matcha hover:bg-matcha-soft">
                  <span className="font-medium text-ink">{x.label}</span>
                  <span className="text-xs text-ink-faint">{x.host} ↗</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Comments targetType="cafe" targetKey={c.id} subject={c.name} heading={t("cafe.reviews.heading")} placeholder={t("cafe.reviews.ph")} siblings={siblings} />

      <CafeMenuManager cafeId={c.id} cafeName={c.name} fallbackTitle={t("cafe.menu.h2")}>
        <>
        <p className="text-sm text-ink-muted">
          {c.via === "name" ? t("cafe.menu.name") : c.via === "reported" ? t("cafe.menu.reported") : t("cafe.menu.web", { date: fmtDate(c.checked, lang) })}
        </p>
        {c.ev.length > 0 && (<ul className="mt-4 flex flex-col gap-3">
          {c.ev.map((e) => (
            <li key={e.u} className="rounded-sm border-2 border-matcha bg-matcha-soft px-4 py-3">
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
        </>
      </CafeMenuManager>





      {near.length > 0 && (
        <section className="mt-8 rounded-sm border-2 border-line bg-paper-raised p-5 sm:p-6" aria-labelledby="cafe-near">
          <h2 id="cafe-near" className="font-mono text-xs uppercase tracking-[0.2em] text-forest">
            {t("cafe.near")}
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {near.map((n) => (
              <li key={n.id} className="flex items-baseline justify-between gap-3 rounded-sm border border-line bg-paper px-4 py-2.5 hover:border-matcha hover:bg-matcha-soft">
                <Link href={`/cafes/${cafeSlug(n)}`} className="min-w-0 text-ink hover:text-matcha">
                  <span className="font-medium">{n.name}</span>
                  <span className="block text-xs text-ink-faint">{loc(n, lang)}</span>
                </Link>
                <span className="text-xs tabular-nums text-ink-muted whitespace-nowrap rounded-full bg-matcha-soft px-2 py-0.5">
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

      <p className="mt-8 rounded-sm border border-line bg-paper-raised px-5 py-4 text-sm text-ink-muted">
        {rich(t("cafe.correct", { link: "{link}" }), {
          link: (
            <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`MatchaDB café correction: ${c.name}`)}`} className={link}>
              {t("cafe.correct.link")}
            </a>
          ),
        })}
      </p>

      <div className="mt-4 flex justify-center">
        <ReportNoMatchaButton cafeId={c.id} name={c.name} />
      </div>
    </main>
  );
}
