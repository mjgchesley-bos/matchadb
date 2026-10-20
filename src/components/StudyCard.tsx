import Link from "next/link";
import { KIND_LABEL, formatAuthors, snippetFor, type Study } from "@/lib/studies";

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

export function StudyCard({ study: s, terms = [] }: { study: Study; terms?: string[] }) {
  const snippet = snippetFor(s, terms, 240);
  return (
    <article className="border border-line rounded-sm p-4 bg-paper-raised hover:border-matcha hover:bg-matcha-soft transition-colors">
      <Link href={`/research/${s.id}`} className="flex flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
          <span className="font-mono tabular-nums text-forest">{s.year ?? "n.d."}</span>
          <span aria-hidden="true">·</span>
          <span>{KIND_LABEL[s.kind]}</span>
          {s.isOa && <span className="rounded-full bg-matcha-soft text-matcha-ink px-2 py-0.5 ml-1">Free to read</span>}
        </span>
        <h3 className="font-display text-lg leading-snug font-semibold text-ink">
          <Highlight text={s.title} terms={terms} />
        </h3>
        <span className="text-sm text-ink-muted">
          {formatAuthors(s.authors)}
          {s.journal ? <span className="text-ink-faint"> — {s.journal}</span> : null}
        </span>
        {snippet && (
          <p className="text-sm text-ink-muted leading-relaxed mt-1">
            <Highlight text={snippet} terms={terms} />
          </p>
        )}
        <span className="flex flex-wrap gap-1.5 mt-2 text-xs">
          <span className="rounded-full bg-matcha-soft text-matcha-ink px-2 py-0.5">{s.design}</span>
          {s.topics.slice(0, 3).map((t) => (
            <span key={t} className="rounded-full bg-paper-raised border border-line-strong text-ink-muted px-2 py-0.5">
              {t}
            </span>
          ))}
          {s.citedBy > 0 && (
            <span className="rounded-full border border-line text-ink-faint px-2 py-0.5 tabular-nums">Cited {s.citedBy.toLocaleString()}×</span>
          )}
        </span>
      </Link>
    </article>
  );
}
