import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { PEOPLE, type Era } from "@/lib/matcha-people";
import { SITE_URL } from "@/lib/site";
import { langOf } from "@/i18n/params";
import { isLocale, type Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { pageAlternates } from "@/i18n/seo";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  const alternates = pageAlternates(lang, "/hall-of-fame");
  const title = t("hof.title");
  const description = t("hof.desc");
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } };
}

const ERAS: Era[] = ["china", "japan", "west"];

export default async function HallOfFamePage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  const t = getT(lang);
  const eraLabel = (e: Era) => t(`hof.era.${e}` as "hof.era.china");
  const eraNote = (e: Era) => t(`hof.era.${e}.note` as "hof.era.china.note");
  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Matcha Hall of Fame",
          url: `${SITE_URL}/hall-of-fame`,
          description: t("hof.desc"),
          mainEntity: {
            "@type": "ItemList",
            itemListElement: PEOPLE.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.name, url: `${SITE_URL}/hall-of-fame#${p.slug}` })),
          },
        }}
      />
      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("hof.eyebrow")}</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">{t("hof.h1")}</h1>
        <p className="mt-5 text-lg text-ink-muted leading-relaxed">{t("hof.lead")}</p>
        <p className="mt-3 text-sm text-ink-faint leading-relaxed">{t("hof.how")}</p>
      </header>

      {ERAS.map((e) => {
        const list = PEOPLE.filter((p) => p.era === e);
        return (
          <section key={e} className="mt-12" aria-labelledby={`era-${e}`}>
            <h2 id={`era-${e}`} className="font-display text-2xl font-semibold text-ink">{eraLabel(e)}</h2>
            <p className="mt-1 text-sm text-ink-muted">{eraNote(e)}</p>
            <div className="mt-6 flex flex-col gap-6">
              {list.map((p) => (
                <article key={p.slug} id={p.slug} className="scroll-mt-24 rounded-sm border border-line bg-paper-raised p-5 sm:p-6">
                  <header>
                    <h3 className="font-display text-xl sm:text-2xl font-semibold text-ink">
                      {p.name}
                      {p.native && <span className="ml-3 text-base font-normal text-ink-faint">{p.native}</span>}
                    </h3>
                    <p className="mt-1 text-sm text-ink-faint tabular-nums">{p.years}</p>
                    <p className="mt-2 text-base font-medium text-matcha">{p.title}</p>
                  </header>
                  <p className="mt-3 text-ink-muted leading-relaxed">{p.bio}</p>
                  <h4 className="mt-4 text-xs font-medium tracking-wide uppercase text-ink-faint">{t("hof.contrib")}</h4>
                  <ul className="mt-2 list-disc pl-5 flex flex-col gap-1.5 text-ink-muted leading-relaxed">
                    {p.contributions.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                  {p.note && <p className="mt-4 rounded-sm bg-matcha-soft px-3 py-2 text-sm text-ink-muted leading-relaxed">{p.note}</p>}
                  <p className="mt-4 text-xs text-ink-faint">
                    {t("hof.sources")}{" "}
                    {p.sources.map((s, i) => (
                      <span key={s.url}>
                        {i > 0 && ", "}
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-matcha underline hover:text-forest">
                          {s.label}
                        </a>
                      </span>
                    ))}
                  </p>
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <p className="mt-12 text-sm text-ink-muted leading-relaxed">{t("hof.outro")}</p>
    </main>
  );
}
