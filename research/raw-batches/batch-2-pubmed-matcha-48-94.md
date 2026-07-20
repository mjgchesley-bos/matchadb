# Batch 2 — PubMed Matcha Bibliography, papers 61–107 (of "Matcha Studies (PubMed)" sheet)

Source list: `bib_dump2.txt` lines 61-107, 47 papers. Fetched via PubMed abstract (WebFetch); where PubMed served a reCAPTCHA wall, fell back to the DOI resolver or the Europe PMC REST API (`www.ebi.ac.uk/europepmc/webservices/rest/search`) to retrieve the same abstract text.

---

## HIGH PRIORITY — new compound/quantitative data

### 1. Kolackova, M. et al. (2022). "The Effect of [Simulated] Digestion on Matcha Tea Active Components and Antioxidant Activity." *Antioxidants (Basel)*. https://pubmed.ncbi.nlm.nih.gov/35624753/ | https://doi.org/10.3390/antiox11050889

**This is the single best quantitative hit in this batch.** Reports actual analyte concentrations for native (undigested) matcha powder:
- **Caffeine: 16.1 mg/g**
- **L-theanine: 9.85 mg/g**
- Theobromine: 0.27 mg/g
- Chlorogenic acid: 2.09–2.46 mg/g (2090–2460 µg/g)
- Rutin: 0.303–0.479 mg/g (303–479 µg/g)
- "Catechin" (appears to be a single non-epi catechin peak, not total catechins/EGCG): 10.2–23.1 µg/g

After simulated gastric+intestinal digestion, the undigested residue retained only: caffeine 3.66–5.26 mg/g (~13% of native), L-theanine 0.09–0.15 mg/g (~0.1% of native) — i.e., theanine and caffeine are almost completely released/bioavailable during digestion. Overall antioxidant activity fell >94% after digestion; digestibility was 61.2–65.8%.

**Relevance to site's Goto et al. numbers:** This L-theanine value (9.85 mg/g) is notably *lower* than both existing site tiers (Ceremonial 24.31 mg/g, Culinary 13.68 mg/g). This could reflect a different/lower grade sample, different cultivar, or methodological difference (this paper doesn't specify grade in the abstract — worth pulling the full text to check). It's a real, independently-sourced HPLC number that could be added as a third reference point or used to caveat the existing range, but it should NOT be presented as corroborating the current numbers without noting the discrepancy. Full text should be checked for grade/cultivar/brand details before using.

### 2. Weiss, D.J. & Anderton, C.R. (2003). "Determination of catechins in matcha green tea by micellar electrokinetic chromatography." *Journal of Chromatography A*. https://pubmed.ncbi.nlm.nih.gov/14518774/ | https://doi.org/10.1016/s0021-9673(03)01133-6

Classic, frequently-cited analytical chemistry paper developing an MEKC method to quantify five catechins + caffeine in matcha vs. common green teas. Key claim from the abstract: matcha's bioavailable EGCG was **"137 times greater than the amount of EGCG available from China Green Tips green tea, and at least three times higher than the largest literature value for other green teas."** No absolute mg/g figure was recoverable from the abstract alone (full text is paywalled behind Elsevier/ScienceDirect — WebFetch was blocked with 403). This is a well-known reference in matcha literature and worth a follow-up full-text pull if accessible via library/institutional access, since the actual mg/g EGCG figure (not just the ratio) would be directly comparable to the site's Goto et al. numbers.

### 3. Meyer, A.S. et al. (2023). "Catechin Composition, Phenolic Content, and Antioxidant Properties of Commercially-Available Bagged, Gunpowder, and Matcha Green Teas." *Plant Foods for Human Nutrition*. https://pubmed.ncbi.nlm.nih.gov/37923855/ | https://doi.org/10.1007/s11130-023-01121-2

Compared 15 commercial green teas (bagged, gunpowder/rolled-leaf, and matcha) for catechin/phenolic/antioxidant profile. Notable finding: **bagged and gunpowder teas had higher total phenolic content and antioxidant capacity (CUPRAC, ORAC) than matcha overall**, and **culinary-grade matcha showed higher antioxidant capacity than ceremonial-grade matcha** in their sample set. This is a potentially important corroboration (directionally) of the site's existing grade data — Goto et al. numbers already have Culinary EGCG (75.1 mg/g) > Ceremonial EGCG (59.3 mg/g), so an independent paper finding culinary > ceremonial antioxidant capacity is a supporting data point, though Meyer et al. didn't report exact mg/g catechin numbers in the abstract (only comparative/equivalent-unit measures: gallic acid equivalents, Trolox equivalents). Full text would be needed for absolute values — worth pulling if accessible (Springer, may not be open access).

### 4. Nekvapil, T. et al. (2024). "The Release of Organic Acids and Low Molecular Weight Carbohydrates from Matcha Tea After In Vitro Digestion." *Nutrients*. https://pubmed.ncbi.nlm.nih.gov/39683452/ | https://doi.org/10.3390/nu16234058

Not catechin/theanine data, but real quantitative composition numbers for native matcha (open-access Nutrients paper): **citric acid 44.8 mg/g, malic acid 32.2 mg/g, trehalose 36.1 mg/g, L-arabinose 8.20 mg/g**. Digestibility of dry matter: 67.3% (gastric) → 85.9% (full gastric+intestinal). Lower priority than the L-theanine/EGCG asks but useful supplementary composition data if MatchaDB ever expands beyond the current compound set.

### 5. Wang, Q. et al. (2019). "Evaluation of matcha tea quality index using portable NIR spectroscopy coupled with chemometric algorithms." *J. Sci. Food Agric.* https://pubmed.ncbi.nlm.nih.gov/30977141/ | https://doi.org/10.1002/jsfa.9743

Reports ranges (not individual compounds) across their matcha sample set: **total tea polyphenols 8.51–14.58%, total amino acids 2.10–3.75%** (dry weight, using NIR/PLS models, RP 0.86–0.97). Quality graded into three tiers (qualified/unqualified/excellent) using the polyphenol:amino-acid ratio, 83.33% classification accuracy. Not broken down to L-theanine/EGCG specifically, but a real bulk-composition range from an independent lab.

### 6. Unno, K. et al. (2019). "Stress-reducing effect of cookies containing matcha green tea: essential ratio among theanine, arginine, caffeine and epigallocatechin gallate." *Heliyon*. https://pubmed.ncbi.nlm.nih.gov/31111111/ | https://doi.org/10.1016/j.heliyon.2019.e01653

No absolute mg/g values recovered, but a specific, citable ratio claim: in mice, matcha reduced the stress marker of adrenal hypertrophy **only when the molar ratio of (caffeine + EGCG) to (theanine + arginine) was ≤2**; most commercial matcha reportedly exceeds this ratio (see also #7 below, Monobe et al., which used matcha with ratio >2 and still found anxiolytic effects). In a 15-day human trial, pharmacy students eating matcha cookies (ratio-controlled) had significantly lower salivary α-amylase (stress marker) than placebo. This is a genuinely useful anchor for a future "quality ratio" health-marketing angle, even without absolute concentrations.

### 7. Chen, H. et al. (2024). "Comprehensive study of matcha foam formation: Physicochemical composition analysis and mechanisms impacting foaming properties." *Food Chemistry*. https://pubmed.ncbi.nlm.nih.gov/39550972/ | https://doi.org/10.1016/j.foodchem.2024.142009

Tested 9 matcha types/grades; identified **Longjing 43 cultivar** as a high-quality raw material for foaming matcha. EGCG increased foam-forming ability 1.89-fold (relative, not absolute mg/g); amino acids (e.g., valine) contributed foam stability. Notable because Longjing 43 also appears as a tested cultivar in #8 below — two independent papers studying the same non-Yabukita cultivar (which the site currently doesn't have any cultivar_research tier data for besides Yabukita).

### 8. Huang, Y. et al. (2024). "A comprehensive metabolomics analysis of volatile and non-volatile compounds in matcha processed from different tea varieties." *Food Chemistry: X*. https://pubmed.ncbi.nlm.nih.gov/38420509/ | https://doi.org/10.1016/j.fochx.2024.101234

Compared four tea cultivars used for matcha: **Okumidori, Longjing 43, Zhongcha 108, and E'Cha 1**. Abstract states polyphenol, ester-catechin, non-ester-catechin, and amino acid levels **"varied among these four varieties"** but does not give exact numbers in the abstract (1,383 non-volatile compounds detected, 177 significantly differential). This is exactly the kind of cultivar-level breakdown the site is missing (currently only Yabukita) — worth a full-text pull (Food Chemistry: X is open access under Elsevier's OA imprint, may be retrievable).

### 9. Najman, K. et al. (2023). "The Content of Bioactive Compounds and Technological Properties of Matcha Green Tea and Its Application in the Design of Functional Beverages." *Molecules*. https://pubmed.ncbi.nlm.nih.gov/37894496/ | https://doi.org/10.3390/molecules28207018

Evaluated 10 different matcha samples for **phenolic content, chlorophyll, and vitamin C levels** plus physical properties (color, water activity, solubility) — chlorophyll measurement is notable since MatchaDB doesn't currently track chlorophyll at all. No exact figures were recoverable from the abstract (MDPI open access — full text should have tables with these values; worth a follow-up full-text pull since it's freely accessible).

### 10. Ouyang, Q. et al. (2023). "Application of colorimetric sensor array combined with visible near-infrared spectroscopy for the matcha classification." *Food Chemistry*. https://pubmed.ncbi.nlm.nih.gov/37075576/ | https://doi.org/10.1016/j.foodchem.2023.136078

Grade-classification methodology paper (BPANN model, 99%/98% accuracy identifying matcha grades from volatile-compound sensor data) — confirms distinct volatile-compound signatures differ by grade, and eight characteristic volatile compounds were identified as grade markers, but no catechin/theanine/caffeine mg/g values given.

---

## Health effects

- **#63 Baba et al. 2021** (Nutrients) — RCT in middle-aged/older adults: continuous matcha intake improved sustained work performance under psychological stress, while caffeine alone only helped acute attention; matcha+caffeine combined outperformed caffeine alone on both attention and work output under stress.
- **#64 Igarashi/Takagi/Fukushima 2022** (Nutrients) — SAMP8 (accelerated-aging) mice given matcha or decaffeinated matcha: memory/coat improvements were limited, but proteomics showed regulation of proteins tied to neurodegeneration, GABA transport, and oxidative stress, proposed as biomarkers for future cognitive-aging food studies.
- **#65 Willems et al. 2020** (J Dietary Supplements) — 3 weeks of daily matcha (3× 1g capsules/day, premium grade) in females increased fat oxidation ~35% and lowered carb oxidation during moderate exercise, without changing heart rate or total energy expenditure.
- **#66 Tsuda 2025** (Biosci Biotechnol Biochem) — Matcha improved oxidative-stress resistance and activated detox pathways in *Drosophila*, likely via caffeine-catechin synergy; did not extend lifespan under high-protein diet.
- **#67 Morishima et al. 2022** (J Clin Biochem Nutr) — RCT: 2 weeks of matcha significantly shifted human fecal microbiota (30 genera changed vs. 3 in placebo), increasing Coprococcus and decreasing Fusobacterium.
- **#69 Pannucci et al. 2024** (Nat Prod Res) — Grade 1 vs Grade 4 matcha extracts both showed strong antiglycative and antioxidant activity (60°C/80°C ultrasonic extraction); supports nutraceutical potential across grades.
- **#71 Monobe et al. 2019** (Biosci Biotechnol Biochem) — Continuous matcha ingestion (commercial-ratio matcha, i.e., caffeine+EGCG:theanine+arginine ratio >2) reduced anxiety-like behavior in mice after social stress — notable because it still worked despite an "inadequate" ratio per Unno et al.'s framework (#6 above).
- **#76 El-Elimat et al. 2022** (Plant Foods Hum Nutr) — 12-week pilot in overweight/obese adults: matcha + low-calorie diet vs. diet alone — both groups lost weight similarly; matcha group showed potential improvements in HDL-C, glucose, insulin, leptin, SOD activity, and IL-10 (anti-inflammatory).
- **#61 Keckstein et al. 2023 / #77 Keckstein et al. 2022** (Arch Gynecol Obstet) — In vitro: matcha extract (5–50 µg/mL) reduced viability of MCF-7 and T47D breast cancer cells; decreased estrogen receptor-beta protein (MCF-7) and increased PPARγ expression (T47D), suggesting anti-proliferative mechanisms.
- **#85 Yamabe et al. 2009** (J Med Food) — Matcha (50/100/200 mg/kg/day, 16 weeks) reduced glucose, triglycerides, cholesterol and renal AGE accumulation in type 2 diabetic OLETF rats; protected kidney and liver.
- **#87 Megahd & Gabal 2021** (Pak J Biol Sci) — Matcha and ashwagandha teas (100/200 mg/kg) protected against H2O2-induced utero-ovarian oxidative injury in rats; matcha showed the strongest protective effect of the two.
- **#90 Kim et al. 2021** (Antioxidants) — Aqueous matcha extract improved memory/learning in PM2.5-exposed mice via reduced systemic inflammation, restored cholinergic function, and protected mitochondrial function in brain tissue.
- **#91 Dietz, Dekker & Piqueras-Fiszman 2017** (Food Res Int) — Human RCT, single-blind: matcha tea or matcha bar (4g matcha powder each) vs. placebo; matcha improved basic attention/psychomotor speed at 60 min post-dose but not most other cognitive domains or mood (POMS unchanged); drink format outperformed bar format.
- **#92 Silva et al. 2022** (J Ethnopharmacol) — Matcha herbal supplement showed antioxidant activity protecting endothelial cells from hyperglycemia-induced stress, but also reduced electron transport chain activity up to 90% and showed mild toxicity in Artemia salina (LD50 = 0.4 mg/mL) — a rare "dual effect" caution flag on high-dose supplement use. Main compounds identified: EGCG, epicatechin, rutin, kaempferol, quercetin.
- **#97 Mohamed, Soliman & Mourad 2025** (Sci Rep) — Matcha (0.075 g/L) improved growth performance, carcass traits, and metabolism-related gene expression in New Zealand rabbits; reduced cortisol/insulin.
- **#99 Schroder et al. 2018** (Oncol Rep) — Green tea, matcha, EGCG and quercetin all reduced viability/proliferation of MCF-7 and MDA-MB-231 breast cancer cells regardless of estrogen-receptor status; no absolute concentrations or matcha-vs-green-tea potency comparison given in abstract.
- **#100 Bonuccelli, Sotgia & Lisanti 2018** (Aging) — Matcha green tea (IC50 ≈0.2 mg/mL) inhibited breast cancer stem cell propagation via suppression of both mitochondrial (OXPHOS) and glycolytic metabolism, pushing cells toward quiescence; implicated mTOR pathway.
- **#101 Essawy & Abo Elkhair 2026** (Tissue & Cell) — Matcha (150 mg/kg) protected rat cerebellum against acrylamide-induced neurotoxicity, normalizing SOD/CAT/GPx/MDA/TNF-α/IL-6 and reducing apoptotic markers (caspase-3, NF-κB, GFAP).
- **#102 Phongnarisorn et al. 2018** (Foods) — Matcha biscuits (2/4/6 g matcha per 100g flour): baking reduced total catechins ~19% and caused epimerization (increase in (+)-gallocatechin gallate at expense of (–)-EGCG); consumers preferred low-dose (2g/100g) biscuits; no significant acute glucose/triglyceride differences vs. control.
- **#103 Farsi & Metwally 2026** (Microb Cell Fact) — Matcha-functionalized silver nanoparticles showed ~5-fold lower IC50 against MCF-7 cells than plain AgNPs (16.92 vs 80.60 µg/mL) plus improved antibacterial/anti-inflammatory activity; a nanotech application study, tangential to matcha itself.
- **#83 Kolackova et al. 2022** — see HIGH PRIORITY #1 above (digestion/bioavailability of theanine and caffeine).
- **#96 Nekvapil et al. 2024** — see HIGH PRIORITY #4 above (organic acid/carbohydrate bioavailability).
- **#105 Sugimoto et al. 2021** (Food Chemistry) — Characterized reactions between acrolein (a toxic lipid-peroxidation-derived reactive carbonyl species, RCS) and the four major tea catechins (EC, EGC, ECG, EGCG) via LC-linear ion trap MS; confirmed the same mono/di/tri-acrolein-catechin conjugates form in matcha extract. Adding matcha powder to cake dough **significantly suppressed RCS accumulation during baking**, with mono-acrolein-catechin conjugates detected in the finished baked cake — i.e., matcha catechins remain functional RCS scavengers even after oven heat exposure, supporting matcha's use as a heat-stable functional food additive. Relevant to both health effects (antioxidant/detox mechanism) and production science (heat stability during baking). No exact mg/g catechin concentrations given.

**One-line/low-value health hits:** #62 Bhagat et al. 2019 (dairy-polyphenol delivery review, matcha only one of several beverages discussed, no matcha-specific data); #75 Wei et al. 2023 (rice cake with matcha — glycemic index reduction, optimal formulation 1.6% matcha, general food-science, weak health angle).

---

## Production/quality science

- **#70 Wang et al. 2019** — see HIGH PRIORITY #5.
- **#73 Ouyang et al. 2023** — see HIGH PRIORITY #10.
- **#74 Najman et al. 2023** — see HIGH PRIORITY #9.
- **#78 Chen et al. 2023** (Heliyon) — PDO (protected designation of origin)-certified matcha from Guizhou; combined NIRS + LC-MS to predict 5 sensory attributes from chemical composition (accuracy >0.9, particle homogeneity r=0.9668); identified compounds linked to grade/flavor-intensity variation.
- **#79 Xu, Zhou & Lei 2023** (Foods) — 3D fluorescence spectroscopy + Mahalanobis distance discrimination correctly identified matcha producer and grade with up to 100% accuracy; two-step ID (producer then grade) outperformed one-step.
- **#80 Li et al. 2024** (Curr Res Food Sci) — Untargeted metabolomics/chemometrics on how mechanical agitation during processing affects matcha's sensory metabolite profile (methodology paper, no absolute compound values recovered).
- **#81 Cui et al. 2025** — see HIGH PRIORITY (region comparison: Hangzhou/Wuyi/Enshi/Tongren China vs. Shizuoka Japan reference, same cultivar; >1,100 metabolites profiled; western Chinese matcha had more diverse non-volatile flavor compounds than eastern samples) — listed under health/production overlap but core value is regional composition.
- **#82 Meyer et al. 2023** — see HIGH PRIORITY #3.
- **#84 Huang et al. 2021** (Food Chemistry) — Three milling methods (cyclone, bead, stone) produced distinct flavor profiles (cyclone=leafy, bead=fishy, stone=roasty) and measurably different physical/chemical/sensory quality; 18 amino acids, 9 polyphenols, 108 volatiles profiled but no method-specific mg/g values recovered from abstract.
- **#86 Weiss & Anderton 2003** — see HIGH PRIORITY #2.
- **#88 Chen et al. 2024** — see HIGH PRIORITY #7 (foam formation; Longjing 43 cultivar).
- **#89 Kim et al. 2020** (Food Sci Biotechnol) — 2-month storage study: higher temperature/longer storage reduced total phenolics, flavonoids, and antioxidant activity (ABTS/DPPH); individual catechins (EC, EGC, ECG, EGCG), caffeine, and rutin all degraded with heat/time, but no exact mg/g figures recovered from the abstract — full text (Food Sci Biotechnol, Springer) likely has a temperature/time table worth pulling.
- **#93 Cetin-Babaoglu et al. 2024** (Food Sci Nutr) — Matcha extract used to modify rice starch: total phenolics 129.54 mg/100g, flavonoids 40.16 mg/100g (vs. undetectable in control), DPPH 296.62 µmol TE/100g, FRAP 814.89 mg/100g; eGI dropped from 94.61 to 64.63, resistant starch rose from 0.90% to 33.43%. (These are rice-starch-product values, not raw matcha leaf values, but real numbers nonetheless.)
- **#94 Huang et al. 2024** (Food Chemistry) — Fermenting low-grade matcha fiber with *Trichoderma viride* raised soluble dietary fiber from 6.74% to 15.24%, improved pectin/hemicellulose content, cation exchange capacity (1.69→4.22 mmol/g), α-amylase inhibition (47.38%→72.04%); a byproduct-upcycling process study.
- **#95 Liu et al. 2024** (Food Chemistry) — Freezing and higher matcha concentration (≥1%) in bread dough reduced dough stiffness/expansion and disrupted gluten structure; matcha itself didn't affect yeast activity; practical implications for frozen-dough bread product formulation.
- **#98 Huang et al. 2024** — see HIGH PRIORITY #8 (cultivar comparison).
- **#104 Zhang et al. 2025** (Food Res Int) — Identified key odorants for the "seaweed-like" aroma of Shandong matcha (cv. Zhongcha 108): dimethyl sulfide and α-ionone are the primary drivers (both p<0.001), plus hexanal, benzaldehyde, (E)-β-ionone as secondary contributors — pure aroma chemistry, no bioactive-compound data.
- **#106 Stepien et al. 2024** (J Sci Food Agric) — Compared matcha powders by country of origin for storage/technological properties: monolayer moisture 0.045–0.053 g water/g, glass transition temps 106.3–139.0°C; Brazilian matcha was most storage-stable and most water-soluble above 80°C; concludes origin alone doesn't determine optimal storage conditions (climate/fertilization likely matter more).
- **#107 Wu et al. 2023** (Food Chemistry) — Vis-NIR + chemometrics (ICPA-CARS-PLS) rapidly predicted matcha particle size (Rp=0.9376) and the polyphenol-to-free-amino-acid (P/F) ratio (Rp=0.9283) non-destructively — a quality-control tool, not raw compound values.
- **#68 Dhawan et al. 2023** (ACS Omega) — Matcha hard candy with ginger/cinnamon/tulsi; best formulations identified by sensory panel (2% ginger, 0.9% cinnamon, 3% tulsi); phytochemical/antioxidant profiles were "significant" but no exact figures recovered from the abstract.

---

## Full per-paper log (all 47, in bib order)

61. **Keckstein et al. 2023**, "Effects of matcha tea extract on cell viability and estrogen receptor-beta expression on MCF-7 breast cancer cells," *Arch Gynecol Obstet*. Matcha extract (5, 10 µg/mL) reduced MCF-7 viability at 72h/10µg/mL and lowered ERβ protein (not mRNA) expression. No compound concentrations given. Health effects: yes (cancer).

62. **Bhagat et al. 2019**, "Review of the Role of Fluid Dairy in Delivery of Polyphenolic Compounds…," *J AOAC Int*. Review of dairy pairing with green tea/matcha/coffee/cocoa polyphenols; milk proteins may protect antioxidant activity through digestion. No matcha-specific numbers. Health/production: general review, low specificity to matcha.

63. **Baba et al. 2021**, "Effects of Daily Matcha and Caffeine Intake on Mild Acute Psychological Stress-Related Cognitive Function…," *Nutrients*. See Health effects section above.

64. **Igarashi, Takagi, Fukushima 2022**, "The Effects of Matcha and Decaffeinated Matcha on Learning, Memory and Proteomics of Hippocampus in SAMP8 Mice," *Nutrients*. See Health effects section above.

65. **Willems et al. 2020**, "Three Weeks Daily Intake of Matcha Green Tea Powder Affects Substrate Oxidation during Moderate-Intensity Exercise in Females," *J Dietary Supplements*. See Health effects section above.

66. **Tsuda 2025**, "Matcha intake enhances systemic oxidative stress resistance and activates detoxification pathways in Drosophila melanogaster," *Biosci Biotechnol Biochem*. See Health effects section above.

67. **Morishima et al. 2022**, "A randomized, double-blinded study evaluating effect of matcha green tea on human fecal microbiota," *J Clin Biochem Nutr*. See Health effects section above.

68. **Dhawan et al. 2023**, "Effect of Spice Incorporation on Sensory and Physico-chemical Properties of Matcha-Based Hard Candy," *ACS Omega*. See Production/quality section above.

69. **Pannucci et al. 2024**, "Evaluation of the antiglycative and antioxidant activities of matcha tea," *Nat Prod Res*. See Health effects section above.

70. **Wang et al. 2019**, "Evaluation of matcha tea quality index using portable NIR spectroscopy coupled with chemometric algorithms," *J Sci Food Agric*. See HIGH PRIORITY #5.

71. **Monobe, Nomura, Ema, Horie 2019**, "Influence of continued ingestion of matcha on emotional behaviors after social stress in mice," *Biosci Biotechnol Biochem*. See Health effects section above.

72. **Unno et al. 2019**, "Stress-reducing effect of cookies containing matcha green tea: essential ratio among theanine, arginine, caffeine and epigallocatechin gallate," *Heliyon*. See HIGH PRIORITY #6.

73. **Ouyang et al. 2023**, "Application of colorimetric sensor array combined with visible near-infrared spectroscopy for the matcha classification," *Food Chemistry*. See HIGH PRIORITY #10.

74. **Najman et al. 2023**, "The Content of Bioactive Compounds and Technological Properties of Matcha Green Tea and Its Application in the Design of Functional Beverages," *Molecules*. See HIGH PRIORITY #9.

75. **Wei et al. 2023**, "Cake of Japonica, Indica and glutinous rice: Effect of matcha powder on the volatile profiles, nutritional properties and optimal production parameters," *Food Chemistry: X*. Matcha reduced starch digestibility/glycemic index of rice cakes, enhanced antioxidant capacity; optimal recipe 1.6% matcha, 82% water, 39-min steam. No matcha compound concentrations. Production/quality: yes.

76. **El-Elimat et al. 2022**, "A Prospective Non-Randomized Open-Label Comparative Study of The Effects of Matcha Tea on Overweight and Obese Individuals," *Plant Foods Hum Nutr*. See Health effects section above.

77. **Keckstein et al. 2022**, "Effects of matcha tea extract on cell viability and peroxisome proliferator-activated receptor gamma expression on T47D breast cancer cells," *Arch Gynecol Obstet*. See Health effects section above.

78. **Chen et al. 2023**, "Estimating the sensory-associated metabolites profiling of matcha based on PDO attributes as elucidated by NIRS and MS approaches," *Heliyon*. See Production/quality section above.

79. **Xu, Zhou, Lei 2023**, "Identifying the Producer and Grade of Matcha Tea through Three-Dimensional Fluorescence Spectroscopy Analysis and Distance Discrimination," *Foods*. See Production/quality section above.

80. **Li et al. 2024**, "The application of untargeted metabolomics coupled with chemometrics for the analysis of agitation effects on the sensory profiles of matcha tea," *Curr Res Food Sci*. See Production/quality section above.

81. **Cui et al. 2025**, "Effect of Geographic Regions on the Flavor Quality and Non-Volatile Compounds of Chinese Matcha," *Foods*. See HIGH PRIORITY discussion and Production/quality section above.

82. **Meyer et al. 2023**, "Catechin Composition, Phenolic Content, and Antioxidant Properties of Commercially-Available Bagged, Gunpowder, and Matcha Green Teas," *Plant Foods Hum Nutr*. See HIGH PRIORITY #3.

83. **Kolackova et al. 2022**, "The Effect of [Simulated] Digestion on Matcha Tea Active Components and Antioxidant Activity," *Antioxidants*. See HIGH PRIORITY #1.

84. **Huang et al. 2021**, "Effect of three milling processes (cyclone-, bead- and stone-millings) on the quality of matcha: Physical properties, taste and aroma," *Food Chemistry*. See Production/quality section above.

85. **Yamabe et al. 2009**, "Matcha, a powdered green tea, ameliorates the progression of renal and hepatic damage in type 2 diabetic OLETF rats," *J Medicinal Food*. See Health effects section above.

86. **Weiss & Anderton 2003**, "Determination of catechins in matcha green tea by micellar electrokinetic chromatography," *J Chromatography A*. See HIGH PRIORITY #2.

87. **Megahd, Gabal 2021**, "Evaluation of Matcha and Ashwagandha Efficacy Against Utero-Ovarian Injury in Rats," *Pak J Biol Sci*. See Health effects section above.

88. **Chen et al. 2024**, "Comprehensive study of matcha foam formation: Physicochemical composition analysis and mechanisms impacting foaming properties," *Food Chemistry*. See HIGH PRIORITY #7.

89. **Kim et al. 2020**, "Effect of storage temperature on the antioxidant activity and catechins stability of Matcha," *Food Sci Biotechnol*. See Production/quality section above.

90. **Kim et al. 2021**, "Powdered Green Tea (Matcha) Attenuates the Cognitive Dysfunction via the Regulation of Systemic Inflammation in Chronic PM-Exposed BALB/c Mice," *Antioxidants*. See Health effects section above.

91. **Dietz, Dekker, Piqueras-Fiszman 2017**, "An intervention study on the effect of matcha tea, in drink and snack bar formats, on mood and cognitive performance," *Food Res Int*. See Health effects section above.

92. **Silva et al. 2022**, "Dual effect of the herbal matcha green tea supplement in EA.hy926 endothelial cells and Artemia salina," *J Ethnopharmacol*. See Health effects section above.

93. **Cetin-Babaoglu et al. 2024**, "Enhancing nutritional and functional properties of rice starch by modification with Matcha extract," *Food Sci Nutr*. See Production/quality section above.

94. **Huang et al. 2024**, "Improved physicochemical and functional properties of dietary fiber from matcha fermented by Trichoderma viride," *Food Chemistry*. See Production/quality section above.

95. **Liu et al. 2024**, "Mechanism of structural and functional changes of matcha bread dough during freezing storage," *Food Chemistry*. See Production/quality section above.

96. **Nekvapil et al. 2024**, "The Release of Organic Acids and Low Molecular Weight Carbohydrates from Matcha Tea After In Vitro Digestion," *Nutrients*. See HIGH PRIORITY #4.

97. **Mohamed, Soliman, Mourad 2025**, "Unveiling the effect of chia seeds and matcha tea on growth performance, metabolism, carcass characteristics, and gene expression on New Zealand rabbits," *Sci Rep*. See Health effects section above.

98. **Huang et al. 2024**, "A comprehensive metabolomics analysis of volatile and non-volatile compounds in matcha processed from different tea varieties," *Food Chemistry: X*. See HIGH PRIORITY #8.

99. **Schroder et al. 2018**, "Effects of green tea, matcha tea and their components epigallocatechin gallate and quercetin on MCF-7 and MDA-MB-231 breast carcinoma cells," *Oncology Reports*. See Health effects section above.

100. **Bonuccelli, Sotgia, Lisanti 2018**, "Matcha green tea (MGT) inhibits the propagation of cancer stem cells (CSCs)…," *Aging*. See Health effects section above.

101. **Essawy, Abo Elkhair 2026**, "Matcha green tea attenuates acrylamide-induced cerebellar damage in rats," *Tissue & Cell*. See Health effects section above.

102. **Phongnarisorn et al. 2018**, "Enrichment of Biscuits with Matcha Green Tea Powder: Its Impact on Consumer Acceptability and Acute Metabolic Response," *Foods*. See Health effects section above.

103. **Farsi, Metwally 2026**, "Marine Klebsiella sp. RR1-mediated AgNPs functionalized with matcha…," *Microbial Cell Factories*. See Health effects section above.

104. **Zhang et al. 2025**, "Identification of key odorants responsible for the seaweed-like aroma quality of Shandong matcha," *Food Res Int*. See Production/quality section above.

105. **Sugimoto et al. 2021**, "Catechins in green tea powder (matcha) are heat-stable scavengers of acrolein, a lipid peroxide-derived reactive carbonyl species," *Food Chemistry*. LC-linear ion trap MS showed EC, EGC, ECG, and EGCG all form mono/di/tri-acrolein conjugates, confirmed in matcha extract; adding matcha to cake dough significantly suppressed acrolein/RCS accumulation during baking, with mono-acrolein-catechin conjugates detected in the finished baked cake, demonstrating catechins' heat-stable RCS-scavenging function survives baking. See Health effects section above (retrieved via Europe PMC REST API after PubMed's abstract page initially returned a redirect placeholder).

106. **Stepien et al. 2024**, "Comparison of technological and physical properties of matcha powders of different geographical origins," *J Sci Food Agric*. See Production/quality section above.

107. **Wu et al. 2023**, "Application of visible-near infrared spectroscopy in tandem with multivariate analysis for the rapid evaluation of matcha physicochemical indicators," *Food Chemistry*. See Production/quality section above.

---

## Notes on fetch method / gaps

- PubMed's abstract pages intermittently served a reCAPTCHA interstitial to the fetch tool (not a real bot-block, just an artifact of the fetcher's user agent) for papers #68, 72, 73, 74, 81, 91, 92, 95, 106, 107. All ten were successfully recovered via the **Europe PMC REST API** (`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:{pmid}%20AND%20SRC:MED&format=json&resultType=core`), which returns the same NLM abstract as clean JSON and is a reliable fallback for any future batches that hit the same PubMed captcha wall.
- Paper #86 (Weiss & Anderton 2003) and #82 (Meyer et al. 2023) are flagged for full-text follow-up since their abstracts strongly imply exact mg/g figures exist in the paper body but weren't surfaced in the abstract; both are likely paywalled (Elsevier ScienceDirect / Springer respectively) — full text access would need institutional/library credentials.
- Paper #98 and #74 and #81 (cultivar/region breakdowns) are open-access (Food Chemistry: X, MDPI Molecules, MDPI Foods) and are the best near-term candidates for a full-text pull to extract exact numeric tables, since they explicitly measured variation by cultivar/region but the abstracts only describe the finding qualitatively.
- Paper #105 (Sugimoto et al., acrolein scavenging) was successfully re-fetched via the Europe PMC REST API after PubMed's page initially returned a redirect placeholder; full abstract now captured above.
