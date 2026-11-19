import type { ReactNode } from "react";

// The shared building blocks every MatchaDB page uses, so pages look like one site: a hero panel at the top, bordered panels for each section
// (mono uppercase header), and outlined stat tiles. Plain server markup, no scripts.
export const PANEL = "rounded-md border-2 border-line bg-paper-raised p-5 shadow-sm sm:p-6";

export function PageHero({ eyebrow, title, lede, tiles, children }: { eyebrow?: string; title: ReactNode; lede?: ReactNode; tiles?: [string, string][]; children?: ReactNode }) {
  return (
    <header className="rounded-md border-2 border-matcha bg-gradient-to-br from-matcha-soft to-paper-raised p-5 shadow-sm sm:p-8">
      {eyebrow && <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-forest">{eyebrow}</p>}
      <h1 className="font-display text-3xl font-semibold leading-tight text-ink text-balance sm:text-5xl">{title}</h1>
      {lede && <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-muted">{lede}</p>}
      {tiles && tiles.length > 0 && <Tiles tiles={tiles} className="mt-6" />}
      {children}
    </header>
  );
}

export function Tiles({ tiles, className = "" }: { tiles: [string, string][]; className?: string }) {
  return (
    <dl className={`grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 ${className}`}>
      {tiles.map(([k, v]) => (
        <div key={k} className="rounded-md border-2 border-matcha/50 bg-paper-raised px-4 py-3 text-center shadow-sm">
          <dd className="font-display text-xl font-semibold leading-snug text-forest tabular-nums">{v}</dd>
          <dt className="mt-1 text-xs uppercase tracking-wide text-ink-muted">{k}</dt>
        </div>
      ))}
    </dl>
  );
}

export function Panel({ id, title, sub, className = "", children }: { id?: string; title?: string; sub?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-h` : undefined} className={`${PANEL} ${className}`}>
      {title && <h2 id={id ? `${id}-h` : undefined} className="font-mono text-xs uppercase tracking-[0.2em] text-forest">{title}</h2>}
      {sub && <p className="mt-1 text-sm text-ink-muted">{sub}</p>}
      <div className={title ? "mt-3" : ""}>{children}</div>
    </section>
  );
}
