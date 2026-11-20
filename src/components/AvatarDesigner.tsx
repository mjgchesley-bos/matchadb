"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { AvatarFigure } from "@/components/AvatarFigure";
import { useT } from "@/i18n/client";
import { DESIGN_BG, DESIGN_HAIR, DESIGN_SKIN, EXTRAS, EYES, HAIR_STYLES, MOUTHS, OUTFIT_COLORS, OUTFIT_STYLES, designCode, parseDesign, parseOutfit, randomDesign, type DesignParts, type Outfit } from "@/lib/avatar-design";

// "Design your own": pick a background, skin, hair, eyes, mouth, extra and outfit, or roll the dice, then use it as your avatar.
export function AvatarDesigner({ current, onUse, open: openProp, onOpenChange }: { current: string | null; onUse: (code: string) => void; open?: boolean; onOpenChange?: (v: boolean) => void }) {
  const t = useT();
  const [openState, setOpenState] = useState(false);
  // Controlled (no button of its own, opened by an "Edit" link elsewhere) when `open` is passed.
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openState;
  const setOpen = (v: boolean | ((o: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(open) : v;
    if (controlled) onOpenChange?.(next);
    else setOpenState(next);
  };
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
    <div className="sm:col-span-2">
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
      {!controlled && (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-paper-raised px-4 py-2 text-sm font-medium text-ink hover:border-matcha hover:bg-matcha-soft">
          <Avatar avatar={current} size={22} />
          {t("c.av.open")}
        </button>
      )}
      {open && (
        // Edits the avatar in place: the figure on the left updates live, every option is on the right, and Save closes the editor again.
        <div className="flex w-full basis-full flex-wrap items-start gap-x-8 gap-y-5">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <AvatarFigure code={code} height={300} />
            <button type="button" onClick={() => { setP(randomDesign()); setO([Math.floor(Math.random() * OUTFIT_STYLES.length), Math.floor(Math.random() * OUTFIT_COLORS.length)]); }} className="text-sm text-matcha underline hover:text-forest">
              {t("c.av.random")}
            </button>
          </div>
          <div className="min-w-0 flex-1 basis-80">
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {swatches(p[1], (k) => setPart(1, k), DESIGN_SKIN, t("c.av.skin"))}
              {swatches(p[0], (k) => setPart(0, k), DESIGN_BG, t("c.av.bg"))}
              {choices(p[2], (k) => setPart(2, k), HAIR_STYLES, t("c.av.hair"))}
              {swatches(p[3], (k) => setPart(3, k), DESIGN_HAIR, t("c.av.hairColor"))}
              <div className="hidden sm:block" />
              {choices(p[4], (k) => setPart(4, k), EYES, t("c.av.eyes"))}
              {choices(p[5], (k) => setPart(5, k), MOUTHS, t("c.av.mouth"))}
              {choices(p[6], (k) => setPart(6, k), EXTRAS, t("c.av.extra"))}
              {choices(o[0], (k) => setO([k, o[1]]), OUTFIT_STYLES, t("c.av.outfit"))}
              {swatches(o[1], (k) => setO([o[0], k]), OUTFIT_COLORS, t("c.av.outfitColor"))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => { onUse(code); setOpen(false); }} className="rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper hover:bg-forest">
                {t("c.av.use")}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-line-strong px-5 py-2 text-sm text-ink-muted hover:bg-paper">
                {t("c.cm.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
