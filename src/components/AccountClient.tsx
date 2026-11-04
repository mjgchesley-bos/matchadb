"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Stars } from "@/components/Stars";
import { supabase } from "@/lib/supabase";
import { CONTACT_EMAIL } from "@/lib/site";

type Item = { id: number; name: string; brand: string; price: string | null };
type Rated = { product_id: number; score: number };
type Written = { id: string; product_id: number; body: string; status: "pending" | "approved" | "hidden" };

const STATUS: Record<Written["status"], string> = { pending: "Awaiting approval", approved: "Published", hidden: "Removed by a moderator" };

function ProductLink({ item, id }: { item?: Item; id: number }) {
  return (
    <Link href={`/products/${id}`} className="text-ink hover:text-matcha">
      <span className="block text-xs text-ink-faint">{item?.brand ?? ""}</span>
      <span className="font-medium">{item?.name ?? `Product ${id}`}</span>
    </Link>
  );
}

export function AccountClient() {
  const { ready, user, displayName, setDisplayName, signIn, signOut } = useAuth();
  const [favorites, setFavorites] = useState<number[] | null>(null);
  const [ratings, setRatings] = useState<Rated[] | null>(null);
  const [reviews, setReviews] = useState<Written[] | null>(null);
  const [items, setItems] = useState<Record<number, Item>>({});
  const [draft, setDraft] = useState<string | null>(null);
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  const name = draft ?? displayName ?? "";

  useEffect(() => {
    if (!user) return;
    let live = true;
    const sb = supabase();
    (async () => {
      const [f, r, w] = await Promise.all([
        sb.from("favorites").select("product_id").order("created_at", { ascending: false }),
        sb.from("ratings").select("product_id, score").order("updated_at", { ascending: false }),
        sb.from("reviews").select("id, product_id, body, status").order("created_at", { ascending: false }),
      ]);
      if (!live) return;
      const favs = (f.data ?? []).map((x) => x.product_id as number);
      const rated = (r.data ?? []).map((x) => ({ product_id: x.product_id as number, score: Number(x.score) }));
      const written = (w.data ?? []) as Written[];
      setFavorites(favs);
      setRatings(rated);
      setReviews(written);
      const ids = [...new Set([...favs, ...rated.map((x) => x.product_id), ...written.map((x) => x.product_id)])];
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
    if (next.length < 2 || next.length > 30) return setNameMsg("Use 2 to 30 characters.");
    const { error } = await supabase().from("profiles").update({ display_name: next }).eq("id", user.id);
    if (error) return setNameMsg(error.code === "23505" ? "That name is taken. Try another." : "Couldn't save your name.");
    setDisplayName(next);
    setDraft(null);
    setNameMsg("Saved.");
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
        <h1 className="font-display text-3xl font-semibold text-ink">My matcha</h1>
        <p className="mt-3 text-ink-muted">Sign in to see the products you saved, your ratings and your reviews.</p>
        <button type="button" onClick={() => signIn("Sign in to see your saved products, ratings and reviews.")} className="mt-5 rounded-full bg-matcha px-6 py-2.5 text-sm font-medium text-paper hover:bg-forest">
          Sign in
        </button>
      </main>
    );
  }

  const h2 = "font-display text-xl font-semibold text-ink";
  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 flex flex-col gap-10">
      <div>
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">Account</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink">My matcha</h1>
      </div>

      <section aria-labelledby="profile-h">
        <h2 id="profile-h" className={h2}>Profile</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Signed in as {user.email}. Only you can see your email. Your reviews show the display name below.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label htmlFor="display-name" className="sr-only">Display name</label>
          <input
            id="display-name"
            value={name}
            onChange={(e) => { setDraft(e.target.value); setNameMsg(null); }}
            maxLength={30}
            className="w-64 rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-matcha"
          />
          <button type="button" onClick={saveName} disabled={!name.trim() || name.trim() === displayName} className="rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper hover:bg-forest disabled:opacity-50">
            Save name
          </button>
          {nameMsg && <span className="text-sm text-ink-muted" aria-live="polite">{nameMsg}</span>}
        </div>
      </section>

      <section aria-labelledby="saved-h">
        <h2 id="saved-h" className={h2}>Saved products</h2>
        {favorites === null ? (
          <p className="mt-2 text-sm text-ink-faint">Loading…</p>
        ) : favorites.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            Nothing saved yet. Tap Save on any product page, or <Link href="/browse" className="text-matcha underline">browse the database</Link>.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {favorites.map((id) => (
              <li key={id} className="flex items-center justify-between gap-4 py-3">
                <ProductLink id={id} item={items[id]} />
                <span className="flex items-center gap-4 text-sm text-ink-muted">
                  {items[id]?.price}
                  <button type="button" onClick={() => void unsave(id)} className="underline hover:text-ink">Remove</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="ratings-h">
        <h2 id="ratings-h" className={h2}>My ratings</h2>
        {ratings === null ? (
          <p className="mt-2 text-sm text-ink-faint">Loading…</p>
        ) : ratings.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">You haven&apos;t rated anything yet.</p>
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
        <h2 id="reviews-h" className={h2}>My reviews</h2>
        {reviews === null ? (
          <p className="mt-2 text-sm text-ink-faint">Loading…</p>
        ) : reviews.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">You haven&apos;t written a review yet. You can write one on any product page.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-sm border border-line bg-paper-raised px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <ProductLink id={r.product_id} item={items[r.product_id]} />
                  <span className="text-xs text-ink-faint">{STATUS[r.status]}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-ink-muted">{r.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-line pt-6 text-sm text-ink-muted">
        <button type="button" onClick={() => void signOut()} className="underline hover:text-ink">
          Sign out
        </button>
        <p className="mt-3">
          To delete your account and everything linked to it, email{" "}
          <a className="text-matcha underline" href={`mailto:${CONTACT_EMAIL}?subject=Delete%20my%20MatchaDB%20account`}>
            {CONTACT_EMAIL}
          </a>{" "}
          from the address you signed in with.
        </p>
      </section>
    </main>
  );
}
