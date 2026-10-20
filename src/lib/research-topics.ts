// Editorial copy for the research topic pages (/research/topics/[slug]). The
// topic names are the tags assigned by scripts/harvest-studies.mjs; the numbers
// on each page are computed from the library, so only the framing lives here.
// The wording describes what the literature covers and is deliberately cautious:
// it reports what studies examine, never health advice.

export type TopicContent = {
  name: string; // must equal the tag name in data/studies.json
  slug: string;
  heading: string; // h1
  title: string; // <title> (the site name is appended by the layout)
  description: string; // meta description
  intro: string[]; // 1-2 short paragraphs
  lookFor: string; // one line on how to read this body of research
  related: string[]; // other topic names
  search: string; // a keyword query that opens this subject in the library
};

export const TOPICS: TopicContent[] = [
  {
    name: "L-theanine and caffeine",
    slug: "l-theanine-and-caffeine",
    heading: "Matcha, L-theanine and caffeine: the research",
    title: "Matcha L-theanine and caffeine research — studies on calm focus",
    description: "Peer-reviewed studies on matcha's L-theanine and caffeine content, how they interact, and what trials report about attention, alertness and calm.",
    intro: [
      "Matcha is shade-grown, which raises its L-theanine, an amino acid found almost only in tea, and it is eaten as the whole ground leaf, so it also delivers caffeine. A large share of the matcha literature asks how those two compounds behave together.",
      "The studies here include chemical analyses of how much of each compound different matcha grades contain, human trials of theanine-and-caffeine combinations on attention and mood, and cultivation work on how shading changes theanine levels.",
    ],
    lookFor: "Trials often test purified L-theanine and caffeine rather than matcha itself, so check what was actually given before applying a result to a cup of matcha.",
    related: ["Cognition, mood and stress", "Cultivation and shading", "Antioxidants and polyphenols"],
    search: "theanine",
  },
  {
    name: "Cognition, mood and stress",
    slug: "cognition-mood-and-stress",
    heading: "Matcha and cognition, mood and stress: the research",
    title: "Matcha, focus, mood and stress — what the studies show",
    description: "Clinical trials, observational studies and reviews on matcha and green tea for attention, memory, mood, stress and sleep, with links to every source.",
    intro: [
      "This is the human-facing side of matcha research: randomized trials and observational studies that measure attention, memory, mood, stress hormones or sleep after people drink matcha, take matcha extracts, or eat matcha foods.",
      "Sample sizes are often small and many studies are short, so reviews that pool several trials are a good place to start before reading individual papers.",
    ],
    lookFor: "Look at the study type tag first. A randomized controlled trial or systematic review carries more weight than a single observational study or a lab experiment.",
    related: ["L-theanine and caffeine", "Metabolism and weight", "Inflammation and immunity"],
    search: "cognition OR stress OR sleep",
  },
  {
    name: "Antioxidants and polyphenols",
    slug: "antioxidants-and-polyphenols",
    heading: "Matcha antioxidants, catechins and EGCG: the research",
    title: "Matcha antioxidants, catechins and EGCG — research library",
    description: "Studies measuring matcha's catechins, EGCG, chlorophyll and other polyphenols, how much they vary, and how they hold up in processing and storage.",
    intro: [
      "Because the whole leaf is consumed, matcha is rich in catechins (EGCG above all), chlorophyll and other polyphenols. This is the largest topic in the library, spanning analytical chemistry, food science and cell and animal studies of antioxidant activity.",
      "Many papers compare matcha with ordinary steeped green tea, measure how storage, light and temperature degrade catechins, or test matcha-enriched foods.",
    ],
    lookFor: "Lab antioxidant assays measure a compound's chemistry in a dish. They do not by themselves show a benefit in people.",
    related: ["Processing, milling and quality", "Inflammation and immunity", "Cancer"],
    search: "egcg OR catechin",
  },
  {
    name: "Metabolism and weight",
    slug: "metabolism-and-weight",
    heading: "Matcha, metabolism and weight: the research",
    title: "Matcha, metabolism and weight — studies on obesity and blood sugar",
    description: "Human, animal and cell studies on matcha and green tea for body weight, fat metabolism, blood sugar, cholesterol and fatty liver.",
    intro: [
      "Researchers have examined matcha's effect on body weight, fat oxidation, blood glucose, lipids and fatty liver, mostly in animal models and small human trials, often with a high-fat diet as the experimental stress.",
      "Results are not uniform across studies, and the dose, duration and form of matcha vary widely.",
    ],
    lookFor: "Many of the weight studies are in mice or rats. Check the study type tag to see which results come from people.",
    related: ["Gut and microbiome", "Cardiovascular and blood pressure", "Antioxidants and polyphenols"],
    search: "obesity OR metabolism",
  },
  {
    name: "Gut and microbiome",
    slug: "gut-and-microbiome",
    heading: "Matcha and the gut microbiome: the research",
    title: "Matcha and gut microbiota — research on digestion and the microbiome",
    description: "Studies on how matcha and its polyphenols interact with the gut microbiota, digestion and gut-liver health, from cell models to human trials.",
    intro: [
      "A growing group of studies asks how matcha polyphenols are digested, which of them reach the colon, and how they shift gut bacteria and the metabolites those bacteria make.",
      "Most of this work is recent, and much of it is in animals. A few human studies, including protocol papers for trials still under way, are starting to appear.",
    ],
    lookFor: "Microbiome findings in mice do not automatically carry over to people; look for the human studies in the Study type filter.",
    related: ["Metabolism and weight", "Antioxidants and polyphenols", "Inflammation and immunity"],
    search: "microbiota OR microbiome",
  },
  {
    name: "Inflammation and immunity",
    slug: "inflammation-and-immunity",
    heading: "Matcha, inflammation and immunity: the research",
    title: "Matcha inflammation and immune research — studies library",
    description: "Cell, animal and human studies on matcha's effects on inflammation markers and immune function.",
    intro: [
      "These studies look at inflammatory markers, immune-cell activity and related pathways after matcha or matcha-derived compounds are given to cells, animals or people.",
      "Most of the evidence is preclinical, meaning lab and animal work that suggests mechanisms to be tested in human trials.",
    ],
    lookFor: "Treat cell and animal results as hypotheses. Human randomized trials are the stronger evidence, and they are rarer here.",
    related: ["Antioxidants and polyphenols", "Gut and microbiome", "Cancer"],
    search: "inflammation OR immune",
  },
  {
    name: "Safety, contaminants and toxicity",
    slug: "safety-contaminants-and-toxicity",
    heading: "Matcha safety and contaminants: the research",
    title: "Matcha safety, fluoride, pesticide residue and contaminant studies",
    description: "Published studies testing matcha and tea for fluoride, pesticide residues, trace elements, microplastics and other contaminants, with links to every source.",
    intro: [
      "Because matcha is the whole powdered leaf rather than an infusion, anything in the leaf ends up in the cup. This topic collects the testing studies: fluoride content, pesticide residue methods, trace elements and minerals, microplastics, and detection of industrial solvents in commercial matcha.",
      "It is a small body of work, and it is worth saying plainly what it does not contain: this library holds no study that measures lead or other heavy metals in matcha specifically. Results also vary by origin, grade and growing conditions, so read the sampling details in each paper.",
    ],
    lookFor: "Check where and when the samples were bought. A result about one market or year does not describe every brand.",
    related: ["Authenticity and analytical methods", "Cultivation and shading", "Processing, milling and quality"],
    search: "fluoride OR pesticide OR microplastics OR contamination",
  },
  {
    name: "Processing, milling and quality",
    slug: "processing-milling-and-quality",
    heading: "Matcha processing, milling and quality: the research",
    title: "Matcha processing, milling and quality research — tencha to powder",
    description: "Studies on how tencha is steamed, dried and stone-milled, how particle size and storage affect color, flavor and nutrients, and how matcha quality is graded.",
    intro: [
      "Matcha quality depends on steps that most drinkers never see: steaming and drying the shade-grown leaf into tencha, milling it to a few microns, and storing it. Food scientists have studied each step.",
      "This is one of the biggest topics in the library, covering stone versus ball milling, particle size, chlorophyll retention, storage stability and quality indicators such as color and amino acid content.",
    ],
    lookFor: "Papers here often compare methods on one batch of leaf, so they show relative effects, not what any particular brand does.",
    related: ["Authenticity and analytical methods", "Aroma, flavor and sensory", "Antioxidants and polyphenols"],
    search: "milling OR processing OR particle",
  },
  {
    name: "Cultivation and shading",
    slug: "cultivation-and-shading",
    heading: "Matcha cultivation and shading: the research",
    title: "Matcha cultivation and shade-growing research — tea plant studies",
    description: "Agronomy and plant biology studies on shade-growing tea for matcha: how shading changes theanine, chlorophyll, catechins and leaf quality.",
    intro: [
      "Matcha's character starts in the field, where tea plants are shaded for several weeks before harvest. Plant scientists have studied how shading changes gene expression, amino acids, chlorophyll and catechins in the leaf.",
      "The studies cover shading duration and material, fertilization, cultivar choice and harvest timing.",
    ],
    lookFor: "Plant biology papers can be technical. The abstract usually states the practical finding in its last sentences.",
    related: ["L-theanine and caffeine", "Processing, milling and quality", "Market, culture and sustainability"],
    search: "shading OR shade OR cultivation",
  },
  {
    name: "Aroma, flavor and sensory",
    slug: "aroma-flavor-and-sensory",
    heading: "Matcha aroma, flavor and sensory science: the research",
    title: "Matcha flavor, aroma and taste research — sensory science studies",
    description: "Studies of matcha's aroma compounds, bitterness, umami and astringency, and how consumers and trained panels rate it.",
    intro: [
      "Sensory scientists have mapped matcha's volatile aroma compounds, the balance of umami, bitterness and astringency, and how factors like grade, origin and whisking change what people taste.",
      "The topic combines instrumental analysis (gas chromatography and electronic tongues) with trained-panel and consumer-preference studies.",
    ],
    lookFor: "Sensory results depend on the panel and the preparation method, so check how the matcha was prepared before comparing studies.",
    related: ["Processing, milling and quality", "Authenticity and analytical methods", "Food products and applications"],
    search: "aroma OR flavor OR sensory",
  },
  {
    name: "Authenticity and analytical methods",
    slug: "authenticity-and-analytical-methods",
    heading: "Matcha authenticity and analytical methods: the research",
    title: "Matcha authenticity, grading and analysis methods — research library",
    description: "Studies on telling real matcha from imitations, grading quality by spectroscopy and chemistry, and detecting adulteration.",
    intro: [
      "As matcha has become popular, analysts have developed ways to verify what is in a tin: near-infrared and hyperspectral imaging, fluorescence and other spectroscopy with machine learning to identify grade, producer or geographic origin, and DNA tests for plant-based adulterants.",
      "This is the technical backbone behind any claim about grade or origin.",
    ],
    lookFor: "Methods papers show what can be measured, not what the matcha on a given shelf contains.",
    related: ["Processing, milling and quality", "Safety, contaminants and toxicity", "Aroma, flavor and sensory"],
    search: "authenticity OR adulteration OR spectroscopy",
  },
  {
    name: "Food products and applications",
    slug: "food-products-and-applications",
    heading: "Matcha in foods: the research on products and applications",
    title: "Matcha in food products — noodles, baked goods, dairy and more",
    description: "Food science studies that add matcha to noodles, bread, ice cream, yogurt, chocolate and beverages, and measure the effect on nutrition, texture and taste.",
    intro: [
      "Matcha is used as a functional ingredient, and food scientists have tested it in noodles, bread, biscuits, yogurt, ice cream, chocolate and drinks, measuring how it changes color, texture, antioxidant content and consumer acceptance.",
      "Several papers also test how baking or cooking affects matcha's compounds.",
    ],
    lookFor: "Most of these studies are product development work, with small panels and no health outcomes.",
    related: ["Aroma, flavor and sensory", "Processing, milling and quality", "Antioxidants and polyphenols"],
    search: "noodle OR bread OR yogurt OR ice cream OR chocolate",
  },
  {
    name: "Market, culture and sustainability",
    slug: "market-culture-and-sustainability",
    heading: "Matcha markets, culture and sustainability: the research",
    title: "Matcha market, culture and sustainability studies — research library",
    description: "Studies of the matcha market, consumer behavior, tea-ceremony culture, supply chains and the environmental footprint of matcha production.",
    intro: [
      "Not all matcha research is laboratory science. This topic gathers papers on consumer demand and marketing, Japanese tea culture and ceremony, and the sustainability questions raised by matcha's rapid growth.",
      "Many are business or social-science studies, and quality varies more here than in the laboratory literature.",
    ],
    lookFor: "Market studies are often small local surveys. Check the sample and location before drawing wider conclusions.",
    related: ["Cultivation and shading", "Food products and applications", "Aroma, flavor and sensory"],
    search: "market OR consumer OR ceremony OR sustainability",
  },
  {
    name: "Skin, oral and dental",
    slug: "skin-oral-and-dental",
    heading: "Matcha for skin, mouth and teeth: the research",
    title: "Matcha skin, oral health and dental research — studies library",
    description: "Studies on matcha and green tea catechins in skin care, oral bacteria, gum health and dental applications.",
    intro: [
      "Catechins are active against some oral bacteria and have been examined in mouth rinses and dental products, and matcha extracts have been tested in skin models for UV and aging effects.",
      "Much of the work is laboratory research, with a smaller number of clinical studies.",
    ],
    lookFor: "Many results use extracts at concentrations far from drinking a cup of matcha, so read the exposure details.",
    related: ["Antioxidants and polyphenols", "Inflammation and immunity", "Cancer"],
    search: "skin OR oral OR dental OR periodontal",
  },
  {
    name: "Cancer",
    slug: "cancer",
    heading: "Matcha and cancer research",
    title: "Matcha and cancer research — studies on EGCG and tumor cells",
    description: "Laboratory, animal and epidemiological studies that examine matcha and green tea compounds in cancer cells and cancer risk.",
    intro: [
      "Researchers have studied matcha extracts and EGCG in cancer cell lines (oral, breast and others) and in animal models, and several reviews summarize the wider green tea evidence.",
      "Most matcha-specific work is preclinical. These papers describe mechanisms in cells and animals, not treatments.",
    ],
    lookFor: "A result in cultured cancer cells is a starting point for further research, not evidence that matcha prevents or treats cancer.",
    related: ["Antioxidants and polyphenols", "Inflammation and immunity", "Skin, oral and dental"],
    search: "cancer OR tumor",
  },
  {
    name: "Cardiovascular and blood pressure",
    slug: "cardiovascular-and-blood-pressure",
    heading: "Matcha, heart health and blood pressure: the research",
    title: "Matcha heart health and blood pressure — cardiovascular research",
    description: "Studies of matcha and green tea catechins for blood pressure, cholesterol, vascular function and heart tissue.",
    intro: [
      "The cardiovascular research on matcha is small compared with the broader green tea literature. It includes animal studies of heart tissue under dietary stress, a short human trial of heart-rate variability, reviews of matcha and cardiometabolic health, and food-development work on products aimed at blood pressure.",
    ],
    lookFor: "With few matcha-specific human trials, results from the wider green tea literature are often the best available evidence.",
    related: ["Metabolism and weight", "Antioxidants and polyphenols", "Inflammation and immunity"],
    search: "cardiovascular OR blood pressure OR cholesterol",
  },
];

export const topicBySlug = (slug: string) => TOPICS.find((t) => t.slug === slug);
export const topicByName = (name: string) => TOPICS.find((t) => t.name === name);
export const topicHref = (name: string) => {
  const t = topicByName(name);
  return t ? `/research/topics/${t.slug}` : `/research?topic=${encodeURIComponent(name)}`;
};
