"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useT } from "@/i18n/client";
import { DESIGN_BG, DESIGN_HAIR, DESIGN_SKIN, DESIGN_SIZES, EXTRAS, EYES, HAIR_STYLES, MOUTHS, designCode, parseDesign, randomDesign, type DesignParts } from "@/lib/avatar-design";

// "Design your own": pick a background, skin, hair, eyes, mouth and extra, or roll the dice, then use it as your avatar.
export function AvatarDesigner({ current, onUse }: { current: string | null; onUse: (code: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [p, setP] = useState<DesignParts>(() => parseDesign(current) ?? randomDesign());
  const setPart = (i: number, v: number) => setP((old) => old.map((x, j) => (j === i ? v : x)) as DesignParts);

  const swatches = (i: number, colors: string[], label: string) => (
    <div>
      <span className="text-xs text-ink-faint">{label}</span>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {colors.map((c, k) => (
          <button key={c} type="button" aria-label={`${label} ${k + 1}`} aria-pressed={p[i] === k} onClick={() => setPart(i, k)} className={`h-7 w-7 rounded-full border-2 ${p[i] === k ? "border-matcha" : "border-line-strong"}`} style={{ background: c }} />
        ))}
      </div>
    </div>
  );
  const choices = (i: number, names: string[], label: string) => (
    <div>
      <span className="text-xs text-ink-faint">{label}</span>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {names.map((n, k) => (
          <button key={n} type="button" aria-pressed={p[i] === k} onClick={() => setPart(i, k)} className={`rounded-full border px-3 py-1 text-xs ${p[i] === k ? "border-matcha bg-matcha-soft text-ink" : "border-line-strong text-ink-muted hover:bg-matcha-soft"}`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-paper-raised px-4 py-2 text-sm font-medium text-ink hover:border-matcha hover:bg-matcha-soft">
        <Avatar avatar={current} size={22} />
        {t("c.av.open")}
      </button>
      {open && (
        <div className="basis-full rounded-sm border border-line bg-paper-raised p-4">
          <div className="flex flex-wrap items-start gap-5">
            <div className="flex flex-col items-center gap-3">
              <Avatar avatar={designCode(p)} size={96} />
              <button type="button" onClick={() => setP(randomDesign())} className="text-sm text-matcha underline hover:text-forest">
                {t("c.av.random")}
              </button>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              {swatches(0, DESIGN_BG, t("c.av.bg"))}
              {swatches(1, DESIGN_SKIN, t("c.av.skin"))}
              {choices(2, HAIR_STYLES, t("c.av.hair"))}
              {swatches(3, DESIGN_HAIR, t("c.av.hairColor"))}
              {choices(4, EYES, t("c.av.eyes"))}
              {choices(5, MOUTHS, t("c.av.mouth"))}
              {choices(6, EXTRAS, t("c.av.extra"))}
            </div>
          </div>
          <button type="button" onClick={() => { onUse(designCode(p)); setOpen(false); }} className="mt-4 rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper hover:bg-forest">
            {t("c.av.use")}
          </button>
        </div>
      )}
    </>
  );
}
