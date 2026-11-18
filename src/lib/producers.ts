// Profiles of the tea houses, farms and families behind the matcha in this database. Each is written conservatively from the company's own history
// pages and, where noted, one independent source; where sources disagree or only the company says so, the text says that. Numbers about products
// (counts, prices) are computed from the database on each page, never written here. English only for now.
export type TimelineItem = { year: string; text: string };
export type ProducerPerson = { name: string; native?: string; role: string };
export type Producer = {
  slug: string;
  name: string;
  native?: string;
  // The brand name used in the products table, so the page can count and link their matcha.
  brand: string;
  founded: string;
  // A key of REGION_COORDINATES: the town the company is based in (town level only, not a street address).
  base: string;
  basedIn: string;
  kind: string;
  headline: string;
  story: string[];
  facts: [string, string][];
  timeline: TimelineItem[];
  people: ProducerPerson[];
  // Awards and certifications the company or its sources state, and what it is doing now (shops, certifications, programmes).
  awards: string[];
  current: string[];
  // Keys of PRODUCER_IMAGES or CULTIVAR_IMAGES.
  images: string[];
  // Cultivar page slugs this producer is tied to.
  cultivars: string[];
  sources: { label: string; url: string }[];
  related: string[];
};

export const PRODUCERS: Producer[] = [
  {
    slug: "marukyu-koyamaen",
    name: "Marukyu Koyamaen",
    native: "丸久小山園",
    brand: "Marukyu Koyamaen",
    founded: "c. 1704",
    base: "Uji",
    basedIn: "Ogura, Uji, Kyoto",
    kind: "Tea grower, procurer and blender",
    headline: "A grower-blender in Ogura, Uji, whose company history begins around 1704",
    story: [
      "Marukyu Koyamaen says its founder, Kyujiro Koyama, began cultivating and processing tea in Ogura, in Uji, around 1704. Successive generations improved how the tea was grown and processed, and by the eighth generation, Motojiro Koyama, the company's tea was sold across Japan and later abroad.",
      "The company describes itself as a grower, procurer and blender with its own tea estate, supplying matcha and other teas to hotels, shrines and temples, and the established tea-ceremony schools of Japan. It also makes food-grade matcha for sweets and desserts. It says it has received more than 21 awards.",
    ],
    facts: [
      ["Founded", "Around 1704, by Kyujiro Koyama (the company's own account)"],
      ["Based in", "Ogura-cho, Uji, Kyoto Prefecture"],
      ["What it does", "Grows, buys and blends tea; matcha for tea ceremony and for food use"],
      ["Retail", "Shops in Kyoto, including the Nishinotoin tea shop and tea house “Motoan”"],
    ],
    timeline: [
      { year: "c. 1704", text: "Kyujiro Koyama begins cultivating and processing tea in Ogura, Uji." },
      { year: "Eighth generation", text: "Motojiro Koyama leads the company as its tea is sold nationwide." },
    ],
    people: [{ name: "Kyujiro Koyama", role: "Founder, who began growing and processing tea in Ogura, Uji, around 1704" }, { name: "Motojiro Koyama", role: "Eighth-generation head, under whom the company's tea was sold across Japan" }],
    awards: ["Says it has received more than 21 awards for its tea (its own account; the company site does not list them here)"],
    current: ["Shops in Kyoto: Kyoto Takashimaya, JR Kyoto Isetan and the Nishinotoin tea shop and tea house “Motoan”", "Supplies matcha to hotels, shrines, temples and tea-ceremony schools, and makes food-grade matcha for sweets"],
    images: ["uji-kowata"],
    cultivars: [],
    sources: [{ label: "Marukyu Koyamaen: About us", url: "https://www.marukyu-koyamaen.co.jp/english/company.html" }],
    related: ["yamamasa-koyamaen", "ippodo", "horii-shichimeien"],
  },
  {
    slug: "yamamasa-koyamaen",
    name: "Yamamasa Koyamaen",
    native: "山政小山園",
    brand: "Yamamasa Koyamaen",
    founded: "1861",
    base: "Uji",
    basedIn: "Uji, Kyoto",
    kind: "Tea wholesaler with its own tea field",
    headline: "A wholesaler that traces its tea fields to the early Edo period and helped develop three Uji cultivars",
    story: [
      "Yamamasa Koyamaen says its family grew tea at Uji and Ogura from the beginning of the Edo period, around 1600. Its founder, Masajiro Koyama, started selling tea in 1861; the second Masajiro opened retail sales and spread the business nationwide.",
      "In the Taisho and early Showa years (about 1912 to 1940) the company says it built the industry's first matcha plant equipped with air conditioning and refrigeration for tea, and began selling matcha in cans (10 monme, about 37.5 g), which it credits with helping popularise canned tea.",
      "Its third-generation head, also named Masajiro Koyama, worked with the Uji farmer Jinnojo Hirano to grow and assess elite cultivars: Asahi, Samidori and Komakage, which Kyoto Prefecture recommended. This lines up with the cultivar pages on this site, where Asahi is credited to Hirano Jinnojo and Samidori to a farmer named Koyama Masajiro.",
    ],
    facts: [
      ["Founded", "1861 (Bunkyu 1), by Masajiro Koyama; tea growing at Uji and Ogura goes back earlier, by the company's account"],
      ["Based in", "Uji, Kyoto Prefecture"],
      ["Customers", "Supplies over a thousand tea shops, the company says"],
      ["Cultivars", "Asahi, Samidori and Komakage, developed with Jinnojo Hirano"],
    ],
    timeline: [
      { year: "c. 1600", text: "Tea cultivation begins on the family's land at Uji and Ogura (early Edo period)." },
      { year: "1861", text: "Founder Masajiro Koyama starts selling tea." },
      { year: "Taisho–early Showa", text: "The company builds a matcha plant with air conditioning and refrigeration, and sells matcha in 10 monme cans (about 1912 to 1940, by its own dating)." },
      { year: "Showa era", text: "Third-generation Masajiro Koyama and Jinnojo Hirano cultivate Asahi, Samidori and Komakage." },
    ],
    people: [
      { name: "Masajiro Koyama", native: "小山政次郎", role: "Founder (1861), then a second and a third generation of the same name; the third worked with Jinnojo Hirano on Uji cultivars" },
      { name: "Jinnojo Hirano", native: "平野甚之丞", role: "Uji farmer who selected Asahi, and worked with the Koyama family on Samidori and Komakage" },
    ],
    awards: [],
    current: ["Runs its own tea field and manufacturing plants in Uji, and sells wholesale to over a thousand tea shops, by its own account"],
    images: ["uji-shirakawa", "okunoyama"],
    cultivars: ["asahi", "samidori"],
    sources: [
      { label: "Yamamasa Koyamaen: Company profile", url: "https://www.yamamasa-koyamaen.co.jp/en/about/company.html" },
      { label: "Yamamasa Koyamaen: Our history", url: "https://www.yamamasa-koyamaen.co.jp/en/about/" },
    ],
    related: ["marukyu-koyamaen", "horii-shichimeien", "nakamura-tokichi"],
  },
  {
    slug: "ippodo",
    name: "Ippodo Tea",
    native: "一保堂茶舗",
    brand: "Ippodo",
    founded: "1717",
    base: "Kyoto",
    basedIn: "Teramachi Nijo, Kyoto",
    kind: "Family-run tea merchant",
    headline: "A Kyoto tea shop run by the Watanabe family since 1717",
    story: [
      "Ippodo's origins go back to 1717, when Rihei Watanabe, from Omi (present-day Shiga), set up a shop called Omiya near the Imperial Palace in Kyoto to sell tea and ceramics. In 1846 it was renamed Ippodo, “preserve one”: the name came from Prince Yamashina, who enjoyed the tea and wanted the shop to preserve one tradition, high-quality tea.",
      "The shop was destroyed by fire in the Hamaguri Gomon Incident of the 1860s and rebuilt on its present site. At one stage it mainly exported tea to the United States through merchants in Kobe, shipping in wooden boxes lined with tin when most tea went in ceramic jars, before turning to domestic retail.",
      "Ippodo says it was an early seller of 100 g bags when most tea was sold in 400 g bags, opened the Kaboku tearoom at its main store, and now has shops in Kyoto and Tokyo and an online shop for the United States and Canada. The company describes itself as family-run.",
    ],
    facts: [
      ["Founded", "1717, by Rihei Watanabe, as Omiya"],
      ["Renamed", "1846, to Ippodo, by Prince Yamashina"],
      ["Main shop", "Tokiwagi-cho, Nakagyo-ku, Kyoto (Teramachi Nijo)"],
      ["Family", "The Watanabe family, as the company describes it"],
    ],
    timeline: [
      { year: "1717", text: "Rihei Watanabe opens Omiya near the Imperial Palace, selling tea and ceramics." },
      { year: "1846", text: "The shop is renamed Ippodo by Prince Yamashina." },
      { year: "1860s", text: "Destroyed in the Hamaguri Gomon Incident fire and rebuilt on the same site." },
    ],
    people: [{ name: "Rihei Watanabe", role: "Founder, who set up the shop in 1717 after coming from Omi (present-day Shiga)" }, { name: "Prince Yamashina", role: "Gave the shop its name, Ippodo, in 1846" }],
    awards: [],
    current: ["Main shop and the Kaboku tearoom in Kyoto, a Tokyo office, and Ippodo tea sold at more than a hundred stores across Japan, many in department stores", "Online shop for the United States and Canada; its New York tea shop was temporarily closed from September 2022", "Monthly tea workshops teach how to prepare Japanese tea"],
    images: ["ippodo-shop", "ippodo-noren"],
    cultivars: [],
    sources: [{ label: "Ippodo Tea: About Ippodo", url: "https://global.ippodo-tea.co.jp/pages/about-ippodo" }],
    related: ["kanbayashi-shunsho", "fukujuen", "gion-tsujiri"],
  },
  {
    slug: "kanbayashi-shunsho",
    name: "Kanbayashi Shunsho",
    native: "上林春松本店",
    brand: "Kanbayashi Shunsho",
    founded: "1558–1569 (Eiroku era)",
    base: "Uji",
    basedIn: "Uji, Kyoto",
    kind: "Tea wholesaler descended from the Uji tea masters",
    headline: "A house descended from the tea masters who ran Uji tea under the Tokugawa",
    story: [
      "Kanbayashi Shunsho is an Uji tea wholesaler whose company history begins in the Eiroku era (1558–1569), when four sons of the Kanbayashi family, who had left their home district of Kanbayashi in Tamba after a clan struggle, settled in Uji. The family's own history records tea masters working for Toyotomi Hideyoshi and then Tokugawa Ieyasu, who put the Kanbayashi family in overall charge of Uji tea.",
      "The Shunsho branch served as an official tea supplier to the shogunate (gomotsu ochashi). The company supplies tea-ceremony households and department stores, runs a factory in Uji that takes visitors, and keeps the Uji Kanbayashi Memorial Museum on the street leading to Uji Bridge, which shows tea tools and records.",
      "The company's current head is named Kanbayashi Shunsho, a name the heads of the house take on. Sources differ on the count of generations (Japanese Wikipedia calls the current head the 15th; some sellers say 14th), so this page does not give a number. In 2007 the company worked with Coca-Cola Japan on the development of the Ayataka bottled green tea.",
    ],
    facts: [
      ["Founded", "In the Eiroku era (1558–1569), when the family settled in Uji"],
      ["Based in", "Uji, Kyoto Prefecture"],
      ["Role in history", "One of the Uji tea-master families; the Shunsho house served the shogunate as an official tea supplier"],
      ["Museum", "Uji Kanbayashi Memorial Museum, Uji"],
    ],
    timeline: [
      { year: "1558–1569", text: "Four sons of the Kanbayashi family settle in Uji." },
      { year: "2007", text: "The company helps develop Coca-Cola Japan's Ayataka bottled green tea." },
    ],
    people: [{ name: "Kanbayashi Shunsho", native: "上林春松", role: "The name taken by successive heads of the house" }],
    awards: [],
    current: ["Its Uji factory accepts visitors, and the Uji Kanbayashi Memorial Museum shows tea tools and records", "Sells matcha to tea-ceremony households and through department stores and online", "A 2017 book, Ujicha to Kanbayashi Ichizoku (Uji tea and the Kanbayashi family), is by the current head Kanbayashi Shunsho (Hidetoshi)"],
    images: ["kanbayashi-museum"],
    cultivars: [],
    sources: [
      { label: "Kanbayashi Shunsho: history (company site, Japanese)", url: "https://www.shunsho.co.jp/history/" },
      { label: "Japanese Wikipedia: 上林春松本店", url: "https://ja.wikipedia.org/wiki/上林春松本店" },
    ],
    related: ["ippodo", "horii-shichimeien", "yamamasa-koyamaen"],
  },
  {
    slug: "fukujuen",
    name: "Fukujuen",
    native: "福寿園",
    brand: "Fukujuen",
    founded: "1790",
    base: "Kyoto",
    basedIn: "Kyoto",
    kind: "Tea merchant and manufacturer",
    headline: "A tea merchant founded in 1790 in Yamashiro, now headquartered in Kyoto",
    story: [
      "Fukujuen was established in 1790 by Iyemon Fukui as a tea merchant in Kamikoma, in Yamashiro Province (now Yamashiro-cho, Kizugawa, Kyoto Prefecture), a position that linked Osaka, Kobe and the Yamato and Iga roads. Tea and raw silk were leading exports of the time, and the company traded mainly through Kobe port.",
      "As the export trade changed, Fukujuen turned to domestic sales, supplying tea shops across Japan, and says it pioneered mail-order sales of Uji tea after the postal parcel system began. It became a company under the sixth-generation owner Masami Fukui, opened its first direct store at Kyoto Station, and now runs direct stores across Japan.",
      "The company keeps the Fukujuen Archives to preserve Uji-tea heritage, including hand-rolled tea, and the museum at its Yamashiro-kan.",
    ],
    facts: [
      ["Founded", "1790 (Kansei 2), by Iyemon Fukui, in Kamikoma, Yamashiro Province"],
      ["Headquarters", "Kyoto"],
      ["Known for", "Early mail-order of Uji tea; direct stores; the Fukujuen Archives and museum"],
    ],
    timeline: [
      { year: "1790", text: "Iyemon Fukui founds Fukujuen as a tea merchant in Kamikoma, Yamashiro Province." },
    ],
    people: [{ name: "Iyemon Fukui", role: "Founder, 1790" }, { name: "Masami Fukui", role: "Sixth-generation owner, who turned the business from a sole proprietorship into a company" }],
    awards: [],
    current: ["Direct stores and outlets across Japan, including department stores, and a Kyoto head office", "Keeps the Fukujuen Archives of Uji-tea heritage, including hand-rolled tea, and a museum at its Yamashiro-kan", "Has opened a tea-tourism portal, Experience Fukujuen"],
    images: ["fukujuen-head", "fukujuen-museum"],
    cultivars: [],
    sources: [{ label: "Fukujuen: history", url: "https://global.fukujuen.com/en-us/pages/history" }],
    related: ["ippodo", "gion-tsujiri", "nakamura-tokichi"],
  },
  {
    slug: "nakamura-tokichi",
    name: "Nakamura Tokichi",
    native: "中村藤吉本店",
    brand: "Nakamura Tokichi",
    founded: "1854",
    base: "Uji",
    basedIn: "Uji, Kyoto",
    kind: "Tea merchant with a tea house",
    headline: "An Uji tea firm founded on New Year's Day 1854, home of a patented stone-mill grinding machine",
    story: [
      "The firm's own history traces back to 1819, when the parents of the first Nakamura Tokichi married. His father, Rokubei, was a thatched-roof craftsman; Tokichi, their fourth child, apprenticed under a tea master named Hoshino Soui, took the name Nakamura Tokichi, and founded the tea firm on New Year's Day 1854 on the site of today's main store (Honten) in Uji.",
      "The company says it motorised the tea-grinding mill and registered the Nakamura-style grinding machine as Japanese Patent No. 25028. The third Tokichi, Ukichi, became mayor of Uji. The firm also opened branches in the San'in region and won medals at national and local fairs.",
      "Nakamura Tokichi says that when the Kyoto Prefectural Tea Industry Research Institute selected 106 plants for new cultivars, two of them were 100-year-old trees from its own garden. These plants became the gyokuro cultivar Kyo Midori and the tencha and gyokuro cultivar Uji Hikari.",
    ],
    facts: [
      ["Founded", "1854, on New Year's Day, by the first Nakamura Tokichi, in Uji"],
      ["Based in", "Uji, Kyoto Prefecture (main store and tea house, Uji)"],
      ["Known for", "A patented stone-mill grinding machine; its Uji tea house"],
      ["Cultivars", "Says plants from its garden helped produce Kyo Midori and Uji Hikari"],
    ],
    timeline: [
      { year: "1819", text: "The parents of the first Nakamura Tokichi marry, where the firm dates its history." },
      { year: "1854", text: "Nakamura Tokichi founds the tea firm in Uji." },
    ],
    people: [{ name: "Nakamura Tokichi (the first)", role: "Founder, who apprenticed under Hoshino Soui and started the firm in 1854" }, { name: "Ukichi Nakamura", role: "Third Tokichi, who became mayor of Uji" }],
    awards: ["First Prize at the 4th National Industrial Fair, plus gold, silver and bronze medals at fairs and exhibitions (its own history page)", "Registered the Nakamura-style grinding machine as Japanese Patent No. 25028"],
    current: ["Main store and tea house (Honten) in Uji, which draws visitors for its tea and sweets"],
    images: ["tokichi-honten"],
    cultivars: ["ujihikari"],
    sources: [{ label: "Nakamura Tokichi Honten: history", url: "https://global.tokichi.jp/pages/history" }],
    related: ["yamamasa-koyamaen", "horii-shichimeien", "marukyu-koyamaen"],
  },
  {
    slug: "gion-tsujiri",
    name: "Gion Tsujiri",
    native: "祇園辻利",
    brand: "Gion Tsujiri",
    founded: "1860",
    base: "Kyoto",
    basedIn: "Gion, Kyoto",
    kind: "Tea manufacturer, shops and cafés",
    headline: "Started in Uji in 1860 and named for its founder, Tsuji Riemon; now in Gion, Kyoto",
    story: [
      "Gion Tsujiri was founded in 1860 as a tea manufacturer in Uji. Its name, “Tsujiri”, comes from its founder, Tsuji Riemon. After the Second World War the company, which had also opened a tea shop in Taipei, withdrew to Kyoto and established a store in Gion, the district around Yasaka Shrine, and the store was renamed Gion Tsujiri.",
      "The company runs the Saryo Tsujiri cafés, the first opened on the second floor of its Gion main store, and sells tea in folded-paper origami packaging. It says its tea is made in the traditional Uji way.",
    ],
    facts: [
      ["Founded", "1860, in Uji, by Tsuji Riemon"],
      ["Now based in", "Gion, Kyoto"],
      ["Known for", "Saryo Tsujiri cafés; origami paper packaging"],
    ],
    timeline: [
      { year: "1860", text: "Tsuji Riemon founds Tsujiri, a tea manufacturer in Uji." },
      { year: "After WWII", text: "The company withdraws to Kyoto and sets up its store in Gion." },
    ],
    people: [{ name: "Tsuji Riemon", role: "Founder, from whose name the company takes its own" }],
    awards: [],
    current: ["Saryo Tsujiri cafés at Gion, Kyoto Isetan, Kodaiji, Kyoto Station, Tokyo Daimaru and Tokyo Skytree Town Solamachi (by the company's timeline)", "A shop in Taipei, Tsujiri Chaho, opened before the war"],
    images: ["tsujiri-gion"],
    cultivars: [],
    sources: [{ label: "Gion Tsujiri: About us", url: "https://www.giontsujiri.co.jp/en/aboutus/" }],
    related: ["ippodo", "fukujuen", "nakamura-tokichi"],
  },
  {
    slug: "horii-shichimeien",
    name: "Horii Shichimeien",
    native: "堀井七茗園",
    brand: "Horii Shichimeien",
    founded: "1879",
    base: "Uji",
    basedIn: "Uji, Kyoto",
    kind: "Tea dealer and grower",
    headline: "Keeper of Okunoyama, the last of the seven famous Uji tea gardens",
    story: [
      "Horii Shichimeien takes its name from “Uji Shichimeien”, the seven celebrated tea gardens of Uji, said to have been designated in the Muromachi period when the Ashikaga shoguns favoured Uji tea. Only one, Okunoyama on a hill above Uji, survives as a working tea garden, and the Horii family has protected and farmed it since acquiring it in the mid-Meiji period.",
      "The company dates itself to 1879 (Meiji 12), when the second-generation owner, Fusakichi Horii, entered a tea called “Matsukaze” in the first Tea Manufacturing Competitive Exhibition in Yokohama, the first public record of the business. The third-generation owner, Chojiro Horii, invented the “Horii-style tencha dryer”; the company describes the early Meiji years as a crisis for Uji tea, when the patronage of generals and feudal lords had gone and mechanisation was spreading.",
      "The company stands near the Byodoin temple, opposite Agata Shrine, and its current president is Chotaro Horii. The Okunoyama garden can be seen through its fence, and a stone monument marking the seven gardens stands beside it.",
    ],
    facts: [
      ["Founded", "1879 (Meiji 12), the year of its first public record"],
      ["Based in", "Uji, Kyoto Prefecture, near Byodoin"],
      ["Garden", "Okunoyama, the only surviving commercial garden of the Uji Seven Gardens, cultivated by the family since the mid-Meiji period"],
      ["Invention", "The Horii-style tencha dryer, by the third-generation owner Chojiro Horii"],
    ],
    timeline: [
      { year: "Muromachi period", text: "The Ashikaga shoguns are said to designate seven excellent tea gardens in Uji." },
      { year: "1879", text: "Second-generation owner Fusakichi Horii enters “Matsukaze” tea in the first Tea Manufacturing Competitive Exhibition in Yokohama." },
      { year: "Mid-Meiji", text: "The family acquires the Okunoyama tea garden." },
    ],
    people: [{ name: "Fusakichi Horii", role: "Second-generation owner, whose 1879 exhibition entry is the company's first public record" }, { name: "Chojiro Horii", role: "Third-generation owner, inventor of the Horii-style tencha dryer" }, { name: "Chotaro Horii", role: "Current president" }],
    awards: [],
    current: ["Farms the Okunoyama garden, which visitors can view through the fence, and keeps the stone monument to the Seven Gardens beside it", "Led today by president Chotaro Horii"],
    images: ["okunoyama"],
    cultivars: [],
    sources: [
      { label: "Horii Shichimeien: the history of Horii Shichimeien", url: "https://horiishichimeien.com/en-sb/pages/story3" },
      { label: "Horii Shichimeien: company profile", url: "https://horiishichimeien.com/en-sb/pages/company" },
    ],
    related: ["nakamura-tokichi", "yamamasa-koyamaen", "kanbayashi-shunsho"],
  },
  {
    slug: "aiya",
    name: "Aiya",
    native: "あいや",
    brand: "Aiya",
    founded: "1888",
    base: "Nishio",
    basedIn: "Nishio, Aichi",
    kind: "Matcha manufacturer, family-owned",
    headline: "A Nishio matcha maker that began as a dye and tea shop in 1888",
    story: [
      "Aiya was founded in 1888 by Aijiro Sugita in Nishio, Aichi, as a local shop selling dyes and tea. The nickname “Aiya” came from aidama, an indigo dye used on kimonos, and later became the company name. The company says it is managed by the fifth generation of the Sugita family.",
      "Early on it concentrated on dyes and gyokuro. Aijiro moved the business toward matcha, working with local growers to cultivate new fields and improving the stone granite grinding mills used to make it.",
      "Aiya says it began exporting matcha powder to North America, set up a quality-control department, started organic tea farming in Toyota, and opened Aiya America and Aiya Europe. These are the company's own statements.",
    ],
    facts: [
      ["Founded", "1888, by Aijiro Sugita, in Nishio, Aichi Prefecture"],
      ["Based in", "Nishio, Aichi Prefecture"],
      ["Family", "The Sugita family; fifth generation in management, by its own account"],
      ["Name", "From aidama, an indigo dye the original shop sold"],
    ],
    timeline: [{ year: "1888", text: "Aijiro Sugita opens a dye and tea shop in Nishio." }],
    people: [{ name: "Aijiro Sugita", role: "Founder, 1888; later heads of the family business have carried his name" }],
    awards: ["Says it was the first matcha producer to receive JONA organic certification, and later OCIA and IMO organic certifications", "Says it holds ISO 9001 and ISO 22000 certification (calling ISO 22000 a first for the matcha industry) and the highest “Superior” rating in an AIB Food Safety Audit"],
    current: ["Run by the Sugita family, with Aiya America and Aiya Europe selling matcha overseas", "Says it started Japan's first organic green tea cultivation, at its farm in Toyota"],
    images: [],
    cultivars: [],
    sources: [{ label: "Aiya America: our story", url: "https://aiya-america.com/our-story" }],
    related: ["marukyu-koyamaen", "ippodo"],
  },
  {
    slug: "chikiriya",
    name: "Chikiriya Tea House",
    native: "ちきりや",
    brand: "Chikiriya Tea House",
    founded: "1854",
    base: "Kyoto",
    basedIn: "Kyoto",
    kind: "Tea house and blender",
    headline: "A Kyoto tea house that grew out of a merchant family's kimono shop and once owned its own Uji plantation",
    story: [
      "The name Chikiriya goes back to the sixteenth century, to the merchant family of Chikiriya Kichiemon in Kyoto and its clothing shop. The tea house itself began in the nineteenth century with Kakubei Akiyama the fifth, a member of that family, who in 1854 opened his own shop under the Chikiriya name and sold Uji sencha alongside the family's kimono business.",
      "His successor, Kakubei Akiyama the sixth, turned it into an exclusive tea house, Chikiriya Chaten. In 1910 the company acquired its own tea plantation in Uji with a factory making mainly gyokuro and matcha, and, by its account, was one of only three tea houses to own a plantation until the Second World War, when land reform ended its ownership.",
      "After the war it rebuilt in Kyoto and the Kansai region, entered the Hanshin department store in Umeda, Osaka, in 1957, and began selling through CO-OP supermarkets, first in Kyoto in 1964 and nationwide in 1976. It built its own blending factory in 1988, certified for JAS organic production since 2001 and ISO 9001 since 2006.",
    ],
    facts: [
      ["Founded", "1854, in Kyoto, by Kakubei Akiyama the fifth"],
      ["Name", "From the Chikiriya merchant family of sixteenth-century Kyoto"],
      ["Own plantation", "Uji, from 1910 until post-war land reform"],
      ["Certifications", "JAS Organic since 2001; ISO 9001 since 2006 (its blending factory)"],
    ],
    timeline: [
      { year: "1854", text: "Kakubei Akiyama the fifth opens Chikiriya, selling Uji sencha." },
      { year: "1910", text: "The company acquires its own tea plantation and factory in Uji." },
      { year: "1957", text: "The brand enters the Hanshin department store in Umeda, Osaka." },
      { year: "1988", text: "Builds its own blending and conditioning factory." },
    ],
    people: [{ name: "Kakubei Akiyama the fifth", role: "Founder of the tea house (1854), from the Chikiriya family" }, { name: "Kakubei Akiyama the sixth", role: "Successor, who turned the shop into an exclusive tea house" }],
    awards: ["JAS Organic certification (since 2001) and ISO 9001 (since 2006) for its blending factory, by its own history page"],
    current: ["Sells through its Kyoto tea house, department stores and CO-OP supermarkets in Japan, and online"],
    images: ["uji-shirakawa"],
    cultivars: [],
    sources: [{ label: "Chikiriya Tea House: our history", url: "https://kyo-chikiriya.shop/pages/chikiriya_our_history" }],
    related: ["ippodo", "fukujuen", "gion-tsujiri"],
  },
  {
    slug: "obubu-tea-farms",
    name: "Kyoto Obubu Tea Farms",
    native: "おぶぶ茶園",
    brand: "Obubu Tea Farms",
    founded: "2004",
    base: "Wazuka",
    basedIn: "Wazuka, Kyoto",
    kind: "Tea farm and social venture",
    headline: "A young Wazuka farm built by two friends, with tours, interns and a mission to reach drinkers worldwide",
    story: [
      "Kyoto Obubu Tea Farms was founded in 2004 by Akihiro Kita (“Akky”) and Yasuharu Matsumoto (“Matsu”), who describe it as an agricultural social venture. It is based in Wazuka, in Kyoto Prefecture's tea hills, an hour or so from Kyoto Station.",
      "On the farm's own account, Akky took a part-time job as a farmhand in Wazuka while at college, fell for the tea he drank there, left college and set out to master tea farming. He is now the president and lead farmer. Matsu handles management and customer connections, and drives the company's push overseas, including tea events in Europe.",
      "The team also includes Hiro, who runs events, the sencha factory and tea tours, and Kayo, who moved her family to the area to lead operations. A long line of interns from around the world stay at the farm, writing on its blog about tea, history, ceramics and the town.",
    ],
    facts: [
      ["Founded", "2004, by Akihiro Kita and Yasuharu Matsumoto"],
      ["Based in", "Wazuka, Kyoto Prefecture"],
      ["Also makes", "Sencha, and Japanese black tea"],
      ["Visitors", "Tea tours and events; an intern programme"],
    ],
    timeline: [{ year: "2004", text: "Akihiro Kita and Yasuharu Matsumoto establish the company in Wazuka." }],
    people: [
      { name: "Akihiro “Akky” Kita", role: "President, founder and lead farmer" },
      { name: "Yasuharu “Matsu” Matsumoto", role: "Vice president, founder and business development lead; leads the push to overseas markets" },
      { name: "Hiro", role: "Founder; events, tea tours and the sencha factory" },
      { name: "Kayo", role: "Head of operations, who moved her family to Wazuka to join the farm" },
    ],
    awards: [],
    current: ["Runs tea tours, events and an intern programme, with interns writing on the farm's blog", "Sells tea online worldwide; its team tours Europe each winter off-season"],
    images: ["wazuka"],
    cultivars: [],
    sources: [{ label: "Kyoto Obubu Tea Farms: the Obubu family", url: "https://obubutea.com/about-us/the-obubu-family/" }],
    related: ["nakamura-tokichi", "horii-shichimeien"],
  },
];

export const producerBySlug = (slug: string) => PRODUCERS.find((p) => p.slug === slug);
