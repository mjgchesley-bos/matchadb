// Pictures for the producer pages. Every one is public domain or openly licensed (Wikimedia Commons); the credit and licence are shown under
// each picture and link to its Commons page. None is a product photo or a company's own marketing image. Resized to 900 px or less.
export type ProducerImage = { key: string; src: string; w: number; h: number; alt: string; caption: string; credit: string; page: string };

const I = (key: string, w: number, h: number, alt: string, caption: string, credit: string, file: string): ProducerImage => ({
  key,
  src: `/images/producers/${key}.jpg`,
  w,
  h,
  alt,
  caption,
  credit,
  page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, "_"))}`,
});

export const PRODUCER_IMAGES: Record<string, ProducerImage> = Object.fromEntries(
  [
    I("ippodo-shop", 900, 675, "The street front of the Ippodo Tea main shop in Kyoto", "Ippodo Tea main shop, Teramachi Nijo, Kyoto", "Nesnad, CC BY 4.0", "Ippodō Kyoto -2022 Dec 30 10：25AM.jpg"),
    I("ippodo-noren", 800, 600, "The cloth noren curtain hanging at the entrance of Ippodo Tea", "The noren (entrance curtain) of Ippodo Tea", "yomi955, CC BY 2.0", "Noren of Japanese tea established shop by yomi955 in Kyoto.jpg"),
    I("tokichi-honten", 520, 675, "A pine tree and a raked gravel garden with large stones beside a wooden tea house", "The garden beside the Nakamura Tokichi Honten tea house in Uji (cropped)", "HAGAT hOMSZE, CC0", "JP 日本 Japan 京都 Kyoto 宇治城 Uji-shi Uji Myouraku shop Nakamura Tokichi Honten Tea House Restaurant June 2026 N13P 02.jpg"),
    I("tsujiri-gion", 900, 675, "The wooden shop sign of Gion Tsujiri above a closed shutter", "The shop sign of Gion Tsujiri in Gion, Kyoto (the shop was temporarily closed in this April 2020 photo)", "Hahifuheho, CC0", "Closed Gion Tujiri 20200505.jpg"),
    I("fukujuen-head", 900, 675, "The Fukujuen head office building on Shijo-dori in Kyoto", "Fukujuen head office, Shijo-dori, Kyoto", "Wikimedia Commons contributor, CC BY-SA 3.0", "Fukujuen Kyoto Head Office.JPG"),
    I("fukujuen-museum", 640, 480, "A display in the Fukujuen museum at Yamashiro-kan", "The museum at Fukujuen's Yamashiro-kan", "百姓天国, CC0", "Fukujuen Museum 01.jpg"),
    I("kanbayashi-museum", 900, 600, "The entrance of the Uji Kanbayashi Memorial Museum", "The Uji Kanbayashi Memorial Museum (Uji-Kanbayashi Kinenkan) beside Uji Bridge", "othree, CC BY 2.0", "宇治 上林記念館 (14003018022).jpg"),
  ].map((x) => [x.key, x]),
);
