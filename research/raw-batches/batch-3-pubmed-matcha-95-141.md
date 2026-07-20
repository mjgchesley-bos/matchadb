# Batch 3 — PubMed Matcha Bibliography, rows 95-141 (bib_dump2.txt lines 108-154)

47 papers. Source file: `bib_dump2.txt` lines 108-154, "Matcha Studies (PubMed)" sheet.
Fetched via PubMed abstract pages (with Europe PMC / Semantic Scholar / publisher-DOI fallback where PubMed returned a bot-check page instead of the abstract).

---

## HIGH PRIORITY — new compound/quantitative data

### 1. Jakubczyk et al. 2024 — "Exploring the Influence of Origin, Harvest Time, and Cultivation Method on Antioxidant Capacity and Bioactive Compounds of Matcha Teas." *Foods* (Basel). PMID 38672941. https://doi.org/10.3390/foods13081270

Analyzed 11 commercial matcha powders (Polish market) varying by geographic origin, harvest timing, and cultivation method (conventional vs organic).

- **Caffeine: 823.23 to 7313.22 mg/L** (brewed infusion) across the 11 samples — a huge ~9x spread driven by origin/harvest/cultivation.
- Total phenolics: 820.73–1017.83 mg gallic acid equivalent/L
- Total flavonoids: 864.71–1034.40 mg rutin equivalent/L
- Vitamin C: 38.92–70.15 mg/100 mL
- Antioxidant capacity (Trolox equivalent): 7.26–9.54 mM TE/L
- Reducing power: 1845.45–2266.12 (Fe(II)/L)
- Major polyphenols identified: epicatechin gallate, myricetin, gallic acid, 4-hydroxybenzoic acid.
- Confirmed conclusion: "phytochemical composition and antioxidant properties depended on the harvest time, type of cultivation, and country of origin" — but the abstract itself does not give a per-sample breakdown table (would need full text for that mapping). Caveat: units are per liter of brewed infusion, not mg/g powder, so not directly comparable to the site's existing mg/g figures without a conversion assumption.
- **Relevance**: This is the single most useful "real-world variance" data point found in this batch — direct evidence that commercial matcha caffeine content varies roughly 9-fold depending on origin/harvest/cultivation, which is a much wider range than the two-grade Goto et al. figures currently used. Worth pulling full text for the per-sample table.

### 2. Kim et al. 2026 — "Effect of water activity and light exposure on the stability of bioactive compounds in matcha (Camellia sinensis) powder during storage periods." *Food Chemistry*. PMID 41785770. https://doi.org/10.1016/j.foodchem.2026.148655

Storage-stability/degradation-kinetics study, not a baseline composition study, but directly quantifies how fast EGCG degrades:

- **Gallated catechins (EGCG and ECG) had half-lives of approximately 30–40 days under light exposure** during storage.
- Gallic acid remained relatively stable (i.e., non-gallated compounds degrade far slower).
- Water activity (Aw) tested 0.11–0.93; total polyphenols/flavonoids and antioxidant activity (ABTS/DPPH) declined progressively with higher Aw and light exposure.
- Optimal storage: Aw ≤ 0.53, light-shielded.
- **Relevance**: Directly useful for any future "how long does matcha stay potent" / storage-advice content — quantifies EGCG decay independent of grade/cultivar.

### 3. Toniolo et al. 2025 — "A Comparative Multianalytical Approach to the Characterization of Different Grades of Matcha Tea." *Plants* (Basel). PMID 40508306. https://doi.org/10.3390/plants14111631

Directly compares three matcha grades: ceremonial grade 1 (G1), grade 4 (G4), and food grade (FG), via HPTLC + NMR.

- **Directional finding (no absolute mg/g given in abstract): amino acids and caffeine show a decreasing gradient from G1 → G4 → food grade, while polyphenols show an increasing trend** (i.e., higher grade = more caffeine/amino acids, less polyphenol — consistent in direction with the site's existing Goto et al. Ceremonial-vs-Culinary contrast).
- Attributes the gradient to harvesting time and leaf maturity.
- **Relevance**: Directionally corroborates the existing Ceremonial/Culinary grade_research entries (Ceremonial has less EGCG, more theanine than Culinary per current data — here again Ceremonial/higher grade shows less "polyphenol" and more amino acid/caffeine). No exact numbers in the abstract; full text (NMR quantification section) likely has them and would be worth a follow-up fetch.

### 4. Chen et al. 2022 — "Effect of Shading on the Morphological, Physiological, and Biochemical Characteristics as Well as the Transcriptome of Matcha Green Tea." *Int J Mol Sci*. PMID 36430647. https://doi.org/10.3390/ijms232214169

Fuding white tea cultivated at 0% (control), 85% (S85), and 95% (S95) shade.

- **Directional only, no absolute values in abstract**: chlorophyll highest at S85, then S95, then control. Shading **increased theanine and caffeine**, **decreased epicatechin and epigallocatechin** (i.e., inverse relationship between shading and certain catechins).
- 2788 differentially expressed genes identified under shading; downregulation of amino acid permease (AAP) genes implicated in theanine transport/distribution.
- **Relevance**: This directly supports (mechanistically) why the site's Tier 2/3 cultivar and grade entries associate shading-heavy production with higher theanine — but gives no swappable numeric value. Note this is Fuding (a Chinese white-tea cultivar), not Yabukita, so it's a different cultivar data point than the current Tier 2 entry.

### 5. Batouti et al. 2026 — "UPLC profiling of matcha extract capping biosynthesized copper oxide nanoparticles..." *Scientific Reports*. PMID 41935218. https://doi.org/10.1038/s41598-026-47252-9

UPLC-MS profiling of a matcha extract used for nanoparticle synthesis **confirmed the presence of EGCG** as a major bioactive phytochemical (implicated in the Cu reduction reaction) — but no concentration value is reported in the abstract, only qualitative detection. Low priority as a data point, included here only because EGCG is explicitly named with analytical confirmation.

### 6. Ali, Alhomaid, Aleid 2026 — "In Vitro Bioactivity, Polyphenols, Antioxidant Properties, and Sensory Quality of Al-Qassim Berry-Enhanced Matcha Tea..." *Foods*. PMID 42450441. https://doi.org/10.3390/foods15132323

Note: values below are for a **matcha + strawberry/blackberry blend**, not pure matcha — included for reference only, not directly swappable into pure-matcha fields.

- Total phenolics up 24.4% at 100°C extraction vs. pure matcha; flavonoids up 31.6% at 100°C.
- Anthocyanins (introduced by berries): 52.35 mg/100 g at 5°C cold extraction.
- HPLC detected catechin, epicatechin, epicatechin gallate, gallic acid, protocatechuic acid, rutin — all increased vs. pure matcha baseline.
- DPPH inhibition 84.08%, ABTS inhibition 83.67% (both at 100°C).
- Acidic pH (~3.7) of the berry blend reportedly enhances catechin stability.

### 7. Aleid et al. 2026 — "Synergistic enhancement of matcha tea with strawberry (Qassim region) aqueous extracts..." *Frontiers in Nutrition*. PMID 42199755. https://doi.org/10.3389/fnut.2026.1824862

Companion study to #6 above (same research group/region). Reports **relative** catechin recovery enhancement (not absolute mg/g) from blending matcha with strawberry extract at different extraction temperatures: +24.8% at 70°C, +28.9% at 100°C; antioxidant activity +34.9% at 100°C. Cold brew (5°C) best preserves vitamin C. Blend pH ~3.70 vs. pure matcha ~6.20–6.30.

### 8. Tavares et al. 2026 — "Anxiolytic-like effects using adult zebrafish, bioaccessibility and phenolic profile of matcha and sugarcane beverages." *Nutritional Neuroscience*. PMID 41700941. https://doi.org/10.1080/1028415X.2026.2627249

Again a **blend** (35% matcha / 65% sugarcane juice, base "BB3", further combined with chamomile/lemon balm). Total phenolic content of two prioritized blends: **BBLB 669.84 ± 19.47 mg GAE/L**, **BBCLB 729.43 ± 41.49 mg GAE/L**; phenolic bioaccessibility ~29.8–30.8%. Predominant compounds: myricetin and chlorogenic acid. Not a pure-matcha figure but the closest thing to a bioaccessibility number found in this batch.

---

## Health effects (for a possible future public research/citations page)

- **#110 Taniguchi et al. 2026** (*Physiological Reports*) — Single 3g matcha intake increased brown adipose tissue (BAT) thermogenic activity in a crossover RCT of 30 young women, with the effect concentrated in participants who had low baseline BAT activity. Metabolic/thermogenesis angle.
- **#111 Tanaka-Kanegae et al. 2024** (*JMIR mHealth*) — RCT (n=100) comparing an app-guided "tea meditation" (matcha + mindfulness app) vs. standard breathing meditation over 8 weeks. Both groups showed significant stress reduction (P<.001) on Perceived Stress Scale-10; the tea-meditation group showed significantly larger gains in self-reported "relaxed/calm" premeditation mood scores (P=.04/.048). >57% found the app acceptable; over half reported better happiness/sleep/work performance. Stress/mood angle.
- **#113 Xu et al. 2016** (*Food & Function*) — Aqueous matcha extract and water-insoluble residue both improved lipid/glucose markers in high-fat-diet mice (lower cholesterol/triglycerides/LDL, higher HDL, better glucose, more antioxidant enzyme activity); insoluble fraction was flagged as particularly important. Metabolic angle.
- **#118 Zorlu et al. 2026** (*Frontiers in Medicine*) — Oral whole-leaf matcha (50 mg/kg/day, 30 days) partially attenuated UV-induced photoaging in rats (reduced epidermal thickening, better collagen/dermal papilla structure, fewer fine wrinkles). Skin/photoprotection angle.
- **#128 Soliman, Mourad, Mohamed 2025** (*Trop Anim Health Prod*) — Matcha tea (with chia seed) in drinking water activated hypothalamic-pituitary-gonadal axis genes and led to earlier puberty onset in growing male rabbits. Animal endocrine angle — probably not relevant for a human-facing page but flagged.
- **#131 Fang et al. 2026** (*JAFC*) — Nanoselenium fertilization + cultivation environment (altitude/shade/cultivar Fuyun No. 6) improved matcha's antioxidant activity under simulated digestion, boosted glutathione peroxidase activity, strengthened gut intestinal barrier proteins (Claudin-1, Occludin), and shifted gut microbiota favorably (more Ligilactobacillus). Gut-health angle.
- **#134 Zhang et al. 2019** (*Canadian J Diabetes*) — Matcha/instant tea supplementation in diabetic mice reversed gut dysbiosis (restored Lactobacillaceae/Bifidobacteriaceae, reduced pathogenic families) and trended toward lower blood glucose. Metabolic/gut angle.
- **#135 Morita, Matsueda, Iida 1997** (Japanese; *Fukuoka Acta Medica*) — Historic study on Yusho (PCB/dioxin poisoning) patients/rat model: 10% dietary matcha increased fecal excretion of PCBs/PCDFs/PCDDs by 2.4–9.1x and reduced hepatic accumulation to 20–79% of control. Detox/environmental-toxin angle, notable historical/Japanese public-health relevance.
- **#136 Ramez et al. 2021** (*Frontiers in Veterinary Science*) — Combined Spirulina + matcha green tea reduced hepatic/splenic damage from a parasitic infection model in mice via antioxidant/anti-inflammatory mechanisms. Animal model.
- **#141 Abdul-Wahab, Salah, Abdulbaqi 2024** (*Int J Dental Hygiene*) — RCT in gingivitis patients: both matcha and green tea improved oral health-related quality of life and plaque/bleeding scores after 1 month; only the matcha group showed a significant rise in salivary total antioxidant capacity. Oral health angle.
- **#142 Tavares et al. 2026** — see HIGH PRIORITY #8 above; also has an anxiolytic-like behavioral effect finding in adult zebrafish for the matcha-based blends, no toxicity observed.
- **#143 Saleh et al. 2026** (*Vet Parasitology*) — Matcha green tea (alone and combined with Spirulina) showed anticoccidial-adjacent protective effects (comparable to toltrazuril) in Eimeria stiedae-infected rabbits: better weight gain/feed conversion, reduced oocyst shedding, less oxidative stress/inflammation, less hepatic damage. Animal model.
- **#145 Lindinger 2016** (*Scientifica*) — Organic matcha + antimicrobial herbal enzyme drinking-water additive reduced canine dental plaque by 37% (day 14) and 22% (day 28) vs. baseline, without other oral care. Veterinary oral health.
- **#109 Khateeb, Taha 2024** (*Int J Radiation Biology*) — Matcha green tea showed greater anti-inflammatory/antioxidant activity than the NSAID etoricoxib against radiation-induced acute kidney injury in rats. Renal-protection/radioprotection angle.
- **#114 Dickson et al. 2020** (*Pathogens*) — Hot-brewed matcha inhibited Acanthamoeba castellanii trophozoite growth (>40% at full strength) and encystation (87% reduction); more cytotoxic to the parasite than isolated EGCG alone, though also more cytotoxic to host kidney cells than EGCG. Antimicrobial/antiparasitic angle (relevant to contact-lens-related keratitis prevention research, tangentially).
- **#112 Fatimawali et al. 2021** (*Data in Brief*, molecular docking) — In-silico docking of matcha/betel phytoconstituents against 5 SARS-CoV-2 targets (spike, RBD, Mpro, RdRp, PLpro); purely computational, no wet-lab validation. Low-confidence but topical (COVID) angle if ever relevant.
- **#121 Chiba et al. 2025** (*J Dermatology*) — Case report: allergic urticaria from green tea/matcha consumption. No abstract available; flagged as a rare-adverse-event data point for a "safety considerations" section.
- **#122 Schroder et al. 2019** — Corrigendum only (author name spelling fix) for a 2018 paper on green tea/matcha/EGCG/quercetin vs. breast cancer cell lines; the underlying study (Oncology Reports 41:387-396, 2019, DOI 10.3892/or.2018.6789) would need separate lookup if the anticancer angle is wanted.

---

## Production/quality science

- **#108 Baba et al. 2017** (*JAFC*) — GC-olfactometry identified 8 core odor-active compounds (sweet/green/metallic/floral notes) consistent across matcha grades, plus grade-specific odorants; trans-4,5-epoxy-(E)-2-decenal exists as a racemic mixture in matcha. Foundational matcha aroma-chemistry paper.
- **#116 Wu et al. 2021** (*Food Chemistry*) — LASSO + PCA model on 8 (of 24 candidate) physicochemical indicators predicts matcha sensory quality without a human panel; correlation coefficients ~-0.895 (calibration)/-0.883 (prediction).
- **#117 Akal, Akbas 2025** (*Int J Biol Macromol*) — Deep eutectic solvent (DES) extraction of polyphenol-rich matcha extract, incorporated into agar-based biodegradable antimicrobial packaging films (active vs Gram-positive bacteria and Candida albicans); DES functions as extraction solvent and plasticizer.
- **#119 Tan et al. 2021** (*Polymer Bulletin*) — Matcha-extract-capped silver nanoparticles (green-synthesized) used as a smartphone-camera colorimetric H2O2 biosensor; detection limit 0.82 μM, 5-second response time; also antibacterial/antifungal.
- **#124 Pauliuc et al. 2025** (*Gels*) — Honey-propolis-enriched apple pectin films (propolis 0.1-0.3%) as active packaging for soluble coffee and matcha powders; propolis increased antioxidant activity but reduced tensile strength/elasticity.
- **#126 Ouyang et al. 2021** (*Food Chemistry*) — Vis-NIR hyperspectral imaging (BOSS-PLS models) simultaneously predicts caffeine (R²=0.8077), tea polyphenols (R²=0.7098), free amino acids (R²=0.7942), TP/FAA ratio (R²=0.8314), and chlorophyll (R²=0.8473) in matcha — a nondestructive multi-constituent QC method, not an absolute-concentration dataset.
- **#127 Xue et al. 2025** (*Food Research International*) — Metabolomic study of two cultivars (Longjing 43, Zhongcha 108): cultivar is the dominant driver of matcha astringency (more so than processing); 679 flavonoid metabolites identified; quercetin-3-O-glucoside, kaempferol-3-O-rutinoside, EGCG, and kaempferol-3-O-glucoside identified as key astringency-driving compounds. Longjing 43 leaves have more glycosylated flavonoids; Zhongcha 108 has more O-methylated flavonoids. Drying significantly increases flavonoid glycoside content.
- **#129, #137** — see HIGH PRIORITY #6/#7 (berry-matcha blend extraction-temperature optimization).
- **#130 Li et al. 2023** (*J Sci Food Agric*) — Matcha-fortified starch vermicelli (rice/sweet potato/mung bean starches): matcha reduced rapidly-digestible starch fraction in rice-based vermicelli from 71.28% to 56.31%; most polyphenol release occurs within first 20 min of digestion.
- **#132** — see HIGH PRIORITY #5 (matcha-extract-synthesized CuO nanoparticles; antibacterial MIC 250 μg/mL vs E. coli/S. aureus; selective cytotoxicity to MCF-7/Caco-2 cancer cells over healthy Vero cells).
- **#133 Guo et al. 2021** (*Food Chemistry*) — NIR + SiPLS-SPA/SA models predict total polyphenols, free amino acids, and TP/FAA taste-quality ratio with Rp > 0.97-0.98.
- **#138 Latoch et al. 2025** (*Foods*) — Borage seed oil + matcha tea powder in vacuum-packed lamb meatloaf: combined use cut TBARS (oxidation marker) by up to 80% over 14 days storage; matcha's green color reduced meat redness (a*) ~50% but didn't shift overall ΔE* significantly.
- **#139 Sen, Kilic 2021** (*Meat Science*) — Whey-protein edible coatings with matcha extract (higher phenolics/antioxidant capacity than acai) delayed lipid oxidation in cooked meatballs during refrigerated/frozen storage; acai suppressed microbial growth better.
- **#140 Liu et al. 2026** (*Foods*) — Matcha addition (0.5-1.0%) in re-steamed bread stabilized gluten disulfide bonds and inhibited starch retrogradation during cold storage, preserving texture/volume; **above 1.0% matcha, excess polyphenols depolymerized gluten and worsened bread quality** — a clear "more isn't better" dose-response finding.
- **#146 Yardimci 2026** (*Analytical Methods*) — Matcha extract's catechins used as a green-chemistry coupling reagent for a smartphone-RGB/UV-Vis colorimetric assay detecting procaine in pharmaceuticals (LOD 0.33 mg/L UV-vis, 0.67 mg/L smartphone).
- **#147 Dobrucka et al. 2024** (*Molecules*) — Pectin + matcha leaf extract packaging films: matcha addition improved water-vapor barrier properties ~50%, strong antioxidant activity, no toxicity in test organisms; proposed for edible sausage casings.
- **#148 Raina-Fulton, Mohamad 2018** (*Toxics*) — Analytical method (pressurized solvent extraction + LC-MS/MS) for conazole fungicide residues in matcha; matcha's high catechin/polyphenol/caffeine matrix causes significant ion-suppression matrix effects (~-41±19%) requiring matrix-matched calibration; detected trace prothioconazole-desthio and flusilazole (0.002-0.004 mg/kg) and trace tebuthiuron. Relevant to a future pesticide-residue/safety discussion.
- **#149 Mao et al. 2024** (*Food Chemistry: X*) — Two-stage (high-then-low temperature) Tencha drying protocols preserved color quality (higher chlorophyll, lower lutein/β-carotene) better than single-temperature drying; chlorophylls and their derivatives (chlorophyll a/b, pheophytin a/b, pyropheophytin a/b) are the primary color drivers.
- **#150 Liu et al. 2023** (*Food Chemistry*) — Portable NIR spectroscopy (CARS-PLS) predicts chlorophyll a (Rp=0.9204), chlorophyll b (Rp=0.9282), and total chlorophyll (Rp=0.9385) during Tencha processing — strong nondestructive QC tool.
- **#151 Rong et al. 2023** (*Spectrochimica Acta A*) — Vis-NIR + colorimetric sensor array data fusion evaluates Tencha drying aroma quality (94.68%/93.48% calibration/prediction accuracy); pentanal identified as strongly correlated with aroma quality during drying.
- **#152 You et al. 2024** (*J Sci Food Agric*) — Computer vision (1D-CNN on color images) predicts Tencha drying moisture content (Rp=0.9548), replacing subjective worker sensory judgment.
- **#153 Hasegawa et al. 2016** (*Angewandte Chemie*) — Tencha has a distinctive "seaweed-like" aroma vs. Sencha; difference driven by low-boiling-point volatile constituents, while high-boiling constituents give the shared "matcha-like" base note.
- **#154 Chang et al. 2025** (*J Sci Food Agric*) — Attention-integrated deep learning (Squeeze-and-Excitation ResNet18) + multispectral imaging (25 bands, 660-924nm) predicts Tencha chlorophyll content during drying (training r=0.9814, testing r=0.9337, RPD 2.79%) — most accurate of the several Tencha-chlorophyll QC papers in this batch.
- **#145, #120** — dental/veterinary-adjacent, low direct relevance to matcha production science but noted above.

---

## Full per-paper log (all 47)

**108.** Baba et al. 2017, *J Agric Food Chem*, "Characterization of the Potent Odorants Contributing to the Characteristic Aroma of Matcha by GC-Olfactometry." PMID 28343386. GC-O/AEDA across three matcha grades identified 8 consistently important odorants (sweet/green/metallic/floral) plus grade-specific ones; trans-4,5-epoxy-(E)-2-decenal shown to be racemic. No compound-concentration data. [Production/quality]

**109.** Khateeb, Taha 2024, *Int J Radiation Biology*, "Comparative study of the anti-inflammatory activity of etoricoxib and Matcha green tea against acute kidney injury induced by gamma radiation in rats." PMID 38647648. Matcha green tea showed greater anti-inflammatory/antioxidant activity than etoricoxib against radiation-induced kidney injury in rats. No compound-concentration data. [Health]

**110.** Taniguchi et al. 2026, *Physiological Reports*, "Single intake of matcha increases brown adipose tissue activity in young women with low thermogenesis." PMID 42068075. Crossover RCT (n=30, 3g matcha vs placebo): BAT activity difference was significant only in the subgroup with low baseline BAT activity. No compound data. [Health]

**111.** Tanaka-Kanegae et al. 2024, *JMIR mHealth uHealth*, "Feasibility and Efficacy of a Novel Mindfulness App Used With Matcha Green Tea." PMID 39657179. RCT (n=100, 8 weeks): app-guided "tea meditation" vs breathing meditation; both reduced stress significantly, tea-meditation group had larger gains in relaxed/calm mood scores. No compound data. [Health]

**112.** Fatimawali et al. 2021, *Data in Brief*, "Data on the docking of phytoconstituents of betel plant and matcha green tea on SARS-CoV-2." PMID 33869690. In-silico molecular docking of matcha phytoconstituents against 5 SARS-CoV-2 protein targets; purely computational data-note, no wet lab validation, no compound concentration data. [Health, low confidence]

**113.** Xu et al. 2016, *Food & Function*, "The effects of the aqueous extract and residue of Matcha on the antioxidant status and lipid and glucose levels in mice fed a high-fat diet." PMID 26448271. Both soluble extract and insoluble residue improved lipid/glucose/antioxidant markers in HFD mice; insoluble fraction flagged as particularly active. No compound-concentration data. [Health]

**114.** Dickson et al. 2020, *Pathogens*, "In Vitro Growth- and Encystation-Inhibitory Efficacies of Matcha Green Tea and EGCG Against Acanthamoeba." PMID 32957663. Hot-brewed matcha inhibited trophozoite growth >40% and encystation 87% at full strength; more cytotoxic to parasite (and to host kidney cells) than isolated EGCG. No matcha-composition numbers given (only EGCG dose-range tested: 50-1000 µM). [Health]

**115.** Chen et al. 2022, *Int J Mol Sci*, "Effect of Shading on the Morphological, Physiological, and Biochemical Characteristics as Well as the Transcriptome of Matcha Green Tea." PMID 36430647. Fuding white tea under 0/85/95% shade: chlorophyll peaked at 85% shade; shading increased theanine/caffeine, decreased epicatechin/epigallocatechin; 2788 DEGs identified, AAP genes downregulated. Directional only, no absolute values in abstract. [HIGH PRIORITY #4]

**116.** Wu et al. 2021, *Food Chemistry*, "Physicochemical indicators coupled with multivariate analysis for comprehensive evaluation of matcha sensory quality." PMID 34537612. LASSO-PCA model of 8 physicochemical indicators predicts sensory quality (rc=-0.895, rp=-0.883). [Production]

**117.** Akal, Akbas 2025, *Int J Biol Macromol*, "Functional biodegradable agar based films from polyphenol-rich matcha extracts via deep eutectic solvents." PMID 41187852. DES-extracted matcha polyphenols in antimicrobial agar packaging films. [Production]

**118.** Zorlu et al. 2026, *Frontiers in Medicine*, "Oral whole-leaf matcha partially attenuates UV-induced dermoepidermal disruption... in a rat model of repeated photoaging." PMID 42359064. 50 mg/kg/day oral matcha, 30 days: reduced UV-induced epidermal thickening, better collagen/dermal structure, fewer wrinkles. No compound data. [Health]

**119.** Tan et al. 2021, *Polymer Bulletin*, "A sensitive and smartphone colorimetric assay for the detection of hydrogen peroxide based on... matcha extract silver nanoparticles enriched with polyphenol." PMID 34413556. Matcha-extract-capped Ag nanoparticles as H2O2 biosensor (LOD 0.82 µM, 5s response); also antibacterial/antifungal. [Production]

**120.** Yeslam et al. 2025, *J Functional Biomaterials*, "The Impact of Coffee, Matcha, Protein Drinks, and Water Storage on... a Nano-Ceramic Hybrid Composite CAD/CAM Blank." PMID 41440621. Dental material study: matcha caused less microhardness loss than water in glass-ceramic; coffee caused most color change; matcha/protein gentler on both materials tested. Tangential to matcha itself — one line. [Low relevance]

**121.** Chiba et al. 2025, *J Dermatology*, "A case of allergic urticaria induced by green tea and matcha." PMID 39780561. Case report, no abstract available. [Health, safety — one line]

**122.** Schroder et al. 2019, *Oncology Reports*, "[Corrigendum] Effects of green tea, matcha tea and their components EGCG and quercetin on MCF-7 and MDA-MB-231 breast carcinoma cells." PMID 31894277. Author-name-spelling corrigendum only; no research data in this record — original paper is Oncology Reports 41:387-396 (2019), DOI 10.3892/or.2018.6789. [One line]

**123.** Jakubczyk et al. 2024, *Foods*, "Exploring the Influence of Origin, Harvest Time, and Cultivation Method on Antioxidant Capacity and Bioactive Compounds of Matcha Teas." PMID 38672941. See HIGH PRIORITY #1 — caffeine 823-7313 mg/L range across 11 commercial matchas by origin/harvest/cultivation.

**124.** Pauliuc et al. 2025, *Gels*, "Honey-Propolis-Enriched Pectin Films for Active Packaging of Soluble Coffee and Matcha Powders." PMID 41149405. Propolis (0.1-0.3%) in pectin-honey films for coffee/matcha packaging; more propolis = more antioxidant activity but less mechanical strength. [Production]

**125.** Toniolo et al. 2025, *Plants*, "A Comparative Multianalytical Approach to the Characterization of Different Grades of Matcha Tea." PMID 40508306. See HIGH PRIORITY #3 — G1/G4/food-grade comparison, amino acids/caffeine decrease and polyphenols increase from G1 to food grade.

**126.** Ouyang et al. 2021, *Food Chemistry*, "Simultaneous quantification of chemical constituents in matcha with visible-near infrared hyperspectral imaging technology." PMID 33618087. VNIR-HSI models predict caffeine/TP/FAA/TP-FAA-ratio/chlorophyll (R²=0.71-0.85). [Production]

**127.** Xue et al. 2025, *Food Research International*, "Effect of cultivar and process on the astringency of matcha based on flavonoids-targeted metabolomic analysis." PMID 39986794. Cultivar (Longjing 43 vs Zhongcha 108) is the dominant driver of matcha astringency; EGCG named among key astringency compounds; 679 flavonoid metabolites profiled. [Production, cultivar-relevant]

**128.** Soliman, Mourad, Mohamed 2025, *Trop Anim Health Prod*, "Exploring the impact of chia seeds and matcha green tea on gene expression related to the puberty pathway in growing male New Zealand white rabbits." PMID 40172761. Matcha activated puberty-pathway genes via HPG axis in rabbits; testosterone rise mainly attributed to chia. No compound data. [Health, animal]

**129.** Aleid et al. 2026, *Frontiers in Nutrition*, "Synergistic enhancement of matcha tea with strawberry aqueous extracts: influence of extraction temperature on phytochemicals, vitamin C, and bioactivities." PMID 42199755. See HIGH PRIORITY #7.

**130.** Li et al. 2023, *J Sci Food Agric*, "Comparison of in vitro starch digestibility and structure of matcha-fortified starch vermicelli from different botanical sources." PMID 37483079. Matcha lowered rapidly-digestible starch fraction in rice vermicelli (71.28%→56.31%); most polyphenol release in first 20 min digestion. [Production]

**131.** Fang et al. 2026, *J Agric Food Chem*, "Synergistic Effects of Nanoselenium and Environmental Factors on the Quality, Antioxidant Activity, and Gut Health Benefits of Matcha." PMID 42011851. Selenium-enriched, high-altitude, shaded cv. Fuyun No. 6 matcha showed enhanced theanine and antioxidant/gut-health markers (qualitative; no absolute values given). [Health + production, cultivar-relevant]

**132.** Batouti et al. 2026, *Scientific Reports*, "UPLC profiling of matcha extract capping biosynthesized copper oxide nanoparticles and their antimicrobial and cytotoxic potentials." PMID 41935218. See HIGH PRIORITY #5 — EGCG confirmed present via UPLC-MS (no concentration given); CuO-NP antibacterial MIC 250 µg/mL, selective anticancer cytotoxicity.

**133.** Guo et al. 2021, *Food Chemistry*, "Intelligent evaluation of taste constituents and polyphenols-to-amino acids ratio in matcha tea powder using near infrared spectroscopy." PMID 33725540. NIR + SiPLS models predict TP/FAA/TP-FAA-ratio with Rp>0.97-0.98. [Production]

**134.** Zhang et al. 2019, *Canadian J Diabetes*, "Changes in Intestinal Microbiota of Type 2 Diabetes in Mice in Response to Dietary Supplementation With Instant Tea or Matcha." PMID 31378691. Matcha/instant tea reversed diabetic gut dysbiosis and trended toward lower glucose. No compound data. [Health]

**135.** Morita, Matsueda, Iida 1997, *Fukuoka Acta Medica* (Japanese), "Effect of green tea (matcha) on gastrointestinal tract absorption of PCBs/PCDFs/PCDDs in rats." PMID 9194336. 10% dietary matcha (10 days) in Yusho-oil-exposed rats increased fecal excretion of PCB/PCDF/PCDD 2.4-9.1x and cut hepatic accumulation to 20-79% of control. No compound-composition data on the matcha itself. [Health/historical]

**136.** Ramez et al. 2021, *Frontiers in Veterinary Science*, "Hepatosplenic Protective Actions of Spirulina and Matcha Green Tea Against [parasitic] Infection in Mice via Antioxidative and Anti-inflammatory Mechanisms." PMID 33996977. Combined Spirulina+matcha reduced hepatic/splenic damage from parasitic infection via antioxidant/anti-inflammatory action. No compound data. [Health, animal]

**137.** Ali, Alhomaid, Aleid 2026, *Foods*, "In Vitro Bioactivity, Polyphenols, Antioxidant Properties, and Sensory Quality of Al-Qassim Berry-Enhanced Matcha Tea." PMID 42450441. See HIGH PRIORITY #6 — berry-matcha blend, not pure matcha.

**138.** Latoch et al. 2025, *Foods*, "The Effect of Borage Seed Oil and Matcha Tea Powder on... Vacuum-Packed Lamb Meatloaf." PMID 41154036. Combined borage oil + matcha cut TBARS oxidation by up to 80% over 14 days; matcha reduced meat redness ~50%. [Production]

**139.** Sen, Kilic 2021, *Meat Science*, "Effects of edible coatings containing acai powder and matcha extracts on shelf life and quality parameters of cooked meatballs." PMID 33989837. Matcha extract had higher phenolics/antioxidant capacity than acai; delayed lipid oxidation in stored meatballs; acai better for microbial suppression. [Production]

**140.** Liu et al. 2026, *Foods*, "Mechanism of the Effects of Storage Time and Matcha Addition on the Quality of Re-Steamed Bread." PMID 42450374. Matcha 0.5-1.0% stabilized gluten/inhibited starch retrogradation during cold storage; >1.0% matcha worsened bread quality via gluten depolymerization from excess polyphenols. [Production, dose-response]

**141.** Abdul-Wahab, Salah, Abdulbaqi 2024, *Int J Dental Hygiene*, "Salivary levels of catalase, total antioxidant capacity and IL-1β and oral health-related QoL after matcha and green tea consumption for patients with gingivitis." PMID 38764154. RCT: both teas improved gingivitis QoL/plaque/bleeding scores; only matcha significantly raised salivary total antioxidant capacity. [Health]

**142.** Tavares et al. 2026, *Nutritional Neuroscience*, "Anxiolytic-like effects using adult zebrafish, bioaccessibility and phenolic profile of matcha and sugarcane beverages." PMID 41700941. See HIGH PRIORITY #8 — matcha/sugarcane/herb blends, phenolic content 670-729 mg GAE/L, anxiolytic-like effect in zebrafish, no toxicity. [Health]

**143.** Saleh et al. 2026, *Veterinary Parasitology*, "Hepatoprotective and nutraceutical effects of Spirulina platensis and Matcha green tea on Eimeria stiedae Infected Rabbits." PMID 41719887. Matcha (alone/combined with Spirulina) improved weight gain, reduced oocyst shedding, oxidative stress, inflammation, hepatic damage — comparable to toltrazuril. No compound data. [Health, animal]

**144.** Kim et al. 2026, *Food Chemistry*, "Effect of water activity and light exposure on the stability of bioactive compounds in matcha powder during storage periods." PMID 41785770. See HIGH PRIORITY #2 — EGCG/ECG half-life ~30-40 days under light exposure during storage.

**145.** Lindinger 2016, *Scientifica*, "Reduced Dental Plaque Formation in Dogs Drinking a Solution Containing Natural Antimicrobial Herbal Enzymes and Organic Matcha Green Tea." PMID 27867678. Matcha-containing water additive reduced canine plaque 37% (day 14) / 22% (day 28). [Health, veterinary]

**146.** Yardimci 2026, *Analytical Methods*, "Nature's touch in the laboratory: eco-friendly... UV-vis and smartphone RGB analysis of procaine... using... matcha green tea extract." PMID 41886068. Matcha catechins used as green-chemistry coupling reagent for procaine detection (LOD 0.33 mg/L UV-vis / 0.67 mg/L smartphone RGB). [Production/analytical]

**147.** Dobrucka et al. 2024, *Molecules*, "Green Packaging Films with Antioxidant Activity Based on Pectin and Matcha Leaf Extract." PMID 39407627. Matcha in pectin films improved water-vapor barrier ~50%, strong antioxidant activity, non-toxic; proposed for edible sausage casings. [Production]

**148.** Raina-Fulton, Mohamad 2018, *Toxics*, "Pressurized Solvent Extraction with Ethyl Acetate and LC-MS/MS for... Conazole Fungicides in Matcha." PMID 30366422. Analytical method for pesticide residues in matcha; catechins/polyphenols/caffeine cause matrix ion-suppression (~-41±19%); detected trace prothioconazole-desthio, flusilazole (0.002-0.004 mg/kg), tebuthiuron. [Production/safety]

**149.** Mao et al. 2024, *Food Chemistry: X*, "Effect of different drying temperature settings on the color characteristics of Tencha." PMID 39582648. Two-stage drying (high-then-low temp) preserved Tencha color better (higher chlorophyll, lower lutein/β-carotene) than single-temperature drying. [Production]

**150.** Liu et al. 2023, *Food Chemistry*, "Monitoring chlorophyll changes during Tencha processing using portable near-infrared spectroscopy." PMID 36716622. Portable NIR (CARS-PLS) predicts chlorophyll a/b/total with Rp=0.92-0.94. [Production]

**151.** Rong et al. 2023, *Spectrochimica Acta A*, "Application of visible near-infrared spectroscopy combined with colorimetric sensor array for the aroma quality evaluation in tencha drying process." PMID 37714101. Data-fusion Vis-NIR + sensor array predicts Tencha drying aroma quality (93-95% accuracy); pentanal correlates with aroma quality. [Production]

**152.** You et al. 2024, *J Sci Food Agric*, "Prediction and visualization of moisture content in Tencha drying processes by computer vision and deep learning." PMID 38349009. 1D-CNN on color images predicts Tencha moisture content (Rp=0.9548), replacing subjective sensory assessment. [Production]

**153.** Hasegawa et al. 2016, *Angewandte Chemie Int Ed*, "Characteristic Aroma Features of Tencha and Sencha Green Tea Leaves Manufactured by Different Processes." PMID 30725584. Tencha's distinctive "seaweed-like" note vs Sencha driven by low-boiling-point volatiles; shared "matcha-like" base note from high-boiling constituents. [Production]

**154.** Chang et al. 2025, *J Sci Food Agric*, "Intelligent chlorophyll estimation by attention-integrated deep learning and dual-modal fusion in tencha drying using snapshot multispectral camera." PMID 40405630. SE-ResNet18 + multispectral imaging predicts Tencha chlorophyll (train r=0.9814, test r=0.9337, RPD 2.79%) — most accurate of the Tencha-chlorophyll papers in this batch. [Production]

---

### Notes on access

All 47 abstracts were successfully retrieved (via PubMed directly, or — when PubMed served a bot-check page instead of content — via Europe PMC / Semantic Scholar Graph API / publisher DOI redirect as a fallback). No papers in this batch were left as "abstract unavailable" except #121 (case report letter, PubMed itself lists "No abstract available") and #122 (corrigendum notice only, no research content to summarize).
