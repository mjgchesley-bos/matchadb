// Extra background for the cultivar pages: pictures, the people behind each cultivar, and breeding facts. Every fact here is sourced; where the
// sources differ or little is published the text says less rather than more. Kept apart from cultivars.ts, whose text is translated.
// English only for now (other languages show this block in English).
export type CultivarPerson = { name: string; native?: string; years?: string; role: string; imageKey?: string };
export type CultivarExtra = {
  gallery: string[];
  people: CultivarPerson[];
  facts: [string, string][];
  sources: { label: string; url: string }[];
  // Growing areas named in the sources, in prose, shown under the map.
  where?: string;
};

const TEALIFE = "https://japanesetea.sg/japanese-tea-pedia/cultivars/";
const HAWAII = { label: "Yagi, Univ. of Hawaii CTAHR: Characteristics of Eight Japanese Tea Cultivars (2010)", url: "https://www3.ctahr.hawaii.edu/oc/freepubs/pdf/F_N-15.pdf" };

export const CULTIVAR_EXTRAS: Record<string, CultivarExtra> = {
  yabukita: {
    gallery: ["sugiyama", "yabukita-mother-tree", "fuji-tea-field", "sugiyama-memorial-field", "yabukita-aracha"],
    people: [{ name: "Sugiyama Hikosaburo", native: "杉山彦三郎", years: "died 1941", role: "Farmer and tea breeder who selected the plant that became Yabukita in 1908, and who developed propagation by cuttings so that one superior plant could be copied exactly", imageKey: "sugiyama" }],
    facts: [
      ["Registration number", "No. 6 in Japan's cultivar registry (1953)"],
      ["How it spread", "Every Yabukita plant is a clone, grown from cuttings of the original plant"],
      ["The original plant", "Still alive in Yata, Suruga-ku, Shizuoka City, kept as a prefectural natural monument"],
      ["Share of fields", "About 93 percent of Shizuoka's tea fields and roughly 75 percent of Japan's, by one source's recent figures"],
    ],
    sources: [{ label: "Tealife Japanese Tea Pedia: Yabukita", url: `${TEALIFE}Yabukita/` }, HAWAII],
    where: "Yabukita is grown across Japan, with Shizuoka as its heartland.",
  },
  okumidori: {
    gallery: ["wazuka", "uji-kowata", "chiran"],
    people: [],
    facts: [
      ["Parents", "Yabukita (mother) × Shizuoka native selection No. 16 (Shizu-zairai 16)"],
      ["Bred at", "The national tea research station at Kanaya, Shizuoka (now part of NARO)"],
      ["Registered", "1974, as Tea Norin No. 32"],
      ["Budding", "Late: about 11 days after Yabukita; harvest opens about 8 days after"],
      ["Share of Japan's tea area", "About 3.3 percent (MAFF survey, 2020), fourth after Yabukita, Yutakamidori and Saemidori"],
      ["In Kyoto", "The second most planted cultivar in Kyoto Prefecture, about 12 percent of its tea area"],
    ],
    sources: [{ label: "Tealife Japanese Tea Pedia: Okumidori", url: `${TEALIFE}okumidori/` }, HAWAII],
    where: "Mainly Kagoshima, Mie and Kyoto (Uji and Wazuka), with some in Aichi, Fukuoka and Saga.",
  },
  samidori: {
    gallery: ["uji-shirakawa", "okunoyama", "tencha-mill-uji"],
    people: [{ name: "Koyama Masajirō", native: "小山政次郎", role: "The Uji farmer who selected the plant now called Samidori (Koyama No. 69), in 1954" }],
    facts: [
      ["Selected", "1954, by the farmer Koyama Masajirō, from native Uji tea plants (as “Koyama No. 69”)"],
      ["Among the Uji varieties", "The most widely planted of the three Uji varieties (with Asahi and Ujihikari)"],
      ["Longer harvest window", "Described as more forgiving to grow than Asahi: a longer harvest window and somewhat higher yield"],
    ],
    sources: [{ label: "Tealife Japanese Tea Pedia: Asahi and the Uji varieties", url: `${TEALIFE}asahi/` }],
    where: "Kyoto Prefecture, where the Uji varieties come from.",
  },
  saemidori: {
    gallery: ["chiran", "makinohara"],
    people: [],
    facts: [
      ["Parents", "Yabukita (mother) × Asatsuyu (father)"],
      ["Crossed", "1969, at the national tea research station in Makurazaki, Kagoshima"],
      ["Registered", "1990, as Tea Norin No. 40"],
      ["Budding", "Early: roughly 4 to 7 days ahead of Yabukita"],
    ],
    sources: [{ label: "Tealife Japanese Tea Pedia: Saemidori", url: `${TEALIFE}saemidori/` }, HAWAII],
    where: "Bred in Kagoshima for southern climates; the map shows the regions brands name for it.",
  },
  asahi: {
    gallery: ["okunoyama", "uji-chatsumi", "uji-shirakawa"],
    people: [{ name: "Hirano Jinnojō", native: "平野甚之丞", role: "The Uji farmer who selected Asahi from native tea plants in 1954" }],
    facts: [
      ["Selected", "1954, Uji City, from native seedlings"],
      ["Harvest", "A short window that arrives early among the Uji varieties; missing it lowers quality"],
      ["Growing", "Thin, large buds that need careful hand handling, and good drainage"],
    ],
    sources: [{ label: "Tealife Japanese Tea Pedia: Asahi", url: `${TEALIFE}asahi/` }],
    where: "Almost entirely in Uji, Kyoto Prefecture.",
  },
  gokou: {
    gallery: ["uji-kowata", "tencha-mill-uji"],
    people: [],
    facts: [
      ["Name", "後光 (gokō): the halo of light around a Buddha figure"],
      ["Registered", "1954, as a Kyoto Prefecture recommended cultivar, from native Uji tea gardens"],
      ["Harvest", "Mid-season, with an extremely short optimal harvest window"],
      ["Under shade", "Described as having an incense-like aroma"],
    ],
    sources: [{ label: "Tealife Japanese Tea Pedia: Gokou", url: `${TEALIFE}gokou/` }],
    where: "Mostly Uji, in small plots.",
  },
  tsuyuhikari: {
    gallery: ["makinohara", "fuji-tea-field"],
    people: [],
    facts: [
      ["Parents", "Shizu 7132 (mother) × Asatsuyu (father)"],
      ["Crossed", "1970, at the Shizuoka Prefectural Tea Research Station"],
      ["Recognised", "Shizuoka recommended cultivar in 2001; registered in 2003 as No. 11103"],
      ["Shizu 7132", "A numbered research selection, a natural cross of Yabukita and an unknown parent"],
    ],
    sources: [{ label: "Tealife Japanese Tea Pedia: Tsuyuhikari", url: `${TEALIFE}Tsuyuhikari/` }, HAWAII],
    where: "The map shows the regions brands name for it.",
  },
  ujihikari: {
    gallery: ["uji-shirakawa", "okunoyama", "uji-chatsumi"],
    people: [],
    facts: [
      ["Selected", "1954 by the Kyoto Prefecture Tea Industry Research Institute, from the offspring of a tea plant from Uji"],
      ["Registration", "Not nationally registered"],
      ["Growing", "Normal budding, medium vigour and yield; slightly weak against cold"],
      ["Leaves", "Thin, soft leaves with a wavy shape; a marine aroma is described when shaded"],
    ],
    sources: [{ label: "My Japanese Green Tea: The Ujihikari tea cultivar", url: "https://myjapanesegreentea.com/the-ujihikari-tea-cultivar" }, { label: "Tealife Japanese Tea Pedia: Asahi and the Uji varieties", url: `${TEALIFE}asahi/` }],
    where: "Mostly Kyoto Prefecture.",
  },
};
