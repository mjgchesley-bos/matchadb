import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/i18n/Link";
import { JsonLd } from "@/components/JsonLd";
import { PRODUCERS } from "@/lib/producers";
import { PRODUCER_IMAGES } from "@/lib/producer-images";
import { CULTIVAR_IMAGES } from "@/lib/cultivar-images";
import { SITE_URL } from "@/lib/site";
import { langOf } from "@/i18n/params";
import { pageAlternates } from "@/i18n/seo";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await langOf(params);
  const title = "Matcha Producers: The Tea Houses, Farms and Families Behind Matcha";
  const description = "Profiles of the long-established tea houses and families behind matcha, from Uji and Kyoto to Nishio: their history, the people, where they are, and their matcha compared.";
  const alternates = pageAlternates(lang, "/producers");
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } };
}

const year = (founded: string) => parseInt(founded.replace(/\D/g, "").slice(0, 4), 10);

export default async function ProducersIndex({ params }: { params: Promise<{ lang: string }> }) {
  await langOf(params);
  const sorted = [...PRODUCERS].sort((a, b) => year(a.founded) - year(b.founded));
  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Matcha producers",
          url: `${SITE_URL}/producers`,
          mainEntity: { "@type": "ItemList", itemListElement: sorted.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/producers/${p.slug}`, name: p.name })) },
        }}
      />
      <header className="rounded-md border-2 border-matcha bg-gradient-to-br from-matcha-soft to-paper-raised p-5 shadow-sm sm:p-8">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">Producers</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">The tea houses and families behind matcha</h1>
        <p className="mt-4 max-w-3xl text-lg text-ink-muted leading-relaxed">
          Many of the matcha brands in this database come from tea houses that have been run by the same families for centuries. Each profile tells the company&apos;s story from its own history pages, names the people behind it, shows where it is, and links to its matcha. Pictures are public domain or openly licensed, and credited.
        </p>
      </header>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sorted.map((p) => {
          const im = p.images.map((k) => PRODUCER_IMAGES[k] ?? CULTIVAR_IMAGES[k]).find((i) => i && i.w >= i.h);
          return (
            <Link key={p.slug} href={`/producers/${p.slug}`} className="rounded-sm border border-line bg-paper-raised p-5 transition-colors hover:border-matcha hover:bg-matcha-soft">
              {im && <Image src={im.src} alt={im.alt} width={im.w} height={im.h} sizes="(min-width: 640px) 420px, 100vw" className="mb-4 h-36 w-full rounded-sm object-cover" />}
              <span className="block font-display text-xl font-semibold text-ink">
                {p.name}
                {p.native && <span className="ml-2 text-base font-normal text-ink-muted">{p.native}</span>}
              </span>
              <span className="mt-1 block text-xs text-ink-faint">Founded {p.founded} · {p.basedIn}</span>
              <span className="mt-2 block text-sm leading-relaxed text-ink-muted">{p.headline}.</span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
