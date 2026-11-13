// The "Matcha Hall of Fame": ten people who shaped matcha, in order of when they lived.
// Every fact below was checked against the sources listed for that person. Where the record rests on
// tradition or the sources disagree, the text says so. Japanese names follow the usual order
// (family name first).

export type Era = "china" | "japan" | "west";

export type Person = {
  slug: string;
  name: string;
  native?: string;
  years: string;
  era: Era;
  title: string; // one line: what they are known for
  bio: string;
  contributions: string[];
  note?: string; // a caution about the record
  sources: { label: string; url: string }[];
};

export const PEOPLE: Person[] = [
  {
    slug: "lu-yu",
    name: "Lu Yu",
    native: "陸羽",
    years: "733–804",
    era: "china",
    title: "Wrote the first great book on tea",
    bio: "Lu Yu was a Tang-dynasty scholar from Tianmen in what is now Hubei. After finishing his studies around 752 he stayed in Jingling, where he wrote The Classic of Tea (Cha Jing). It is described as the first definitive work on growing, making and drinking tea.",
    contributions: [
      "Set out tea's origins, cultivation, preparation and the tools for drinking it in a single work",
      "Helped turn tea drinking into a cultured pastime in Tang China",
      "Became a legend: tea sellers of the era reportedly made pottery figures of him and honoured him as the tea god",
    ],
    note: "Tang-era tea was prepared differently from modern matcha. He is here because the later tradition of tea writing, and of whisked tea in the Song dynasty, grew from the culture he documented.",
    sources: [{ label: "Lu Yu (Wikipedia)", url: "https://en.wikipedia.org/wiki/Lu_Yu" }],
  },
  {
    slug: "emperor-huizong",
    name: "Emperor Huizong of Song",
    native: "宋徽宗",
    years: "1082–1135",
    era: "china",
    title: "The emperor who wrote the Song tea treatise",
    bio: "Huizong was an emperor of the Northern Song dynasty and a famous art patron. He was also a great tea enthusiast, and he is credited with The Treatise on Tea, described as the most detailed and masterful account of the Song dynasty's sophisticated style of tea ceremony.",
    contributions: [
      "Left one of the fullest surviving accounts of how the Song court prepared and judged tea",
      "Lent the weight of the throne to a refined tea culture that Japanese Zen monks visiting China later studied",
    ],
    note: "Song tea was powdered tea whisked in a bowl, the direct ancestor of Japanese matcha. That link is why Japanese monks who trained in China carried the practice home.",
    sources: [{ label: "Emperor Huizong of Song (Wikipedia)", url: "https://en.wikipedia.org/wiki/Emperor_Huizong_of_Song" }],
  },
  {
    slug: "eisai",
    name: "Eisai",
    native: "栄西",
    years: "1141–1215",
    era: "japan",
    title: "Brought tea seeds and the tea habit from China",
    bio: "Eisai was a Zen monk born in Bitchū Province. After a second trip to China (1187–1191) he returned to Japan in 1191 with Zen scriptures and green tea seeds, and founded Shōfuku-ji in Kyūshū.",
    contributions: [
      "Returned from China in 1191 with tea seeds, a founding moment in Japanese tea history",
      "Wrote Kissa Yōjōki (“Drinking Tea for Health”), arguing that tea supplies the bitter taste the Japanese diet lacked and protects the heart",
      "Tradition says he planted seeds at Seburiyama in Hizen, and that he passed some on to the monk Myōe",
    ],
    note: "The planting stories are tradition rather than documented fact, and sources vary on details.",
    sources: [
      { label: "Eisai (Wikipedia)", url: "https://en.wikipedia.org/wiki/Eisai" },
      { label: "History of tea in Japan (Wikipedia)", url: "https://en.wikipedia.org/wiki/History_of_tea_in_Japan" },
    ],
  },
  {
    slug: "myoe",
    name: "Myōe",
    native: "明恵",
    years: "1173–1232",
    era: "japan",
    title: "Planted the tea that became Uji",
    bio: "Myōe was a Buddhist monk who studied Zen under Eisai by about the age of twenty. In the traditional account Eisai gave him tea seeds, which he planted at Toganoo (Kōzan-ji, near Kyoto), and from there tea spread to nearby Uji.",
    contributions: [
      "By tradition, started the tea fields at Toganoo, whose tea was known as honcha, “true tea”",
      "His plantings are credited as the start of tea growing around Kyoto, the region that later made Uji synonymous with matcha",
    ],
    note: "Sources differ on whether he planted at Kōzan-ji itself, nearby, or in Uji, and on when Uji tea overtook Toganoo's (by the 15th century in some accounts, the late 1500s in others). Treat the story as tradition, not proven history.",
    sources: [
      { label: "Myōe (Wikipedia)", url: "https://en.wikipedia.org/wiki/My%C5%8De" },
      { label: "Uji tea (Wikipedia)", url: "https://en.wikipedia.org/wiki/Uji_tea" },
      { label: "History of tea in Japan (Wikipedia)", url: "https://en.wikipedia.org/wiki/History_of_tea_in_Japan" },
    ],
  },
  {
    slug: "murata-juko",
    name: "Murata Jukō",
    native: "村田珠光",
    years: "1423–1502",
    era: "japan",
    title: "Made tea a spiritual practice",
    bio: "Born in Nara, Murata Jukō studied Zen under the priest Ikkyū Sōjun, whose teaching that the Buddha's law is also found in the Way of Tea inspired him. He is counted among the first developers of wabi-cha, the plain, humble style of tea.",
    contributions: [
      "Helped create wabi-cha, using native Japanese tea utensils",
      "Developed the four-and-a-half-mat tearoom, later the standard under Sen no Rikyū",
      "Taught four values: humble reverence, respect, purity and calm",
      "Set out his ideas in Kokoro no fumi (“Letter of the Heart”), written around 1488",
    ],
    sources: [{ label: "Murata Jukō (Wikipedia)", url: "https://en.wikipedia.org/wiki/Murata_Juk%C5%8D" }],
  },
  {
    slug: "takeno-joo",
    name: "Takeno Jōō",
    native: "武野紹鷗",
    years: "1502–1555",
    era: "japan",
    title: "Carried wabi-cha from Jukō to Rikyū",
    bio: "A wealthy merchant of Sakai whose family dealt in leather goods for warriors, Takeno Jōō followed Murata Jukō as an early champion of wabi-cha. He was the foremost tea master in Sakai, and his circle was shaped by poetry and Zen.",
    contributions: [
      "Carried Jukō's wabi-cha forward and made Sakai a centre of tea",
      "Developed a tea style suited to Sakai's customs rather than Kyoto's",
      "Taught Sen no Rikyū, the most important tea master in history",
    ],
    sources: [{ label: "Takeno Jōō (Wikipedia)", url: "https://en.wikipedia.org/wiki/Takeno_J%C5%8D%C5%8D" }],
  },
  {
    slug: "sen-no-rikyu",
    name: "Sen no Rikyū",
    native: "千利休",
    years: "1522–1591",
    era: "japan",
    title: "Perfected the Japanese tea ceremony",
    bio: "Born in Sakai, Sen no Rikyū is regarded as the most influential figure in the Japanese tea ceremony, especially wabi-cha, which stresses rustic simplicity, directness and honesty. He became tea master to Oda Nobunaga in 1579 and to Toyotomi Hideyoshi after Nobunaga's death in 1582.",
    contributions: [
      "Distilled wabi-cha into the form still practised today",
      "Played a central role in Hideyoshi's Grand Kitano Tea Ceremony of 1587",
      "His descendants founded the three schools that carry on his lineage: Omotesenke, Urasenke and Mushakōjisenke",
      "Ordered by Hideyoshi to take his own life in 1591; the exact reasons remain uncertain",
    ],
    sources: [{ label: "Sen no Rikyū (Wikipedia)", url: "https://en.wikipedia.org/wiki/Sen_no_Riky%C5%AB" }],
  },
  {
    slug: "okakura-kakuzo",
    name: "Okakura Kakuzō",
    native: "岡倉覚三",
    years: "1863–1913",
    era: "west",
    title: "Explained tea to the English-speaking world",
    bio: "Born in Yokohama, Okakura was an art scholar who wrote The Book of Tea in English, published by Putnam's in New York in 1906. In 1906 William Sturgis Bigelow invited him to the Museum of Fine Arts, Boston, where he became curator of the Department of Japanese and Chinese Art in 1910.",
    contributions: [
      "Wrote The Book of Tea (1906), still one of the best-known introductions to tea and Japanese aesthetics for Western readers",
      "Argued that tea is more than a way of drinking: a philosophy of beauty and simplicity",
      "Brought Asian art and ideas to an American museum audience as a curator in Boston",
    ],
    sources: [{ label: "Okakura Kakuzō (Wikipedia)", url: "https://en.wikipedia.org/wiki/Okakura_Kakuz%C5%8D" }],
  },
  {
    slug: "sosei-shizuye-matsumoto",
    name: "Sosei Shizuye Matsumoto",
    years: "active from 1951",
    era: "west",
    title: "Started tea ceremony classes in America",
    bio: "Born in Honolulu, Matsumoto began tea training in 1941 and spent six years in Kyoto under the 14th and 15th Urasenke grand masters. In 1951 she started teaching Urasenke tea in Los Angeles, holding the first tea ceremony classes in the United States.",
    contributions: [
      "Opened the first Urasenke tea classes in the United States (Los Angeles, 1951)",
      "Served tea over four days to more than 3,000 officials at the San Francisco signing of the U.S.–Japan peace treaty in 1951",
      "Introduced chado to American television audiences on CBS and NBC in the 1950s",
      "Presented the tea ceremony at the 1968 Olympic Arts Festival in Mexico City; named a National Heritage Fellow by the National Endowment for the Arts in 1994",
    ],
    sources: [
      { label: "National Endowment for the Arts: Sosei Shizuye Matsumoto", url: "https://www.arts.gov/honors/heritage/sosei-shizuye-matsumoto" },
      { label: "Library of Congress: Japanese tea ceremony", url: "https://blogs.loc.gov/folklife/2017/05/japanese-tea-ceremony/" },
    ],
  },
  {
    slug: "sen-genshitsu",
    name: "Sen Genshitsu (Sen Sōshitsu XV)",
    native: "千玄室",
    years: "1923–2025",
    era: "west",
    title: "Took “peace through a bowl of tea” around the world",
    bio: "The 15th grand master of the Urasenke school (from 1964 until he handed the role to his son in 2002) travelled to the United States in 1951 to introduce the tea ceremony, and spent decades promoting tea as a path to peace. He died in Kyoto on August 14, 2025, aged 102.",
    contributions: [
      "Introduced the Urasenke tea ceremony to America in 1951 and spent decades promoting it abroad",
      "Used tea as a message of peace, including serving tea at the USS Arizona Memorial in Hawaii in 2011",
      "Trained teachers such as Sosei Shizuye Matsumoto, who studied under him in Kyoto",
    ],
    note: "A claim that he served as a UNESCO goodwill ambassador appears in only one source we found, so it is left out.",
    sources: [
      { label: "Sen Sōshitsu XV (Wikipedia)", url: "https://en.wikipedia.org/wiki/Sen_S%C5%8Dshitsu_XV" },
      { label: "AP obituary, via The Week", url: "https://www.theweek.in/wire-updates/international/2025/08/14/fes32-japan-obit-sen.html" },
    ],
  },
];
