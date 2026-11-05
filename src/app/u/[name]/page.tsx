import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { ProfileActions } from "@/components/ProfileActions";
import { BrandLogo } from "@/components/product-cards";
import { Stars } from "@/components/Stars";
import { TierIcon, hasTierIcon } from "@/components/TierIcon";
import { getProductById } from "@/lib/db";
import { BADGES, HOW_LABELS } from "@/lib/badges";
import { formatPrice } from "@/lib/price";
import { supabaseAnon } from "@/lib/supabase-server";
import type { MemberStats } from "@/components/AuthProvider";

// A member's public page. It exists only if the member switched "public profile" on in My matcha;
// otherwise the page is a plain 404, so nobody can tell whether a username exists.
export const revalidate = 60;

type Profile = {
  name: string;
  bio: string;
  avatar: string | null;
  how: string | null;
  since: string;
  goal: number | null;
  tried_this_year: number;
  stats: MemberStats;
  shelf: { product_id: number; status: "want" | "using" | "tried" }[];
  ratings: { product_id: number; score: number }[];
  brands: string[];
  lists: { name: string; items: number[] }[];
  reviews: { product_id: number; body: string; created_at: string }[];
  photos: string[];
};

async function load(name: string): Promise<Profile | null> {
  const { data } = await supabaseAnon().rpc("public_profile", { p_name: decodeURIComponent(name) });
  return (data as Profile | null) ?? null;
}

type Info = { name: string; brand: string; region: string | null; price: string | null };

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const p = await load(name);
  if (!p) return {};
  return { title: `${p.name} on MatchaDB`, description: `${p.name}'s matcha shelf, ratings and lists.`, robots: { index: false, follow: false } };
}

const monthFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", timeZone: "UTC" });
const PHOTO_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gropvtwigbddfikcujhz.supabase.co"}/storage/v1/object/public/comment-photos/`;

function Section({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      {note && <p className="mt-1 text-sm text-ink-faint">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function PublicProfilePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const p = await load(name);
  if (!p) notFound();

  const ids = [...new Set([...p.shelf.map((x) => x.product_id), ...p.ratings.map((x) => x.product_id), ...p.lists.flatMap((l) => l.items), ...p.reviews.map((r) => r.product_id)])].slice(0, 160);
  const found = await Promise.all(ids.map((id) => getProductById(id)));
  const info = new Map<number, Info>();
  for (const prod of found) {
    if (!prod) continue;
    const price = formatPrice(prod);
    info.set(prod.id, { name: prod.product_name, brand: prod.brand_name, region: prod.region, price: price.kind === "resolved" ? price.text : null });
  }

  const using = p.shelf.filter((x) => x.status === "using");
  const want = p.shelf.filter((x) => x.status === "want");
  const tried = p.shelf.filter((x) => x.status === "tried");
  const top = p.ratings.slice(0, 10);
  const avg = p.stats.ratings > 0 && p.ratings.length === p.stats.ratings ? p.ratings.reduce((n, r) => n + Number(r.score), 0) / p.ratings.length : null;
  const regionCount = new Map<string, number>();
  for (const r of p.ratings.filter((x) => Number(x.score) >= 4)) {
    const reg = info.get(r.product_id)?.region;
    if (reg) regionCount.set(reg, (regionCount.get(reg) ?? 0) + 1);
  }
  const favRegion = [...regionCount.entries()].sort((a, b) => b[1] - a[1]).find(([, n]) => n >= 3)?.[0] ?? null;
  const year = new Date().getUTCFullYear();
  const earned = BADGES.filter((b) => b.test(p.stats));

  const row = (id: number, extra?: React.ReactNode) => {
    const i = info.get(id);
    return (
      <li key={id} className="flex items-center justify-between gap-4 py-3">
        <Link href={`/products/${id}`} className="text-ink hover:text-matcha">
          <span className="block text-xs text-ink-faint">{i?.brand ?? ""}</span>
          <span className="font-medium">{i?.name ?? `Product ${id}`}</span>
        </Link>
        <span className="flex items-center gap-3 text-sm text-ink-muted">
          {extra}
          {i?.price}
        </span>
      </li>
    );
  };
  const list = (items: React.ReactNode[]) => <ul className="divide-y divide-line border-y border-line">{items}</ul>;

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Avatar avatar={p.avatar} name={p.name} size={88} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink leading-tight">{p.name}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
            {hasTierIcon(p.stats.tier) && (
              <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                <TierIcon tier={p.stats.tier} size={20} />
                {p.stats.tier}
              </span>
            )}
            <span>Member since {monthFmt.format(new Date(p.since))}</span>
            {p.how && <span>Drinks: {HOW_LABELS[p.how] ?? p.how}</span>}
          </p>
          {p.bio && <p className="mt-3 max-w-xl text-ink-muted">{p.bio}</p>}
          <p className="mt-3">
            <ProfileActions name={p.name} />
          </p>
        </div>
      </header>

      <dl className="mt-8 grid grid-cols-2 gap-4 border-y border-line py-5 sm:grid-cols-4">
        {[
          ["Tried", String(tried.length)],
          ["Rated", String(p.stats.ratings)],
          ["Average rating", avg != null ? avg.toFixed(1) : "–"],
          ["Favorite region", favRegion ?? "–"],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs uppercase tracking-wide text-ink-faint">{k}</dt>
            <dd className="mt-0.5 font-display text-xl font-semibold text-ink tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      {p.goal && (
        <Section title={`Tasting challenge ${year}`}>
          <p className="text-sm text-ink-muted tabular-nums">
            Tried {p.tried_this_year} of {p.goal} new matchas this year
            {p.tried_this_year >= p.goal ? ". Goal reached!" : ""}
          </p>
          <div className="mt-2 h-2 w-full max-w-md overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={p.goal} aria-valuenow={Math.min(p.tried_this_year, p.goal)} aria-label="Tasting challenge progress">
            <div className="h-full rounded-full bg-matcha" style={{ width: `${Math.min(100, (p.tried_this_year / p.goal) * 100)}%` }} />
          </div>
        </Section>
      )}

      {using.length > 0 && <Section title="Using now">{list(using.map((x) => row(x.product_id)))}</Section>}

      {top.length > 0 && (
        <Section title="Top rated">
          {list(top.map((r) => row(r.product_id, <span className="flex items-center gap-1.5 tabular-nums"><Stars value={Number(r.score)} size={14} />{Number(r.score).toFixed(1)}</span>)))}
        </Section>
      )}

      {want.length > 0 && <Section title="Want to try">{list(want.slice(0, 12).map((x) => row(x.product_id)))}</Section>}

      {tried.length > 0 && (
        <Section title="Tried it" note={tried.length > 12 ? `Showing 12 of ${tried.length}` : undefined}>
          {list(tried.slice(0, 12).map((x) => row(x.product_id)))}
        </Section>
      )}

      {p.lists.filter((l) => l.items.length > 0).map((l) => (
        <Section key={l.name} title={l.name}>
          {list(l.items.slice(0, 20).map((id) => row(id)))}
        </Section>
      ))}

      {p.brands.length > 0 && (
        <Section title="Favorite brands">
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

      {p.reviews.length > 0 && (
        <Section title="Reviews">
          <ul className="flex flex-col gap-4">
            {p.reviews.map((r) => (
              <li key={r.product_id} className="border-t border-line pt-3">
                <Link href={`/products/${r.product_id}`} className="font-medium text-ink hover:text-matcha">
                  {info.get(r.product_id)?.name ?? `Product ${r.product_id}`}
                </Link>
                <p className="mt-1 whitespace-pre-line text-sm text-ink-muted">{r.body}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {p.photos.length > 0 && (
        <Section title="Photos">
          <div className="flex flex-wrap gap-2">
            {p.photos.map((ph) => (
              <a key={ph} href={`${PHOTO_BASE}${ph}`} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element -- user photo from storage, already shrunk */}
                <img src={`${PHOTO_BASE}${ph}`} alt={`Photo shared by ${p.name}`} loading="lazy" className="h-28 w-28 rounded-sm border border-line object-cover hover:opacity-90" />
              </a>
            ))}
          </div>
        </Section>
      )}

      <Section title="Badges">
        <ul className="flex flex-wrap gap-2">
          {earned.length === 0 && <li className="text-sm text-ink-faint">No badges yet.</li>}
          {earned.map((b) => (
            <li key={b.name} className="rounded-full border border-matcha bg-matcha-soft px-3 py-1 text-xs text-forest">
              {"✓ "}
              {b.name}
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}
