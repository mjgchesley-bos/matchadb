"use client";

import { useState } from "react";

type Formats = { apa: string; bibtex: string; ris: string };

// Citation formats are generated on the server (src/lib/studies.ts) and passed
// in as plain strings; this only handles format switching and copying. The text
// is always rendered in full, so it stays readable and selectable with no JS.
export function CopyCitation({ formats }: { formats: Formats }) {
  const [fmt, setFmt] = useState<keyof Formats>("apa");
  const [copied, setCopied] = useState(false);
  const labels: Record<keyof Formats, string> = { apa: "APA", bibtex: "BibTeX", ris: "RIS" };

  async function copy() {
    try {
      await navigator.clipboard.writeText(formats[fmt]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the text is on screen to select by hand */
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {(Object.keys(labels) as (keyof Formats)[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFmt(k)}
            aria-pressed={fmt === k}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              fmt === k ? "bg-matcha text-paper border-matcha" : "border-line-strong text-ink-muted hover:border-matcha"
            }`}
          >
            {labels[k]}
          </button>
        ))}
        <button type="button" onClick={copy} className="ml-auto text-xs text-matcha hover:text-forest transition-colors">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-muted bg-paper-raised border border-line rounded-sm p-3 font-mono">
        {formats[fmt]}
      </pre>
    </div>
  );
}
