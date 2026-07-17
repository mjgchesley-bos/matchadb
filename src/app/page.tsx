import Link from "next/link";
import { getStats } from "@/lib/db";

export default async function Home() {
  const { brandCount, productCount } = await getStats();

  const stats = [
    { value: productCount.toLocaleString(), label: "Products catalogued" },
    { value: brandCount.toLocaleString(), label: "Brands researched" },
    { value: "90+", label: "Retailer sites verified" },
  ];

  const pillars = [
    {
      title: "Pricing, per gram",
      copy: "Every size a brand sells, scraped directly from the current product page and normalized to a comparable $/g figure — not a stale snapshot.",
    },
    {
      title: "Grade & provenance",
      copy: "Ceremonial or culinary, cultivar, growing region — captured where the brand actually discloses it, never inferred or guessed.",
    },
    {
      title: "Flagged, not hidden",
      copy: "When a brand's own page contradicts itself — on origin, on price, on anything — we surface it instead of quietly picking a side.",
    },
  ];

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 right-[-10%] h-[32rem] w-[32rem] rounded-full bg-matcha-soft blur-3xl opacity-70 dark:opacity-40"
        />
        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-matcha mb-6">
            Matcha, catalogued
          </p>
          <h1 className="font-display text-[2.75rem] leading-[1.05] sm:text-[4.25rem] sm:leading-[1.02] font-semibold tracking-tight text-ink text-balance max-w-3xl">
            Every matcha brand,
            <br />
            held to the same standard.
          </h1>
          <p className="mt-7 text-lg text-ink-muted max-w-xl leading-relaxed">
            A research database of {productCount.toLocaleString()} matcha products across{" "}
            {brandCount.toLocaleString()} brands &mdash; pricing, grade, and sourcing pulled
            directly from each brand&apos;s own product pages, kept current, and never smoothed
            over when the source contradicts itself.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link
              href="/browse"
              className="group inline-flex items-center gap-2 bg-ink text-paper px-7 py-3.5 text-sm font-medium tracking-wide transition-colors hover:bg-matcha-ink dark:hover:bg-matcha"
            >
              Browse the catalog
              <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
            </Link>
            <span className="text-sm text-ink-faint">
              A guided matching tool and sourcing map are coming in later phases.
            </span>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-paper-raised">
        <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="font-display text-4xl sm:text-5xl font-semibold text-ink tabular-nums">
                {s.value}
              </div>
              <div className="mt-2 text-sm text-ink-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-24">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink max-w-md">
          What&apos;s in the record
        </h2>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8">
          {pillars.map((p, i) => (
            <div key={p.title}>
              <span className="font-mono text-xs text-matcha">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 font-display text-xl font-semibold text-ink">{p.title}</h3>
              <p className="mt-2.5 text-sm text-ink-muted leading-relaxed">{p.copy}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
