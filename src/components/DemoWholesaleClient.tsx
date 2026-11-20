"use client";

import Link from "@/i18n/Link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AuthContext, useAuth } from "@/components/AuthProvider";
import { BusinessTools } from "@/components/BusinessTools";
import type { Product } from "@/components/ProductsPanel";
import { DemoCtx, resetDemo } from "@/lib/demo";
import { bannerUrl } from "@/lib/business";
import { supabase } from "@/lib/supabase";
import { CONTACT_EMAIL } from "@/lib/site";

// Staff-only: "log in" as a made-up wholesale supplier. The real wholesaler screen (banner + products) runs on the same in-memory fake database as the
// café demo, so every button works but nothing is saved and no account exists. Reload or "Start over" resets it.
const head = "font-mono text-xs uppercase tracking-[0.2em] text-forest";

export function DemoWholesaleClient() {
  const real = useAuth();
  const [staff, setStaff] = useState<boolean | null>(null);
  const [run, setRun] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!real.user) return setStaff(real.ready ? false : null);
    let live = true;
    supabase().rpc("is_staff").then(({ data }) => live && setStaff(!!data));
    return () => { live = false; };
  }, [real.user, real.ready]);

  const fake = useMemo(
    () => ({ ...real, ready: true, user: { id: "demo-owner", email: "orders@demomatchasupply.example" } as unknown as User, displayName: "Demo Matcha Supply" }),
    [real],
  );

  if (staff === null) return <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 text-sm text-ink-muted">Checking access…</main>;
  if (!staff)
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="font-display text-3xl font-semibold text-ink">Staff only</h1>
        <p className="mt-3 text-ink-muted">This page is for MatchaDB staff.</p>
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <header className="rounded-md border-2 border-matcha bg-gradient-to-br from-matcha-soft to-paper-raised p-5 shadow-sm sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-forest">Demo · signed in as a wholesaler</p>
        <h1 className="mt-1 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">Demo Matcha Supply Co.</h1>
        <p className="mt-3 max-w-2xl text-ink-muted">
          This is what a wholesale or brand account sees: a banner and a product list, all on one box of their account page. Every button works, but it is
          pretend: nothing is saved, no account exists and the company is not in the wholesale directory. Reloading puts everything back.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <button type="button" onClick={() => { resetDemo(); setBanner(null); setProducts([]); setRun((n) => n + 1); }} className="rounded-full border border-matcha px-4 py-1.5 font-medium text-matcha hover:bg-matcha-soft">Start over</button>
          <Link href="/admin" className="rounded-full border border-line-strong px-4 py-1.5 text-ink-muted hover:bg-paper">Back to the dashboard</Link>
        </div>
      </header>

      <AuthContext.Provider value={fake}>
        <DemoCtx.Provider value="wholesale">
          <div key={run} className="mt-6 flex flex-col gap-8">
            <BusinessTools contactEmail={CONTACT_EMAIL} onBanner={setBanner} onProducts={setProducts} />

            <section aria-labelledby="dw-preview" className="scroll-mt-4">
              <h2 id="dw-preview" className={`${head} mb-3`}>Their public profile (what visitors see; updates as you edit)</h2>
              {banner && (
                // eslint-disable-next-line @next/next/no-img-element -- demo banner is a browser blob
                <img src={bannerUrl(banner)} alt="Banner" className="mb-4 h-36 w-full rounded-md border-2 border-matcha object-cover sm:h-52" />
              )}
              <div className="rounded-md border-2 border-matcha bg-gradient-to-br from-matcha-soft to-paper-raised p-5 shadow-sm sm:p-6">
                <p className="font-display text-2xl font-semibold text-ink">Demo Matcha Supply Co.</p>
                <p className="mt-2 text-sm font-medium text-ink"><span className="mr-2 rounded-full bg-matcha px-2.5 py-0.5 text-xs text-paper">Wholesaler</span>Demo Matcha Supply Co.</p>
                <p className="mt-2 max-w-xl text-sm text-ink-muted">Direct-from-Uji matcha for cafés and retailers. Wholesale pricing, samples on request.</p>
                <p className="mt-2 text-sm text-matcha underline">demomatchasupply.example</p>
              </div>
              {products.length > 0 && (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {products.map((p) => (
                    <li key={p.id} className="rounded-md border-2 border-matcha/50 bg-paper-raised px-4 py-3 shadow-sm">
                      <p className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-display text-lg font-semibold text-ink">{p.name}</span>{p.price && <span className="font-medium tabular-nums text-forest">{p.price}</span>}</p>
                      {p.description && <p className="mt-1 whitespace-pre-line text-sm text-ink-muted">{p.description}</p>}
                      {p.url && <span className="mt-3 inline-block rounded-full border border-matcha px-4 py-1.5 text-sm font-medium text-matcha">Buy or learn more</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </DemoCtx.Provider>
      </AuthContext.Provider>
    </main>
  );
}
