import Link from "@/i18n/Link";
import { snippetFor, type Study } from "@/lib/studies";
import { getT, getTV } from "@/i18n/server";
import { fmtNum, type Locale } from "@/i18n/config";

const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Wraps every occurrence of the searched words in <mark>, so it is obvious why a
// result matched. Pure server-side string splitting: no client JS.
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length || !text) return <>{text}</>;
  const parts = text.split(new RegExp(`(${terms.map(esc).join("|")})`, "gi"));
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-matcha-soft text-matcha-ink rounded-sm px-0.5">
            {p}
          </mark>
        ) : (
          p
        )
      )}
    </>
  );
}

export function StudyCard({ study: s, terms = [], lang = "en" }: { study: Study; terms?: string[]; lang?: Locale }) {
  const t = getT(lang);
  const tv = getTV(lang);
  const snippet = snippetFor(s, terms, 240);
  const authors = !s.authors.length ? t("rs.noAuthors") : s.authors.length > 3 ? t("rs.etal", { list: s.authors.slice(0, 3).join(", ") }) : s.authors.join(", ");
  return (
    <article className="border border-line rounded-sm p-4 bg-paper-raised hover:border-matcha hover:bg-matcha-soft transition-colors">
      <Link href={`/research/${s.id}`} className="flex flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
          <span className="font-mono tabular-nums text-forest">{s.year ?? t("rs.nd")}</span>
          <span aria-hidden="true">·</span>
          <span>{t(`rs.kind.${s.kind}` as "rs.kind.article")}</span>
          {s.isOa && <span className="rounded-full bg-matcha-soft text-matcha-ink px-2 py-0.5 ml-1">{t("rs.free")}</span>}
        </span>
        <h3 className="font-display text-lg leading-snug font-semibold text-ink">
          <Highlight text={s.title} terms={terms} />
        </h3>
        <span className="text-sm text-ink-muted">
          {authors}
          {s.journal ? <span className="text-ink-faint"> — {s.journal}</span> : null}
        </span>
        {snippet && (
          <p className="text-sm text-ink-muted leading-relaxed mt-1">
            <Highlight text={snippet} terms={terms} />
          </p>
        )}
        <span className="flex flex-wrap gap-1.5 mt-2 text-xs">
          <span className="rounded-full bg-matcha-soft text-matcha-ink px-2 py-0.5">{tv("design", s.design)}</span>
          {s.topics.slice(0, 3).map((tp) => (
            <span key={tp} className="rounded-full bg-paper-raised border border-line-strong text-ink-muted px-2 py-0.5">
              {tv("topic", tp)}
            </span>
          ))}
          {s.citedBy > 0 && (
            <span className="rounded-full border border-line text-ink-faint px-2 py-0.5 tabular-nums">{t("rs.cited", { n: fmtNum(lang, s.citedBy) })}</span>
          )}
        </span>
      </Link>
    </article>
  );
}
