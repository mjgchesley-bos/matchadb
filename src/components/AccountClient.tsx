"use client";

import Link from "@/i18n/Link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { FriendsSection } from "@/components/Friends";
import { MyLists } from "@/components/MyLists";
import { PublicProfileSettings } from "@/components/PublicProfileSettings";
import { BADGES } from "@/lib/badges";
import { commentPhotoUrl, COMMENT_BUCKET } from "@/components/Comments";
import { BrandLogo } from "@/components/product-cards";
import { SHELF_KEYS, type ShelfStatus } from "@/components/ShelfButtons";
import { TierIcon } from "@/components/TierIcon";
import { Stars } from "@/components/Stars";
import { cafeSlug, type CafeSlim } from "@/lib/cafe-types";
import { supabase } from "@/lib/supabase";
import { CONTACT_EMAIL } from "@/lib/site";
import { useT, useTV } from "@/i18n/client";
import { rich } from "@/i18n/rich";

type Item = { id: number; name: string; brand: string; price: string | null };
type Rated = { product_id: number; score: number };
type Written = { id: string; product_id: number; body: string; status: "pending" | "approved" | "hidden" };

type Shelved = { product_id: number; status: ShelfStatus };
type Saved = { study_id: number; note: string };
type StudyInfo = { id: number; title: string; journal: string; year: number | null };

type MyComment = { id: string; target_type: "product" | "brand" | "cafe"; target_key: string; body: string; photos: string[]; status: Written["status"]; created_at: string };


function ProductLink({ item, id }: { item?: Item; id: number }) {
  const t = useT();
  return (
    <Link href={`/products/${id}`} className="text-ink hover:text-matcha">
      <span className="block text-xs text-ink-faint">{item?.brand ?? ""}</span>
      <span className="font-medium">{item?.name ?? t("c.acct.product", { id })}</span>
    </Link>
  );
}

export function AccountClient() {
  const { ready, user, displayName, stats, refreshStats, setDisplayName, signIn, signOut } = useAuth();
  const t = useT();
  const tv = useTV();
  const [favorites, setFavorites] = useState<number[] | null>(null);
  const [ratings, setRatings] = useState<Rated[] | null>(null);
  const [reviews, setReviews] = useState<Written[] | null>(null);
  const [items, setItems] = useState<Record<number, Item>>({});
  const [brands, setBrands] = useState<string[] | null>(null);
  const [favCafes, setFavCafes] = useState<string[] | null>(null);
  const [shelved, setShelved] = useState<Shelved[] | null>(null);
  const [saved, setSaved] = useState<Saved[] | null>(null);
  const [studies, setStudies] = useState<Record<number, StudyInfo>>({});
  const [comments, setComments] = useState<MyComment[] | null>(null);
  const [cafeNames, setCafeNames] = useState<Record<string, { name: string; slug: string; place: string }>>({});
  const [draft, setDraft] = useState<string | null>(null);
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  const name = draft ?? displayName ?? "";

  useEffect(() => {
    if (!user) return;
    let live = true;
    const sb = supabase();
    (async () => {
      const [f, r, w, fb, cm, sh, bm, fc] = await Promise.all([
        sb.from("favorites").select("product_id").order("created_at", { ascending: false }),
        sb.from("ratings").select("product_id, score").order("updated_at", { ascending: false }),
        sb.from("reviews").select("id, product_id, body, status").order("created_at", { ascending: false }),
        sb.from("favorite_brands").select("brand").order("created_at", { ascending: false }),
        sb.from("comments").select("id, target_type, target_key, body, photos, status, created_at").order("created_at", { ascending: false }),
        sb.from("shelf").select("product_id, status").order("updated_at", { ascending: false }),
        sb.from("research_bookmarks").select("study_id, note").order("updated_at", { ascending: false }),
        sb.from("favorite_cafes").select("cafe_id").order("created_at", { ascending: false }),
      ]);
      if (!live) return;
      const favs = (f.data ?? []).map((x) => x.product_id as number);
      const rated = (r.data ?? []).map((x) => ({ product_id: x.product_id as number, score: Number(x.score) }));
      const written = (w.data ?? []) as Written[];
      setFavorites(favs);
      setRatings(rated);
      setReviews(written);
      setBrands((fb.data ?? []).map((x) => x.brand as string));
      const mine = (cm.data ?? []) as MyComment[];
      setComments(mine);
      const cafeIds = (fc.data ?? []).map((x) => x.cafe_id as string);
      setFavCafes(cafeIds);
      if (cafeIds.length > 0 || mine.some((c) => c.target_type === "cafe")) {
        const lists = await Promise.all(["us", "ca", "eu", "jp", "kr", "au"].map((k) => fetch(`/data/cafes-slim-${k}.json`).then((res) => (res.ok ? (res.json() as Promise<CafeSlim[]>) : []))));
        const rows = lists.flat();
        if (live) setCafeNames(Object.fromEntries(rows.map((r) => [r[0], { name: r[1], slug: cafeSlug({ id: r[0], name: r[1], city: r[3], state: r[4], cc: r[9] }), place: !r[9] || r[9] === "US" ? `${r[3]}, ${r[4]}` : r[3] }])));
      }
      const commentProducts = mine.filter((c) => c.target_type === "product").map((c) => Number(c.target_key)).filter((n) => Number.isInteger(n));
      const onShelf = (sh.data ?? []) as Shelved[];
      setShelved(onShelf);
      const marks = (bm.data ?? []) as Saved[];
      setSaved(marks);
      if (marks.length) {
        const sl = (await fetch(`/api/studies/lookup?ids=${marks.map((m) => m.study_id).join(",")}`).then((res) => res.json())) as StudyInfo[];
        if (live) setStudies(Object.fromEntries(sl.map((x) => [x.id, x])));
      }
      const ids = [...new Set([...favs, ...rated.map((x) => x.product_id), ...written.map((x) => x.product_id), ...commentProducts, ...onShelf.map((x) => x.product_id)])];
      if (ids.length) {
        const list = (await fetch(`/api/products/lookup?ids=${ids.join(",")}`).then((res) => res.json())) as Item[];
        if (live) setItems(Object.fromEntries(list.map((i) => [i.id, i])));
      }
    })();
    return () => {
      live = false;
    };
  }, [user]);

  const saveName = async () => {
    if (!user) return;
    const next = name.trim();
    if (next.length < 2 || next.length > 30) return setNameMsg(t("c.auth.nameLen"));
    const { error } = await supabase().from("profiles").update({ display_name: next }).eq("id", user.id);
    if (error) return setNameMsg(error.code === "23505" ? t("c.auth.nameTaken") : t("c.acct.nameFail"));
    setDisplayName(next);
    setDraft(null);
    setNameMsg(t("c.acct.saved"));
  };

  const unshelve = async (id: number) => {
    if (!user) return;
    setShelved((s) => s?.filter((x) => x.product_id !== id) ?? s);
    await supabase().from("shelf").delete().eq("user_id", user.id).eq("product_id", id);
    void refreshStats();
  };

  const unbookmark = async (id: number) => {
    if (!user) return;
    setSaved((s) => s?.filter((x) => x.study_id !== id) ?? s);
    await supabase().from("research_bookmarks").delete().eq("user_id", user.id).eq("study_id", id);
    void refreshStats();
  };

  const unsaveBrand = async (brand: string) => {
    if (!user) return;
    setBrands((b) => b?.filter((x) => x !== brand) ?? b);
    await supabase().from("favorite_brands").delete().eq("user_id", user.id).eq("brand", brand);
  };

  const unsaveCafe = async (id: string) => {
    if (!user) return;
    setFavCafes((l) => l?.filter((x) => x !== id) ?? l);
    await supabase().from("favorite_cafes").delete().eq("user_id", user.id).eq("cafe_id", id);
    void refreshStats();
  };

  const deleteComment = async (c: MyComment) => {
    if (!confirm(t("c.acct.confirmDelete"))) return;
    const sb = supabase();
    if (c.photos.length) await sb.storage.from(COMMENT_BUCKET).remove(c.photos);
    const { error } = await sb.from("comments").delete().eq("id", c.id);
    if (!error) setComments((list) => list?.filter((x) => x.id !== c.id) ?? list);
  };

  const unsave = async (id: number) => {
    if (!user) return;
    setFavorites((f) => f?.filter((x) => x !== id) ?? f);
    await supabase().from("favorites").delete().eq("user_id", user.id).eq("product_id", id);
  };

  if (!ready) return <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12" />;

  if (!user) {
    return (
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <h1 className="font-display text-3xl font-semibold text-ink">{t("c.acct.title")}</h1>
        <p className="mt-3 text-ink-muted">{t("c.acct.signInP")}</p>
        <button type="button" onClick={() => signIn(t("c.acct.signInMsg"))} className="mt-5 rounded-full bg-matcha px-6 py-2.5 text-sm font-medium text-paper hover:bg-forest">
          {t("c.rv.signInLink")}
        </button>
      </main>
    );
  }

  const h2 = "font-display text-xl font-semibold text-ink";
  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 flex flex-col gap-10">
      <div>
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("c.acct.eyebrow")}</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink">{t("c.acct.title")}</h1>
      </div>

      {stats && (
        <section aria-labelledby="tier-h" className="rounded-sm border border-line bg-paper-raised p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{t("c.acct.membership")}</p>
          <h2 id="tier-h" className="mt-1 flex items-center gap-2.5 font-display text-2xl font-semibold text-ink">
            <TierIcon tier={stats.tier} size={34} />
            {tv("tier", stats.tier)}
          </h2>
          <p className="mt-1 text-sm text-ink-muted tabular-nums">
            {t("c.acct.points", { n: stats.points })}
            {stats.next_tier && stats.next_at != null ? t("c.acct.next", { n: stats.next_at - stats.points, tier: tv("tier", stats.next_tier) }) : t("c.acct.top")}
          </p>
          {stats.next_at != null && (
            <div className="mt-3 h-2 w-full max-w-md overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={stats.next_at} aria-valuenow={stats.points} aria-label={t("c.acct.progress")}>
              <div className="h-full rounded-full bg-matcha" style={{ width: `${Math.min(100, (stats.points / stats.next_at) * 100)}%` }} />
            </div>
          )}
          <p className="mt-3 text-xs text-ink-faint">
            {t("c.acct.pointsNote")}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2" aria-label={t("c.acct.badges")}>
            {BADGES.map((b, bi) => {
              const bn = t(`c.badge.${bi}.n` as "c.badge.0.n");
              const bh = t(`c.badge.${bi}.h` as "c.badge.0.h");
              const earned = b.test(stats);
              return (
                <li
                  key={b.name}
                  title={earned ? t("c.acct.earned") : bh}
                  className={`rounded-full border px-3 py-1 text-xs ${earned ? "border-matcha bg-matcha-soft text-forest" : "border-line-strong text-ink-faint"}`}
                >
                  {earned ? "\u2713 " : ""}
                  {bn}
                  {!earned && <span className="sr-only">{t("c.acct.notEarned", { hint: bh })}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <FriendsSection />

      <PublicProfileSettings />

      <section aria-labelledby="profile-h">
        <h2 id="profile-h" className={h2}>{t("c.acct.profile")}</h2>
        <p className="mt-2 text-sm text-ink-muted">
          {t("c.acct.signedAs", { email: user.email ?? "" })}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label htmlFor="display-name" className="sr-only">{t("c.acct.username")}</label>
          <input
            id="display-name"
            value={name}
            onChange={(e) => { setDraft(e.target.value); setNameMsg(null); }}
            maxLength={30}
            className="w-64 rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-matcha"
          />
          <button type="button" onClick={saveName} disabled={!name.trim() || name.trim() === displayName} className="rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper hover:bg-forest disabled:opacity-50">
            {t("c.acct.saveName")}
          </button>
          {nameMsg && <span className="text-sm text-ink-muted" aria-live="polite">{nameMsg}</span>}
        </div>
      </section>

      <section aria-labelledby="shelf-h">
        <h2 id="shelf-h" className={h2}>{t("c.acct.shelf")}</h2>
        {shelved === null ? (
          <p className="mt-2 text-sm text-ink-faint">Loading…</p>
        ) : shelved.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            {rich(t("c.acct.shelfEmpty", { want: "{want}", using: "{using}", tried: "{tried}" }), {
              want: <strong>{t("c.shelf.want")}</strong>,
              using: <strong>{t("c.shelf.using")}</strong>,
              tried: <strong>{t("c.shelf.tried")}</strong>,
            })}
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-5">
            {(["using", "want", "tried"] as ShelfStatus[]).map((st) => {
              const rows = shelved.filter((x) => x.status === st);
              if (!rows.length) return null;
              return (
                <div key={st}>
                  <h3 className="text-sm font-medium text-ink">
                    {t(SHELF_KEYS[st])} <span className="font-normal text-ink-faint">({rows.length})</span>
                  </h3>
                  <ul className="mt-1 divide-y divide-line border-y border-line">
                    {rows.map((x) => (
                      <li key={x.product_id} className="flex items-center justify-between gap-4 py-3">
                        <ProductLink id={x.product_id} item={items[x.product_id]} />
                        <span className="flex items-center gap-4 text-sm text-ink-muted">
                          {items[x.product_id]?.price}
                          <button type="button" onClick={() => void unshelve(x.product_id)} className="underline hover:text-ink">{t("c.acct.remove")}</button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <MyLists />

      <section aria-labelledby="brands-h">
        <h2 id="brands-h" className={h2}>{t("c.acct.brands")}</h2>
        {brands === null ? (
          <p className="mt-2 text-sm text-ink-faint">Loading…</p>
        ) : brands.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            {rich(t("c.acct.brandsEmpty", { save: "{save}", link: "{link}" }), {
              save: <strong>{t("c.fav.brand.save")}</strong>,
              link: <Link href="/browse" className="text-matcha underline">{t("c.acct.browse")}</Link>,
            })}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {brands.map((b) => (
              <li key={b} className="flex items-center justify-between gap-4 py-3">
                <Link href={`/brands/${encodeURIComponent(b)}`} className="flex items-center gap-3 text-ink hover:text-matcha">
                  <BrandLogo brandName={b} size={32} maxWidth={96} />
                  <span className="font-medium">{b}</span>
                </Link>
                <button type="button" onClick={() => void unsaveBrand(b)} className="text-sm text-ink-muted underline hover:text-ink">
                  {t("c.acct.remove")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="cafes-h">
        <h2 id="cafes-h" className={h2}>{t("c.acct.cafes")}</h2>
        {favCafes === null ? (
          <p className="mt-2 text-sm text-ink-faint">Loading…</p>
        ) : favCafes.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            {rich(t("c.acct.cafesEmpty", { save: "{save}", link: "{link}" }), {
              save: <strong>{t("c.fav.cafe.save")}</strong>,
              link: <Link href="/cafes" className="text-matcha underline">{t("c.acct.findCafes")}</Link>,
            })}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {favCafes.map((id) => (
              <li key={id} className="flex items-center justify-between gap-4 py-3">
                {cafeNames[id] ? (
                  <Link href={`/cafes/${cafeNames[id].slug}`} className="text-ink hover:text-matcha">
                    <span className="font-medium">{cafeNames[id].name}</span>
                    <span className="ml-2 text-sm text-ink-faint">{cafeNames[id].place}</span>
                  </Link>
                ) : (
                  <span className="text-ink-muted">{t("c.acct.aCafe")}</span>
                )}
                <button type="button" onClick={() => void unsaveCafe(id)} className="text-sm text-ink-muted underline hover:text-ink">
                  {t("c.acct.remove")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="saved-h">
        <h2 id="saved-h" className={h2}>{t("c.acct.savedProducts")}</h2>
        {favorites === null ? (
          <p className="mt-2 text-sm text-ink-faint">Loading…</p>
        ) : favorites.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            {rich(t("c.acct.savedEmpty", { link: "{link}" }), { link: <Link href="/browse" className="text-matcha underline">{t("c.acct.browse")}</Link> })}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {favorites.map((id) => (
              <li key={id} className="flex items-center justify-between gap-4 py-3">
                <ProductLink id={id} item={items[id]} />
                <span className="flex items-center gap-4 text-sm text-ink-muted">
                  {items[id]?.price}
                  <button type="button" onClick={() => void unsave(id)} className="underline hover:text-ink">{t("c.acct.remove")}</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="ratings-h">
        <h2 id="ratings-h" className={h2}>{t("c.acct.ratings")}</h2>
        {ratings === null ? (
          <p className="mt-2 text-sm text-ink-faint">Loading…</p>
        ) : ratings.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">{t("c.acct.ratingsEmpty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {ratings.map((r) => (
              <li key={r.product_id} className="flex items-center justify-between gap-4 py-3">
                <ProductLink id={r.product_id} item={items[r.product_id]} />
                <span className="flex items-center gap-2 text-sm text-ink-muted tabular-nums">
                  <Stars value={r.score} size={16} />
                  {r.score.toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="reviews-h">
        <h2 id="reviews-h" className={h2}>{t("c.acct.reviews")}</h2>
        {reviews === null ? (
          <p className="mt-2 text-sm text-ink-faint">Loading…</p>
        ) : reviews.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">{t("c.acct.reviewsEmpty")}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-sm border border-line bg-paper-raised px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <ProductLink id={r.product_id} item={items[r.product_id]} />
                  <span className="text-xs text-ink-faint">{t(`c.acct.status.${r.status}` as "c.acct.status.pending")}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-ink-muted">{r.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="folder-h">
        <h2 id="folder-h" className={h2}>{t("c.acct.folder")}</h2>
        {saved === null ? (
          <p className="mt-2 text-sm text-ink-faint">Loading…</p>
        ) : saved.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            {rich(t("c.acct.folderEmpty", { link: "{link}" }), { link: <Link href="/research" className="text-matcha underline">{t("c.acct.researchLib")}</Link> })}
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {saved.map((m) => {
              const s = studies[m.study_id];
              return (
                <li key={m.study_id} className="rounded-sm border border-line bg-paper-raised px-4 py-3">
                  <Link href={`/research/${m.study_id}`} className="font-medium text-ink hover:text-matcha">
                    {s?.title ?? t("c.acct.study", { id: m.study_id })}
                  </Link>
                  {s && (
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {s.journal}
                      {s.year ? ` · ${s.year}` : ""}
                    </p>
                  )}
                  {m.note && <p className="mt-2 whitespace-pre-line border-l-2 border-matcha pl-3 text-sm text-ink-muted">{m.note}</p>}
                  <div className="mt-2 flex gap-4 text-sm">
                    <Link href={`/research/${m.study_id}`} className="text-matcha underline hover:text-forest">{m.note ? t("c.acct.editNote") : t("c.acct.addNote")}</Link>
                    <button type="button" onClick={() => void unbookmark(m.study_id)} className="text-ink-muted underline hover:text-ink">{t("c.acct.remove")}</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="comments-h">
        <h2 id="comments-h" className={h2}>{t("c.acct.comments")}</h2>
        {comments === null ? (
          <p className="mt-2 text-sm text-ink-faint">Loading…</p>
        ) : comments.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">{t("c.acct.commentsEmpty")}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {comments.map((c) => (
              <li key={c.id} className="rounded-sm border border-line bg-paper-raised px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  {c.target_type === "product" ? (
                    <ProductLink id={Number(c.target_key)} item={items[Number(c.target_key)]} />
                  ) : c.target_type === "cafe" ? (
                    <Link href={cafeNames[c.target_key] ? `/cafes/${cafeNames[c.target_key].slug}` : "/cafes"} className="font-medium text-ink hover:text-matcha">
                      {cafeNames[c.target_key]?.name ?? t("c.acct.aCafe")}
                    </Link>
                  ) : (
                    <Link href={`/brands/${encodeURIComponent(c.target_key)}`} className="font-medium text-ink hover:text-matcha">
                      {c.target_key}
                    </Link>
                  )}
                  <span className="text-xs text-ink-faint">{t(`c.acct.status.${c.status}` as "c.acct.status.pending")}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-ink-muted">{c.body}</p>
                {c.photos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.photos.map((p) => (
                      <a key={p} href={commentPhotoUrl(p)} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element -- user photo from storage */}
                        <img src={commentPhotoUrl(p)} alt={t("c.acct.yourPhoto")} loading="lazy" className="h-20 w-20 rounded-sm border border-line object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => void deleteComment(c)} className="mt-2 text-sm text-ink-muted underline hover:text-ink">
                  {t("c.cm.delete")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-line pt-6 text-sm text-ink-muted">
        <button type="button" onClick={() => void signOut()} className="underline hover:text-ink">
          {t("c.acct.signOut")}
        </button>
        <p className="mt-3">
          {rich(t("c.acct.deleteAcct", { email: "{email}" }), {
            email: (
              <a className="text-matcha underline" href={`mailto:${CONTACT_EMAIL}?subject=Delete%20my%20MatchaDB%20account`}>
                {CONTACT_EMAIL}
              </a>
            ),
          })}
        </p>
      </section>
    </main>
  );
}
