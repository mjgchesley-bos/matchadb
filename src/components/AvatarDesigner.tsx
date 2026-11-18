"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { AvatarFigure } from "@/components/AvatarFigure";
import { useT } from "@/i18n/client";
import { DESIGN_BG, DESIGN_HAIR, DESIGN_SKIN, EXTRAS, EYES, HAIR_STYLES, MOUTHS, OUTFIT_COLORS, OUTFIT_STYLES, designCode, parseDesign, parseOutfit, randomDesign, type DesignParts, type Outfit } from "@/lib/avatar-design";

// "Design your own": pick a background, skin, hair, eyes, mouth, extra and outfit, or roll the dice, then use it as your avatar.
export function AvatarDesigner({ current, onUse }: { current: string | null; onUse: (code: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [p, setP] = useState<DesignParts>(() => parseDesign(current) ?? randomDesign());
  const [o, setO] = useState<Outfit>(() => parseOutfit(current));
  const setPart = (i: number, v: number) => setP((old) => old.map((x, j) => (j === i ? v : x)) as DesignParts);
  const code = designCode(p, o);

  const swatches = (selected: number, onPick: (k: number) => void, colors: string[], label: string) => (
    <div>
      <span className="text-xs text-ink-faint">{label}</span>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {colors.map((c, k) => (
          <button key={c} type="button" aria-label={`${label} ${k + 1}`} aria-pressed={selected === k} onClick={() => onPick(k)} className={`h-7 w-7 rounded-full border-2 ${selected === k ? "border-matcha" : "border-line-strong"}`} style={{ background: c }} />
        ))}
      </div>
    </div>
  );
  const choices = (selected: number, onPick: (k: number) => void, names: string[], label: string) => (
    <div>
      <span className="text-xs text-ink-faint">{label}</span>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {names.map((n, k) => (
          <button key={n} type="button" aria-pressed={selected === k} onClick={() => onPick(k)} className={`rounded-full border px-3 py-1 text-xs ${selected === k ? "border-matcha bg-matcha-soft text-ink" : "border-line-strong text-ink-muted hover:bg-matcha-soft"}`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-paper-raised px-4 py-2 text-sm font-medium text-ink hover:border-matcha hover:bg-matcha-soft">
        <Avatar avatar={current} size={22} />
        {t("c.av.open")}
      </button>
      {open && (
        <div className="basis-full rounded-sm border border-line bg-paper-raised p-4">
          <div className="flex flex-wrap items-start gap-6">
            <div className="flex flex-col items-center gap-3">
              <AvatarFigure code={code} height={230} />
              <button type="button" onClick={() => { setP(randomDesign()); setO([Math.floor(Math.random() * OUTFIT_STYLES.length), Math.floor(Math.random() * OUTFIT_COLORS.length)]); }} className="text-sm text-matcha underline hover:text-forest">
                {t("c.av.random")}
              </button>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              {swatches(p[0], (k) => setPart(0, k), DESIGN_BG, t("c.av.bg"))}
              {swatches(p[1], (k) => setPart(1, k), DESIGN_SKIN, t("c.av.skin"))}
              {choices(p[2], (k) => setPart(2, k), HAIR_STYLES, t("c.av.hair"))}
              {swatches(p[3], (k) => setPart(3, k), DESIGN_HAIR, t("c.av.hairColor"))}
              {choices(p[4], (k) => setPart(4, k), EYES, t("c.av.eyes"))}
              {choices(p[5], (k) => setPart(5, k), MOUTHS, t("c.av.mouth"))}
              {choices(p[6], (k) => setPart(6, k), EXTRAS, t("c.av.extra"))}
              {choices(o[0], (k) => setO([k, o[1]]), OUTFIT_STYLES, t("c.av.outfit"))}
              {swatches(o[1], (k) => setO([o[0], k]), OUTFIT_COLORS, t("c.av.outfitColor"))}
            </div>
          </div>
          <button type="button" onClick={() => { onUse(code); setOpen(false); }} className="mt-4 rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper hover:bg-forest">
            {t("c.av.use")}
          </button>
        </div>
      )}
    </>
  );
}
