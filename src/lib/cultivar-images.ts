// Pictures for the cultivar pages. Every one is public domain or openly licensed (Wikimedia Commons); the credit and licence are shown
// under each picture, and each links to its Commons page. Resized to 900 px wide. Nothing here is a product photo or a brand's image.
export type CultivarImage = { key: string; src: string; w: number; h: number; alt: string; caption: string; credit: string; page: string };

const I = (key: string, w: number, h: number, alt: string, caption: string, credit: string, file: string): CultivarImage => ({
  key,
  src: `/images/cultivars/${key}.jpg`,
  w,
  h,
  alt,
  caption,
  credit,
  page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, "_"))}`,
});

export const CULTIVAR_IMAGES: Record<string, CultivarImage> = Object.fromEntries(
  [
    I("sugiyama", 636, 889, "Black-and-white portrait of Sugiyama Hikosaburo, an older man with a long white beard in a dark jacket", "Sugiyama Hikosaburo (1857–1941), who selected Yabukita in 1908", "Public domain (photographer unknown)", "Sugiyama Hikosaburo.jpg"),
    I("yabukita-mother-tree", 900, 675, "The protected original Yabukita tea plant behind a low wall and blue netting, with an information board", "The original Yabukita plant (the “mother tree”) in Yata, Suruga-ku, Shizuoka, kept as a prefectural natural monument", "Halowand, CC BY-SA 4.0", "YAbukuta mother tree.jpg"),
    I("sugiyama-memorial-field", 900, 675, "Rows of tea bushes in the Sugiyama Hikosaburo Memorial Tea Field", "Sugiyama Hikosaburo Memorial Tea Field, Shizuoka City", "Akahito Yamabe, CC BY-SA 4.0", "Hikosaburo Sugiyama Memorial Tea Field 01.jpg"),
    I("yabukita-aracha", 900, 675, "A pile of dried, rolled green tea leaves", "Dried Yabukita tea leaves (aracha, the unrefined tea) from Kawane-honcho, Shizuoka, 2009", "USAGI-WRP, CC BY 3.0", "Chakan aracha kesencha yabukita 2009.jpg"),
    I("fuji-tea-field", 900, 600, "A tea field with Mount Fuji behind it", "Tea fields in Fuji City, Shizuoka Prefecture", "くろふね (Kurofune), CC BY 3.0", "今宮の茶畑 - panoramio.jpg"),
    I("makinohara", 900, 473, "A broad tea plateau looking toward the city of Shimada", "The Makinohara plateau, one of Japan's largest tea-growing areas, looking toward Shimada, Shizuoka", "Saigen Jiro, CC0", "Shimada city from Makinohara Upland.JPG"),
    I("wazuka", 900, 600, "Terraced tea bushes on a hillside in Wazuka", "Tea fields in Wazuka, Kyoto Prefecture", "Nytm, CC BY-SA 4.0", "TeaPlantation Wazuka(Kyoto).jpg"),
    I("uji-kowata", 900, 675, "Rows of tea bushes in Kowata, Uji", "A tea field in Kowata, Uji, Kyoto Prefecture", "おいでやす千年の都, CC0", "Tea plant in Kowata, Uji, Kyoto.jpg"),
    I("uji-shirakawa", 900, 675, "Tea fields in the Shirakawa district of Uji", "Tea fields in the Shirakawa district, Uji", "おいでやす千年の都, CC0", "宇治白川の茶畑 01.jpg"),
    I("okunoyama", 900, 675, "The Okunoyama tea garden in Uji", "Okunoyama, the only surviving garden of the “Seven Famous Uji Tea Gardens” of the Muromachi period; it is a designated cultural landscape", "Indiana jo, CC BY-SA 4.0", "Okunoyama tea plantation 01.jpg"),
    I("tencha-mill-uji", 900, 600, "Green tencha leaves feeding into a granite stone mill", "Tencha leaves being ground into matcha on a granite stone mill in Uji", "Derjochenmeyer, CC BY-SA 4.0", "Tencha on traditional stone mill in Uji Japan.jpg"),
    I("uji-chatsumi", 900, 632, "A colour woodblock print of people picking tea at Uji", "“Tea Picking at Uji” (Uji chatsumi zu), a woodblock print by Hiroshige", "Hiroshige, public domain", "Uji Chatsumi Zu.jpg"),
    I("chiran", 900, 675, "Neat rows of tea bushes under a wide sky in Chiran, Kagoshima", "Tea fields in Chiran, Minamikyushu, Kagoshima Prefecture", "Naokijp, CC BY-SA 4.0", "Tea Plantation in Chiran 01.jpg"),
  ].map((x) => [x.key, x]),
);

export const imagesFor = (keys: string[] | undefined): CultivarImage[] => (keys ?? []).map((k) => CULTIVAR_IMAGES[k]).filter(Boolean);
