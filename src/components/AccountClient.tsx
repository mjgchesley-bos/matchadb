"use client";

import Link from "@/i18n/Link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { StaffLink } from "@/components/AdminClient";
import { FriendsSection } from "@/components/Friends";
import { MyLists } from "@/components/MyLists";
import { PublicProfileSettings } from "@/components/PublicProfileSettings";
import { ProfileHeader } from "@/components/ProfileHeader";
import { Ribbons } from "@/components/Ribbons";
import { WoodShelf, type ShelfCard } from "@/components/WoodShelf";
import { AvatarFigure } from "@/components/AvatarFigure";
import { Avatar } from "@/components/Avatar";
import { parseDesign } from "@/lib/avatar-design";
import { AccountTypePanel } from "@/components/AccountTypePanel";
import { AccountAvatar } from "@/components/AccountAvatar";
import { commentPhotoUrl, COMMENT_BUCKET } from "@/components/Comments";
import { BrandLogo } from "@/components/product-cards";
import { SHELF_KEYS, type ShelfStatus } from "@/components/ShelfButtons";
import { Stars } from "@/components/Stars";
import { cafeSlug, type CafeSlim } from "@/lib/cafe-types";
import { supabase } from "@/lib/supabase";
import { CONTACT_EMAIL } from "@/lib/site";
import { useT } from "@/i18n/client";
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
  const { ready, user, displayName, avatar, refreshStats, signIn, signOut } = useAuth();
  const t = useT();
  const [editingAvatar, setEditingAvatar] = useState(false);
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
        const lists = await Promise.all(["us", "ca", "eu", "jp", "kr", "au", "nz"].map((k) => fetch(`/data/cafes-slim-${k}.json`).then((res) => (res.ok ? (res.json() as Promise<CafeSlim[]>) : []))));
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
  const designed = parseDesign(avatar.key) ? avatar.key : null;
  const cards: ShelfCard[] = [
    ...(shelved ?? []).map((x) => ({ id: x.product_id, brand: items[x.product_id]?.brand ?? "", name: items[x.product_id]?.name ?? t("c.acct.product", { id: x.product_id }), price: items[x.product_id]?.price ?? null, tag: x.status, onRemove: () => void unshelve(x.product_id) })),
    ...(favorites ?? []).filter((id) => !(shelved ?? []).some((x) => x.product_id === id)).map((id) => ({ id, brand: items[id]?.brand ?? "", name: items[id]?.name ?? t("c.acct.product", { id }), price: items[id]?.price ?? null, tag: "saved" as const, onRemove: () => void unsave(id) })),
  ];
  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10 flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("c.acct.eyebrow")}</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink">{t("c.acct.title")}</h1>
        </div>
      </div>

      <section className="flex flex-wrap items-start gap-x-8 gap-y-6 rounded-sm border border-line bg-paper-raised p-5 sm:p-6" aria-label={t("c.acct.title")}>
        <div className="flex shrink-0 items-start gap-5">
          <div className="flex flex-col items-center">
            {designed ? (
              <AvatarFigure code={designed} height={300} />
            ) : (
              <div className="pt-2">
                <Avatar avatar={avatar.key} photoPath={avatar.path} name={displayName} size={150} />
              </div>
            )}
            <button type="button" onClick={() => setEditingAvatar((v) => !v)} aria-expanded={editingAvatar} className="mt-2 text-sm text-matcha underline hover:text-forest">
              {t("c.mp.editAvatar")}
            </button>
          </div>
          <Ribbons />
        </div>
        <ProfileHeader />
        {editingAvatar && (
          <div className="basis-full">
            <AccountAvatar open onOpenChange={setEditingAvatar} />
          </div>
        )}
      </section>

      <div className="grid items-start gap-x-12 gap-y-10 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-10">
          <section aria-labelledby="comments-h">
            <h2 id="comments-h" className={h2}>{t("c.mp.reviewsPhotos")}</h2>
            {comments === null ? (
              <p className="mt-2 text-sm text-ink-faint">Loading…</p>
            ) : comments.length === 0 && (reviews?.length ?? 0) === 0 ? (
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
                            <img src={commentPhotoUrl(p)} alt={t("c.acct.yourPhoto")} loading="lazy" className="h-24 w-24 rounded-sm border border-line object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                    <button type="button" onClick={() => void deleteComment(c)} className="mt-2 text-sm text-ink-muted underline hover:text-ink">
                      {t("c.cm.delete")}
                    </button>
                  </li>
                ))}
                {(reviews ?? []).map((r) => (
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

          <FriendsSection />

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
        </div>

        <div className="flex min-w-0 flex-col gap-10">
          <section aria-labelledby="shelf-h">
            <h2 id="shelf-h" className={`${h2} mb-3`}>{t("c.acct.shelf")}</h2>
            {shelved === null || favorites === null ? <p className="text-sm text-ink-faint">Loading…</p> : <WoodShelf cards={cards} />}
          </section>

          <MyLists />

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
        </div>
      </div>

      <StaffLink />
      <AccountTypePanel />
      <details className="rounded-sm border border-line bg-paper-raised px-5 py-3">
        <summary className="cursor-pointer text-sm font-medium text-ink">{t("c.mp.options")}</summary>
        <div className="mt-4">
          <PublicProfileSettings key={`${avatar.key}|${avatar.path}`} />
        </div>
      </details>

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
