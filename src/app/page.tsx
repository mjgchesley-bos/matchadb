import Image from "next/image";
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
      copy: "Scraped directly from each brand's current product page and normalized to a comparable $/g figure wherever the package size is disclosed — not a stale snapshot.",
    },
    {
      title: "Grade & provenance",
      copy: "Ceremonial or culinary, cultivar, growing region — captured where the brand actually discloses it, never inferred or guessed.",
    },
  ];

  const photoStrip = [
    {
      label: "The harvest",
      src: "/images/strip-the-harvest.jpg",
      alt: "A farmer with a woven basket walking through terraced tea rows in Japan at sunrise",
      copy: "Where the record starts — the terraced fields behind the grade, cultivar, and region data, captured wherever a brand discloses it.",
    },
    {
      label: "The afternoon break",
      src: "/images/strip-the-afternoon-break.jpg",
      alt: "Friends sharing iced matcha lattes at a café table beside a Japanese garden window",
      copy: "The reason the pricing matters — matcha as something people actually reach for, not just a spec sheet.",
    },
    {
      label: "The ingredient",
      src: "/images/strip-the-ingredient.jpg",
      alt: "Vibrant green matcha powder scattered on dark slate beside a gold measuring spoon",
      copy: "The thing itself — what a gram of it actually looks like before it's a price, a grade, or a listing.",
    },
  ];

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 pt-20 pb-24 sm:pt-24 sm:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-14 items-center">
            <div>
              <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-6">
                Matcha, catalogued
              </p>
              <h1 className="font-display text-[2.75rem] leading-[1.05] sm:text-[3.75rem] sm:leading-[1.02] font-semibold tracking-tight text-ink text-balance">
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
              <div className="mt-10 flex flex-col items-start gap-3">
                <Link
                  href="/browse"
                  className="group inline-flex items-center gap-2 bg-matcha text-paper px-7 py-3.5 text-sm font-medium tracking-wide transition-colors hover:bg-forest"
                >
                  Browse the catalog
                  <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
                </Link>
                <span className="text-sm text-ink-faint">
                  A guided matching tool and sourcing map are coming in later phases.
                </span>
              </div>
            </div>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm border border-line">
              <Image
                src="/images/hero-matcha-garden.jpg"
                alt="Iced matcha latte with leaf-pattern latte art, held beside a koi pond in a Japanese garden"
                fill
                priority
                sizes="(min-width: 1024px) 460px, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-matcha">
        <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="font-display text-4xl sm:text-5xl font-semibold text-paper tabular-nums">
                {s.value}
              </div>
              <div className="mt-2 text-sm text-paper/75">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pt-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {photoStrip.map((item) => (
            <div key={item.label}>
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-sm border border-line">
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-cover"
                />
              </div>
              <p className="mt-4 font-mono text-xs tracking-[0.2em] uppercase text-forest">
                {item.label}
              </p>
              <p className="mt-1.5 text-sm text-ink-muted leading-relaxed">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-24">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink max-w-md">
          What&apos;s in the record
        </h2>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-12 max-w-2xl">
          {pillars.map((p, i) => (
            <div key={p.title}>
              <span className="font-mono text-xs text-forest">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 font-display text-xl font-semibold text-ink">{p.title}</h3>
              <p className="mt-2.5 text-sm text-ink-muted leading-relaxed">{p.copy}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
