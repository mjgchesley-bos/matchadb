"use client";

import Link from "@/i18n/Link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AuthContext, useAuth } from "@/components/AuthProvider";
import { BusinessTools } from "@/components/BusinessTools";
import { CafePageEditor } from "@/components/CafePageEditor";
import { OwnerCafeSections } from "@/components/OwnerCafeSections";
import { DemoCtx, resetDemo } from "@/lib/demo";
import { accentStyle, type OwnerMenuFile, type OwnerPage, type OwnerPhoto } from "@/lib/cafe-owner-page";
import { supabase } from "@/lib/supabase";
import { CONTACT_EMAIL } from "@/lib/site";

// Staff-only: "log in" as a made-up café owner. The real owner screens (My account business box, café page editor) run on an in-memory fake database
// (src/lib/demo.tsx), so every button works but nothing is saved, no account exists and the café is not on the map. Reload or "Start over" resets it.
type Snap = { name: string; page: OwnerPage; photos: OwnerPhoto[]; files: OwnerMenuFile[] };
const panel = "rounded-md border-2 border-line bg-paper-raised p-5 shadow-sm sm:p-6";
const head = "font-mono text-xs uppercase tracking-[0.2em] text-forest";

export function DemoCafeClient() {
  const real = useAuth();
  const [staff, setStaff] = useState<boolean | null>(null);
  const [run, setRun] = useState(0);
  const [snap, setSnap] = useState<Snap | null>(null);

  useEffect(() => {
    if (!real.user) return setStaff(real.ready ? false : null);
    let live = true;
    supabase().rpc("is_staff").then(({ data }) => live && setStaff(!!data));
    return () => { live = false; };
  }, [real.user, real.ready]);

  const fake = useMemo(
    () => ({ ...real, ready: true, user: { id: "demo-owner", email: "owner@demomatchahouse.example" } as unknown as User, displayName: "Demo owner" }),
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
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-forest">Demo · signed in as a café owner</p>
        <h1 className="mt-1 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">The Demo Matcha House</h1>
        <p className="mt-3 max-w-2xl text-ink-muted">
          This is exactly what a café owner sees. Every button works, but it is a pretend café: nothing is saved to the database, it is not on the map and no
          account exists. Reloading the page puts everything back.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <button type="button" onClick={() => { resetDemo(); setSnap(null); setRun((n) => n + 1); }} className="rounded-full border border-matcha px-4 py-1.5 font-medium text-matcha hover:bg-matcha-soft">Start over</button>
          <Link href="/admin" className="rounded-full border border-line-strong px-4 py-1.5 text-ink-muted hover:bg-paper">Back to the dashboard</Link>
        </div>
      </header>

      <AuthContext.Provider value={fake}>
        <DemoCtx.Provider value={true}>
          <div key={run} className="mt-6 flex flex-col gap-8">
            <section aria-labelledby="d1">
              <h2 id="d1" className={`${head} mb-3`}>Screen 1 · My account → “Your business page”</h2>
              <BusinessTools contactEmail={CONTACT_EMAIL} />
            </section>

            <section aria-labelledby="d2">
              <h2 id="d2" className={`${head} mb-3`}>Screen 2 · Your café page (the editor)</h2>
              <CafePageEditor onState={setSnap} />
            </section>

            {snap && (
              <section aria-labelledby="d3" style={accentStyle(snap.page.accent)}>
                <h2 id="d3" className={`${head} mb-3`}>What visitors see on the café page (updates as you edit)</h2>
                <div className={panel}>
                  {snap.page.announcement && <p className="mb-4 rounded-sm border-2 border-matcha bg-matcha-soft px-4 py-2 text-sm text-forest">{snap.page.announcement}</p>}
                  <p className="font-display text-2xl font-semibold text-ink">{snap.name}</p>
                  {snap.page.tagline && <p className="mt-1 text-ink-muted">{snap.page.tagline}</p>}
                  <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                    {Object.entries(snap.page.hours).map(([d, h]) => (
                      <div key={d} className="flex justify-between rounded-sm border border-line px-3 py-1.5"><dt className="capitalize text-ink-muted">{d}</dt><dd className="text-ink">{h}</dd></div>
                    ))}
                  </dl>
                </div>
                <OwnerCafeSections name={snap.name} page={snap.page} photos={snap.photos} files={snap.files} />
              </section>
            )}
          </div>
        </DemoCtx.Provider>
      </AuthContext.Provider>
    </main>
  );
}
