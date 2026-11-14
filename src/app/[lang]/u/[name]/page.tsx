import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { FollowBar } from "@/components/Friends";
import { ProfileActions } from "@/components/ProfileActions";
import { BrandLogo } from "@/components/product-cards";
import { Stars } from "@/components/Stars";
import { TierIcon, hasTierIcon } from "@/components/TierIcon";
import { getProductById } from "@/lib/db";
import { getCafeSlimIndex } from "@/lib/cafes";
import { cafeSlug } from "@/lib/cafe-types";
import { removedIndex } from "@/lib/cafes-removed";
import { BADGES } from "@/lib/badges";
import { formatPrice } from "@/lib/price";
import { supabaseAnon } from "@/lib/supabase-server";
import type { MemberStats } from "@/components/AuthProvider";
import { langOf } from "@/i18n/params";
import { INTL_LANG, isLocale, type Locale } from "@/i18n/config";
import { getT, getTV } from "@/i18n/server";

// A member's public page. It exists only if the member switched "public profile" on in My matcha;
// otherwise the page is a plain 404, so nobody can tell whether a username exists.
export const revalidate = 60;

type Profile = {
  name: string;
  bio: string;
  avatar: string | null;
  avatar_path: string | null;
  how: string | null;
  since: string;
  stats: MemberStats;
  shelf: { product_id: number; status: "want" | "using" | "tried" }[];
  ratings: { product_id: number; score: number }[];
  brands: string[];
  cafes?: string[];
  cafe_ratings?: { cafe_id: string; score: number }[]; // present once public_profile_cafe_ratings.sql has been run
  cafe_rating_count?: number;
  lists: { name: string; items: number[] }[];
  reviews: { product_id: number; body: string; created_at: string }[];
  photos: string[];
};

async function load(name: string): Promise<Profile | null> {
  const { data } = await supabaseAnon().rpc("public_profile", { p_name: decodeURIComponent(name) });
  return (data as Profile | null) ?? null;
}

type Info = { name: string; brand: string; region: string | null; price: string | null };

export async function generateMetadata({ params }: { params: Promise<{ lang: string; name: string }> }): Promise<Metadata> {
  const { name, lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  const p = await load(name);
  if (!p) return {};
  return { title: t("u.title", { name: p.name }), description: t("u.desc", { name: p.name }), robots: { index: false, follow: false } };
}

const PHOTO_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gropvtwigbddfikcujhz.supabase.co"}/storage/v1/object/public/comment-photos/`;

function Section({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="mt-5 rounded-sm border border-line bg-paper-raised p-5 sm:p-6">
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      {note && <p className="mt-1 text-sm text-ink-faint">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function PublicProfilePage({ params }: { params: Promise<{ lang: string; name: string }> }) {
  const { name } = await params;
  const lang = await langOf(params);
  const t = getT(lang);
  const tv = getTV(lang);
  const monthFmt = new Intl.DateTimeFormat(INTL_LANG[lang], { year: "numeric", month: "long", timeZone: "UTC" });
  const p = await load(name);
  if (!p) notFound();

  const ids = [...new Set([...p.shelf.map((x) => x.product_id), ...p.ratings.map((x) => x.product_id), ...p.lists.flatMap((l) => l.items), ...p.reviews.map((r) => r.product_id)])].slice(0, 160);
  const found = await Promise.all(ids.map((id) => getProductById(id)));
  const info = new Map<number, Info>();
  for (const prod of found) {
    if (!prod) continue;
    const price = formatPrice(prod, t("price.converted"));
    info.set(prod.id, { name: prod.product_name, brand: prod.brand_name, region: prod.region, price: price.kind === "resolved" ? price.text : null });
  }

  const using = p.shelf.filter((x) => x.status === "using");
  const want = p.shelf.filter((x) => x.status === "want");
  const tried = p.shelf.filter((x) => x.status === "tried");
  const top = p.ratings.slice(0, 10);
  // Average of every rating we have for the member, matcha products and cafés together, from the first one.
  // (A member with more than 40 product ratings only has their 40 highest here, so that average is a little high.)
  const allScores = [...p.ratings.map((r) => Number(r.score)), ...(p.cafe_ratings ?? []).map((r) => Number(r.score))];
  const avg = allScores.length > 0 ? allScores.reduce((n, x) => n + x, 0) / allScores.length : null;
  const earned = BADGES.filter((b) => b.test(p.stats));

  const row = (id: number, extra?: React.ReactNode) => {
    const i = info.get(id);
    return (
      <li key={id} className="flex items-center justify-between gap-4 py-3">
        <Link href={`/products/${id}`} className="text-ink hover:text-matcha">
          <span className="block text-xs text-ink-faint">{i?.brand ?? ""}</span>
          <span className="font-medium">{i?.name ?? t("c.acct.product", { id })}</span>
        </Link>
        <span className="flex items-center gap-3 text-sm text-ink-muted">
          {extra}
          {i?.price}
        </span>
      </li>
    );
  };
  const list = (items: React.ReactNode[]) => <ul className="divide-y divide-line">{items}</ul>;

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
      <header className="flex flex-col gap-5 rounded-sm border border-line bg-paper-raised p-5 sm:flex-row sm:items-start sm:p-6">
        <Avatar avatar={p.avatar} photoPath={p.avatar_path} name={p.name} size={88} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink leading-tight">{p.name}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
            {hasTierIcon(p.stats.tier) && (
              <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                <TierIcon tier={p.stats.tier} size={20} />
                {tv("tier", p.stats.tier)}
              </span>
            )}
            <span>{t("u.since", { date: monthFmt.format(new Date(p.since)) })}</span>
            {p.how && <span>{t("u.drinks", { how: tv("how", p.how) })}</span>}
          </p>
          {p.bio && <p className="mt-3 max-w-xl text-ink-muted">{p.bio}</p>}
          {earned.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label={t("c.acct.badges")}>
              {earned.map((b) => (
                <li key={b.name} className="rounded-full border border-matcha bg-matcha-soft px-3 py-1 text-sm font-medium text-forest">
                  {"✓ "}
                  {t(`c.badge.${BADGES.indexOf(b)}.n` as "c.badge.0.n")}
                </li>
              ))}
            </ul>
          )}
          <FollowBar name={p.name} />
          <p className="mt-3">
            <ProfileActions name={p.name} />
          </p>
        </div>
      </header>

      <dl className="mt-5 grid grid-cols-3 gap-3 sm:gap-4">
        {[
          [t("u.s.tried"), String(tried.length)],
          [t("u.s.rated"), String(p.stats.ratings + Number(p.cafe_rating_count ?? 0))],
          [t("u.s.avg"), avg != null ? avg.toFixed(1) : "–"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-sm border border-line bg-paper-raised px-4 py-4 text-center">
            <dd className="font-display text-3xl font-semibold leading-none text-matcha tabular-nums">{v}</dd>
            <dt className="mt-2 text-xs uppercase tracking-wide text-ink-faint">{k}</dt>
          </div>
        ))}
      </dl>

      {using.length > 0 && <Section title={t("c.shelf.using")}>{list(using.map((x) => row(x.product_id)))}</Section>}

      {top.length > 0 && (
        <Section title={t("u.top")}>
          {list(top.map((r) => row(r.product_id, <span className="flex items-center gap-1.5 tabular-nums"><Stars value={Number(r.score)} size={14} />{Number(r.score).toFixed(1)}</span>)))}
        </Section>
      )}

      {want.length > 0 && <Section title={t("c.shelf.want")}>{list(want.slice(0, 12).map((x) => row(x.product_id)))}</Section>}

      {tried.length > 0 && (
        <Section title={t("c.shelf.tried")} note={tried.length > 12 ? t("u.showing", { n: tried.length }) : undefined}>
          {list(tried.slice(0, 12).map((x) => row(x.product_id)))}
        </Section>
      )}

      {p.lists.filter((l) => l.items.length > 0).map((l) => (
        <Section key={l.name} title={l.name}>
          {list(l.items.slice(0, 20).map((id) => row(id)))}
        </Section>
      ))}

      {p.brands.length > 0 && (
        <Section title={t("u.brands")}>
          <ul className="flex flex-wrap gap-3">
            {p.brands.map((b) => (
              <li key={b}>
                <Link href={`/brands/${encodeURIComponent(b)}`} className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-raised py-1.5 pl-2.5 pr-4 text-sm text-ink hover:border-matcha">
                  <BrandLogo brandName={b} size={24} maxWidth={72} />
                  {b}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(() => {
        const idx = getCafeSlimIndex();
        const gone = removedIndex();
        // A café that left the map after being favorited or rated is still shown (not linked): the member really went there.
        const find = (id: string) => {
          const r = idx.get(id);
          if (r) return { id, name: r[1], place: !r[9] || r[9] === "US" ? `${r[3]}, ${r[4]}` : r[3], href: `/cafes/${cafeSlug({ id: r[0], name: r[1], city: r[3], state: r[4], cc: r[9] })}` };
          const g = gone[id];
          return g ? { id, name: g[0], place: g[1], href: null as string | null } : null;
        };
        const cardCls = "flex h-full items-center justify-between gap-4 rounded-sm border border-line bg-paper p-5 text-ink";
        const hover = " transition-colors hover:border-matcha hover:bg-matcha-soft";
        const favs = (p.cafes ?? []).map(find).filter((x): x is NonNullable<typeof x> => !!x);
        const rated = (p.cafe_ratings ?? []).flatMap((x) => {
          const c = find(x.cafe_id);
          return c ? [{ c, score: Number(x.score) }] : [];
        });
        const body = (c: { name: string; place: string }, right: React.ReactNode) => (
          <>
            <span className="min-w-0">
              <span className="block font-display text-xl font-semibold leading-snug">{c.name}</span>
              <span className="block text-sm text-ink-muted">{c.place}</span>
            </span>
            {right}
          </>
        );
        return (
          <>
            {favs.length > 0 && (
              <Section title={t("c.acct.cafes")}>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {favs.map((c) => (
                    <li key={c.id}>
                      {c.href ? <Link href={c.href} className={cardCls + hover}>{body(c, <span className="text-2xl text-matcha" aria-hidden="true">♥</span>)}</Link> : <div className={cardCls}>{body(c, <span className="text-2xl text-matcha" aria-hidden="true">♥</span>)}</div>}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {rated.length > 0 && (
              <Section title={t("u.cafeRatings")}>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {rated.map(({ c, score }) => {
                    const right = (
                      <span className="flex shrink-0 flex-col items-end gap-1 tabular-nums">
                        <Stars value={score} size={20} />
                        <span className="text-lg font-semibold text-matcha">{score.toFixed(1)}</span>
                      </span>
                    );
                    return <li key={c.id}>{c.href ? <Link href={c.href} className={cardCls + hover}>{body(c, right)}</Link> : <div className={cardCls}>{body(c, right)}</div>}</li>;
                  })}
                </ul>
              </Section>
            )}
          </>
        );
      })()}

      {p.reviews.length > 0 && (
        <Section title={t("c.rv.heading")}>
          <ul className="flex flex-col gap-4">
            {p.reviews.map((r) => (
              <li key={r.product_id} className="border-t border-line pt-3">
                <Link href={`/products/${r.product_id}`} className="font-medium text-ink hover:text-matcha">
                  {info.get(r.product_id)?.name ?? t("c.acct.product", { id: r.product_id })}
                </Link>
                <p className="mt-1 whitespace-pre-line text-sm text-ink-muted">{r.body}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {p.photos.length > 0 && (
        <Section title={t("u.photos")}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {p.photos.map((ph) => (
              <a key={ph} href={`${PHOTO_BASE}${ph}`} target="_blank" rel="noopener noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element -- user photo from storage, already shrunk */}
                <img src={`${PHOTO_BASE}${ph}`} alt={t("c.cm.photoBy", { who: p.name })} loading="lazy" className="aspect-square w-full rounded-sm border border-line object-cover transition-opacity hover:opacity-90" />
              </a>
            ))}
          </div>
        </Section>
      )}
    </main>
  );
}
