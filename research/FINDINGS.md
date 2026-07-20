# MatchaDB Research Bibliography — Master Findings

Compiled from 5 parallel research passes over the full matcha academic bibliography (233 real sources: 141 PubMed matcha papers, 51 adjacent green-tea/tea-science papers, 42 non-English sources in Japanese/Chinese/Korean). Full per-paper logs live in `research/raw-batches/`. This document is the actionable synthesis.

---

## 1. The ceremonial-grade question — now answered

**"Ceremonial grade" and "culinary grade" are not real classifications anywhere — Japanese, Chinese, Korean, or international.** Confirmed across three independent source types:

- **ISO/TR 21380:2022** (the only real international matcha standard) defines matcha purely by plant source + production method (shade-grown, steamed, dried unrolled, fine-ground). Its only quality language is process-fidelity based: **"high quality"** (stone mill + traditional brick tencha-ki dryer) vs. **"normal quality grade"** (ball/jet mill + metal dryer) — never "ceremonial" or "culinary." Single particle-size band for matcha as a whole (10–30μm mean, <20μm median), not tiered by grade.
- **The Japan Tea Central Association's own formal definition** (quoted verbatim in two independent Japanese papers) is a hard binary: shade-grown tea ground with a **stone mill** = matcha; the same shade-grown tea ground with a **ball mill** = legally a *different product*, "funmatcha" (powdered tea). Grinding tool, not end-use.
- **The real Japanese trade distinction** (documented in a 2025 academic study of Uji tea merchants) is **点前用 (ceremony-use) vs. 加工用 (processing-use)** — this is the actual ancestor of the Western marketing split, and even this has **no formal certification tier** behind it. The same study found several century-old Uji houses now sell 50–75% processing-grade matcha by volume, driven by Häagen-Dazs (1996) and Starbucks (2005) matcha-food demand.
- **Historically, matcha quality was a continuous price spectrum, not discrete grades** — a 1984 paper analyzed matcha at five price points (¥1,000–¥5,000/40g) and found compound content scaled continuously with price, not in named steps.
- Even a cultural essay in this batch notes trained tea-ceremony practitioners reportedly **can't reliably distinguish matcha grades by taste in blind comparison** — chanoyu's value is framed as ritual/aesthetic, not verified flavor hierarchy.

**Bottom line for the site**: "ceremonial" and "culinary" are real, useful, universally-understood *retail* shorthand — but they're marketing labels riding on top of a real, continuous production variable (shading duration, harvest flush, leaf part, grinding method), not a defined category with a certifying body anywhere in the world. This matches and confirms the answer already given informally earlier in this project.

---

## 2. Compound-data findings relevant to the shipped L-theanine/EGCG feature

### Strong corroboration of the existing Ceremonial/Culinary direction
Multiple independent, newer papers confirm the same directional relationship already encoded from Goto et al. 1994/1996 (higher grade → more theanine/amino acids/caffeine, less catechins/polyphenols; lower grade → the reverse):
- **Toniolo et al. 2025** (*Plants*) — direct 3-grade comparison (G1/G4/food grade): amino acids and caffeine decrease, polyphenols increase, G1→food grade.
- **Meyer et al. 2023** (*Plant Foods Hum Nutr*) — culinary-grade matcha showed *higher* antioxidant capacity than ceremonial-grade in their sample — matches Culinary EGCG (75.1) > Ceremonial EGCG (59.3mg/g) in the existing data.
- **Horie 2018 review**, citing the *same* Goto et al. 1994/1996 papers already used as MatchaDB's citation — independently confirms upper-grade = higher N/amino acids/caffeine, lower-grade = higher catechins.
- **Ikegaya et al. 1984** (Japanese) — 5 price-tier study: theanine/amino acids/caffeine decrease with decreasing price, consistent direction.

### A real discrepancy worth flagging
- **Kolackova et al. 2022** (*Antioxidants*) reported native matcha at **caffeine 16.1 mg/g, L-theanine 9.85 mg/g** — the theanine figure is notably *lower* than both current site tiers (Ceremonial 24.31, Culinary 13.68 mg/g). Grade/cultivar wasn't specified in the abstract. This doesn't invalidate the existing numbers, but it's a real independent HPLC measurement that undercuts the idea that 24.31/13.68 are universal — worth a full-text pull before deciding whether to note the range or investigate further.

### New cultivars found (all directional only — no absolute mg/g swappable into the current schema without more digging)
The current cultivar_research tier only covers **Yabukita**. These papers studied other cultivars, all confirming shading/cultivar effects but without a citable absolute number in the abstract:
- **Fuding** (Chen et al. 2022) — shading increased theanine/caffeine, decreased epicatechin/epigallocatechin, with transcriptomic mechanism (AAP gene downregulation).
- **Longjing 43** vs. **Yabukita** directly compared (Li et al. 2025, *Physiologia Plantarum*) — Longjing 43 retains *more* epi-catechins under shade than Yabukita; Yabukita is comparatively more shade-responsive/catechin-suppressible.
- **'Seimei'** vs. Yabukita/Saemidori (Kawahara et al. 2024 genome paper) — Seimei bred to have lower catechins, higher amino acids, lower caffeine than Yabukita.
- **Okumidori, Zhongcha 108, E'Cha 1** (Huang et al. 2024) — compositional variation confirmed but not quantified in the abstract.
- **Fuyun No. 6** (Fang et al. 2026) — selenium/altitude/shade combination improved theanine and antioxidant markers, qualitative only.

**Recommendation**: none of these clear the bar the site already set for itself (a specific, citable, absolute mg/g number for a named cultivar) — they're good candidates for a full-text follow-up pull if expanding the cultivar table is a priority, but shouldn't be added as-is.

### New compounds not currently tracked (well-corroborated across independent sources)
- **Fluoride** — three independent sources agree: Jakubczyk et al. 2022 (dry powder 118–122 mg/kg = ~0.12mg/g), Regelson et al. 2021 (matcha highest fluoride of all tested commercial teas), and Haraguchi 2015 Japanese review (8.9–21.9 mg% F, complexed with aluminum). A real, well-supported, currently-untracked data point.
- **Chlorophyll** — Herrera et al. 2022 (*Molecules*) found matcha has statistically the highest total chlorophyll of any green tea variety via direct HPLC-MS measurement (no exact mg/g in the abstract). Multiple Japanese papers (storage/Tencha-drying studies) give real chlorophyll-a/b degradation kinetics (e.g., 94% Chl-a retained at -70°C vs. 33.7% at 37°C after 24 weeks storage) but not baseline mg/g values by grade.
- **Organic acids** (citric, malic, oxalic, quinic) — Shirai 2019/2022 papers show these vary systematically across Sencha→Gyokuro→Matcha and shift measurably with shading (a second, independent mechanism-level confirmation that shading changes matcha's chemistry beyond just theanine/EGCG).

### The EGCG/EGC ratio as an alternative quality signal
Multiple independent Japanese sources (Horie 2018 review, Monobe et al. 2021) propose the **EGCG:EGC ratio**, not absolute values, as a more reliable quality-tier indicator than either compound alone — competition-winning tencha had EGC as low as 0.44% vs. 3.8% in ordinary sencha. Not implemented on the site currently; a genuinely different lens than the current single-value-per-compound display.

### A real caution on the current display's implied precision
**Unno et al. 2018/2019** established that matcha's calming/anxiolytic effect depends on the **molar ratio (caffeine+EGCG):(theanine+arginine) being <2**, not on either compound's absolute value. A real matcha-latte human trial (Monobe et al. 2021, Japanese) measured this ratio at 2.3 for a real commercial product — above the protective threshold, despite being a "high quality" product. This suggests a single compound's mg/g value, shown alone, may be a less meaningful health signal than the ratio between compounds — worth considering for a future iteration of the compounds display, though it would require tracking caffeine and arginine too.

---

## 3. Health effects — candidate content for a future public research/citations page

~90 studies were logged with real, citable findings across: cognitive function and MCI (mixed but real effects — improved "social acuity," attention/Stroop performance under stress, memory in some RCTs but not others), stress/anxiety (a specific, replicated molar-ratio mechanism), metabolic/NAFLD/obesity (consistently positive across many independent rodent studies), oral health (RCTs showing matcha comparable to 2% chlorhexidine for gingivitis), antimicrobial/antiviral (including inactivation of SARS-CoV-2 Omicron subvariants in vitro), and an important **negative result** (impaired HDL/cholesterol efflux and increased arterial stiffness in a rabbit atherosclerosis model) worth including for balance rather than cherry-picking positive findings. A specific citable dosing fact: caffeine improves cognitive performance from ~40mg, L-theanine from ~200mg (Dietz & Dekker 2017 review of 49 human studies).

Full catalog with citations in `research/raw-batches/batch-1..4`.

---

## 4. Production/quality science — general matcha-expert background now on file

Notable, well-corroborated facts now documented with real citations:
- Matcha's fine, smooth texture is a **stone-mill-era artifact** (post-~1300 CE) — pre-medieval mortar-ground matcha had a median particle size of ~150μm and was coarse/bitter (vs. today's ~5-20μm).
- The human oral "grittiness" perception threshold is **~16μm median particle diameter** (measured across 74 real matcha samples).
- Matcha foam is a three-phase system; particles physically localize on the inside of the bubble film and reinforce it — dissolved saponins set a baseline foam level, particle count adds the rest.
- During whisking, theanine/caffeine/EGC extract at >80%, but **EGCG extracts at ≤50%** (temperature-dependent solubility drops as whisking rapidly cools the water) — a real mechanistic reason prepared matcha tastes less bitter than its dry composition would predict.
- Matcha-style stone-milling **triples extractable EGCG** vs. steeped leaf tea of the same mass (Fujioka et al. 2016) — a genuinely good "why matcha not just green tea" citation.
- Storage: EGCG/ECG have a ~30–40 day half-life under light exposure; optimal storage is water activity ≤0.53, light-shielded, ideally ≤25°C.

---

## 5. Recommended next actions

1. **No code change needed for the ceremonial-grade question** — it's now answered; can inform future site copy (e.g., an "About grades" explainer) whenever that's wanted.
2. **Compound-data code**: the existing Goto et al. citations are now independently corroborated by multiple newer sources — worth adding a short comment in `compounds-extract.mjs` noting this corroboration, but no value changes needed. The Kolackova discrepancy and new cultivars are flagged but don't meet the bar for inclusion without a full-text pull.
3. **Open question for you**: worth pursuing full-text pulls (institutional access or targeted re-fetch) for the ~8 flagged high-value papers that are open-access but had abstract-only data (Huang et al. 2024 cultivar metabolomics, Najman et al. 2023 chlorophyll, Jakubczyk et al. 2024 per-sample table, CsPIF7 mechanism paper)?
4. **New scope, not yet started**: adding fluoride and/or chlorophyll as tracked, filterable compound fields (well-supported by 3+ independent sources each) would be a natural extension of the existing L-theanine/EGCG feature, but is new schema work, not something I've built.
5. **A public "Research" page** citing this bibliography remains a live option, not yet built.
