// Pictures from past editions of events, sourced from Wikimedia Commons (public domain or openly licensed). Credit and licence show under each
// picture. Most events have none we are allowed to use; members and organizers can add theirs on the event's page.
export type EventPicture = { src: string; w: number; h: number; alt: string; caption: string; credit: string; page: string };

export const EVENT_PICTURES: Record<string, EventPicture[]> = {
  "uji-tea-festival-2027": [
    { src: "/images/events/uji-festival-2.jpg", w: 960, h: 720, alt: "A procession carrying water at the Uji Tea Festival", caption: "The water-carrying procession (Omizu-hakobi) at a past Uji Tea Festival", credit: "おいでやす千年の都, CC0", page: "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent("宇治茶まつり 06.jpg") },
    { src: "/images/events/uji-festival-3.jpg", w: 960, h: 720, alt: "A procession carrying tea leaves at the Uji Tea Festival", caption: "The tea-leaf procession at a past Uji Tea Festival", credit: "おいでやす千年の都, CC0", page: "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent("宇治茶まつり 07.jpg") },
  ],
};
