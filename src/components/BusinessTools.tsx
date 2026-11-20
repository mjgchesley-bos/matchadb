"use client";

import Link from "@/i18n/Link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { FeedbackButton } from "@/components/FeedbackButton";
import { useSb } from "@/lib/demo";
import { ProductsPanel, type Product } from "@/components/ProductsPanel";
import { OK_IMAGE, shrinkImage } from "@/lib/image-upload";

import { bannerUrl } from "@/lib/business";


// Tools for approved café-owner and wholesaler accounts: a banner photo for the public profile and a list of products with an explanation, price and link.
// (Needs supabase/business_profiles.sql; the panel stays quiet until it has been run.)
export function BusinessTools({ contactEmail, onBanner, onProducts }: { contactEmail: string; onBanner?: (path: string | null) => void; onProducts?: (p: Product[]) => void }) {
  const supabase = useSb();
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [type, setType] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  useEffect(() => { onBanner?.(banner); }, [banner, onBanner]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let live = true;
    const sb = supabase();
    sb.from("profiles").select("account_type, banner_path").eq("id", uid).maybeSingle().then(({ data, error }) => {
      if (!live) return;
      if (error) return setType(null);
      const d = data as { account_type: string; banner_path?: string | null } | null;
      setType(d?.account_type ?? null);
      setBanner(d?.banner_path ?? null);
    });
    return () => { live = false; };
  }, [uid, supabase]);

  if (!user || !type || type === "general") return null;

  async function uploadBanner(file: File | undefined) {
    if (!file || !user) return;
    if (!OK_IMAGE.test(file.type)) return setMsg("Use a JPEG, PNG or WebP picture.");
    setBusy(true);
    setMsg(null);
    try {
      const blob = await shrinkImage(file, 1800);
      const path = `${user.id}/banner-${Date.now()}.jpg`;
      const up = await supabase().storage.from("business-banners").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (up.error) throw up.error;
      const { error } = await supabase().from("profiles").update({ banner_path: path }).eq("id", user.id);
      if (error) throw error;
      if (banner) await supabase().storage.from("business-banners").remove([banner]);
      setBanner(path);
      setMsg("Banner saved. It shows at the top of your public profile.");
    } catch {
      setMsg("The banner could not be saved. Try a smaller picture.");
    }
    setBusy(false);
  }

  async function removeBanner() {
    if (!user || !banner) return;
    await supabase().from("profiles").update({ banner_path: null }).eq("id", user.id);
    await supabase().storage.from("business-banners").remove([banner]);
    setBanner(null);
  }

  if (type === "cafe_owner") {
    return (
      <section className="rounded-md border-2 border-matcha bg-gradient-to-br from-matcha-soft to-paper-raised p-5 shadow-sm sm:p-6" aria-labelledby="biz-tools-h">
        <h2 id="biz-tools-h" className="font-mono text-xs uppercase tracking-[0.2em] text-forest">Your café page</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">Everything you can change (cover photo, story, hours, menu, photos, links and the products you sell) is on one page.</p>
        <Link href="/business" className="mt-4 inline-block rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper hover:bg-forest">Edit your café page</Link>
      </section>
    );
  }

  return (
    <section className="rounded-sm border-2 border-matcha bg-paper-raised p-5 sm:p-6" aria-labelledby="biz-tools-h">
      <h2 id="biz-tools-h" className="font-mono text-xs uppercase tracking-[0.2em] text-forest">Your business page</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">Add a banner and your products. They appear on your public profile. Edit prices and descriptions any time.</p>
      <div className="mt-5 rounded-sm border border-line p-4">
        <h3 className="font-display text-base font-semibold text-ink">Banner photo</h3>
        {banner && (
          // eslint-disable-next-line @next/next/no-img-element -- member banner from storage
          <img src={bannerUrl(banner)} alt="Your banner" className="mt-3 h-32 w-full rounded-sm border border-line object-cover sm:h-40" />
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <label className={`cursor-pointer rounded-full border border-line-strong bg-paper px-4 py-2 text-ink hover:bg-matcha-soft ${busy ? "pointer-events-none opacity-60" : ""}`}>
            {banner ? "Change banner" : "Upload a banner"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void uploadBanner(e.target.files?.[0])} />
          </label>
          {banner && <button type="button" onClick={() => void removeBanner()} className="text-ink-muted underline hover:text-ink">Remove</button>}
          <span className="text-xs text-ink-faint">Wide pictures work best (about 3:1).</span>
        </div>
      </div>

      <div className="mt-5"><ProductsPanel title="Products" onChange={onProducts} /></div>

      {msg && <p className="mt-3 text-sm text-ink" role="status">{msg}</p>}
      <div className="mt-5"><FeedbackButton contactEmail={contactEmail} /></div>
    </section>
  );
}
