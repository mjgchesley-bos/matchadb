// Images for the Matcha Hall of Fame. Each is public domain or freely licensed (Wikimedia Commons); the credit and licence are shown under every picture.
export type HofImage = { src: string; w: number; h: number; alt: string; caption: string; credit: string; page: string };

export const PERSON_IMAGES: Record<string, HofImage[]> = {
  "lu-yu": [
    { src: "/images/hall-of-fame/lu-yu-1.jpg", w: 1000, h: 750, alt: "Statue of Lu Yu", caption: "Statue of Lu Yu", credit: "Public domain", page: "https://commons.wikimedia.org/wiki/File:Lu_Yu.jpg" },
  ],
  "emperor-huizong": [
    { src: "/images/hall-of-fame/emperor-huizong-1.jpg", w: 1000, h: 1720, alt: "Painted portrait of Emperor Huizong seated in a red robe", caption: "Seated portrait of Emperor Huizong (Song dynasty painting)", credit: "Public domain", page: "https://commons.wikimedia.org/wiki/File:Seated_Portrait_of_Emperor_Song_Huizong.tif" },
  ],
  "eisai": [
    { src: "/images/hall-of-fame/eisai-1.jpg", w: 800, h: 1414, alt: "Painted portrait of the monk Eisai seated", caption: "Eisai (Myōan Yōsai), portrait at Kennin-ji, Kyoto", credit: "Public domain", page: "https://commons.wikimedia.org/wiki/File:Myoan-Eisai-Kennin-ji-Portrait.png" },
    { src: "/images/hall-of-fame/eisai-2.jpg", w: 1000, h: 667, alt: "A young tea tree beside a sign in the grounds of Shōfuku-ji", caption: "A tea tree at Shōfuku-ji, Fukuoka, the temple Eisai founded in 1191", credit: "Tsuyoshi chiba, CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Shofukuji_tea_tree.jpg" },
  ],
  "myoe": [
    { src: "/images/hall-of-fame/myoe-1.jpg", w: 1000, h: 1066, alt: "Line drawing of the monk Myōe seated with a book", caption: "Myōe, from a drawing after a painting by Tani Bunchō and others", credit: "Public domain", page: "https://commons.wikimedia.org/wiki/File:Myou-e.jpg" },
    { src: "/images/hall-of-fame/myoe-2.jpg", w: 1000, h: 666, alt: "A wooden temple hall among trees at Kōzan-ji", caption: "Kōzan-ji, Kyoto, where tradition places Myōe's first tea planting", credit: "663highland, CC BY 2.5", page: "https://commons.wikimedia.org/wiki/File:Kozanji_Kyoto_Kyoto09s5s4592.jpg" },
    { src: "/images/hall-of-fame/myoe-3.jpg", w: 760, h: 582, alt: "Rows of tea bushes at Uji with a pagoda behind", caption: "A tea yard at Uji, photographed in the late 19th century (New York Public Library)", credit: "New York Public Library, no known copyright restrictions", page: "https://commons.wikimedia.org/wiki/File:Tea-Yard_at_Uzi,_Yamashiro_(3109909163).jpg" },
  ],
  "murata-juko": [
    { src: "/images/hall-of-fame/murata-juko-1.jpg", w: 318, h: 317, alt: "Painted portrait of Murata Jukō seated with a sword beside him", caption: "Murata Jukō", credit: "Public domain", page: "https://commons.wikimedia.org/wiki/File:Murata_Juko.PNG" },
  ],
  "sen-no-rikyu": [
    { src: "/images/hall-of-fame/sen-no-rikyu-1.jpg", w: 1000, h: 1084, alt: "Painted portrait of Sen no Rikyū seated in dark robes", caption: "Sen no Rikyū, portrait by Hasegawa Tōhaku", credit: "Public domain", page: "https://commons.wikimedia.org/wiki/File:Sen_no_Rikyu_JPN_(cropped).jpg" },
    { src: "/images/hall-of-fame/sen-no-rikyu-2.jpg", w: 1000, h: 708, alt: "Black-and-white photograph of the small Tai-an tearoom building", caption: "The Tai-an tearoom at Myōkian, Kyoto, late 16th century", credit: "Public domain", page: "https://commons.wikimedia.org/wiki/File:TAIAN_in_MyokiAN_Kyoto.jpg" },
  ],
  "okakura-kakuzo": [
    { src: "/images/hall-of-fame/okakura-kakuzo-1.jpg", w: 1000, h: 1263, alt: "Portrait photograph of Okakura Kakuzō", caption: "Okakura Kakuzō, about 1905", credit: "Public domain", page: "https://commons.wikimedia.org/wiki/File:Okakura_Kakuzo_Portrait_c1905.png" },
    { src: "/images/hall-of-fame/okakura-kakuzo-2.jpg", w: 1000, h: 1236, alt: "Two men in front of a building, one in Japanese dress", caption: "Okakura (left) with Hugo Münsterberg at the 1904 World's Fair, St. Louis", credit: "Public domain", page: "https://commons.wikimedia.org/wiki/File:Professor_Okakura,_Fine_Arts_Museum,_Boston,_and_Professor_Hugo_Munsterberg,_Harvard_on_the_steps_of_Ridgely_Hall_during_the_1904_World%27s_Fair.jpg" },
  ],
  "sen-genshitsu": [
    { src: "/images/hall-of-fame/sen-genshitsu-1.jpg", w: 650, h: 444, alt: "An elderly man whisking tea in a bowl", caption: "Sen Genshitsu preparing tea during a meeting with Maria Kaczyńska, Poland's first lady, June 2007", credit: "Archive of the Chancellery of the President of the Republic of Poland, GFDL 1.2", page: "https://commons.wikimedia.org/wiki/File:2007_06_19_Sen_Genshitsu_(%E7%8E%84%E5%AE%A4)_during_a_meeting_with_Maria_Kaczynska.jpg" },
  ],
};

export const SECTION_IMAGES: Record<string, HofImage> = {
  "japan":
    { src: "/images/hall-of-fame/japan-1.jpg", w: 1000, h: 671, alt: "Woodblock print of women preparing tea in a tearoom", caption: "Making usucha, thin powdered tea: woodblock print by Mizuno Toshikata", credit: "Public domain", page: "https://commons.wikimedia.org/wiki/File:Cha_no_yu_nichinichis%C5%8D_by_Mizuno_Toshikata_14.jpg" },
  "west":
    { src: "/images/hall-of-fame/west-1.jpg", w: 1000, h: 771, alt: "Black-and-white view of a tea house on a lagoon at the fair", caption: "The Japanese tea garden at the 1893 World's Columbian Exposition, Chicago", credit: "Public domain", page: "https://commons.wikimedia.org/wiki/File:View_Of_Japanese_Tea_Garden_From_Lagoon_%E2%80%94_Official_Views_Of_The_World%27s_Columbian_Exposition_%E2%80%94_49.jpg" },
};
