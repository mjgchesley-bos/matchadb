// No sales, traffic, or review-count data exists anywhere in this project
// to derive real brand quality from (checked: secondary_sources' "review"
// rows are third-party taste-test rankings for individual products, not a
// brand-level popularity/review-count signal; source_url hostnames mostly
// point at each brand's own site, not a real retail-distribution
// footprint) -- so, like POPULAR_BRANDS in db.ts, this is an editorial
// call, not a computed metric. Revisable; not a factual claim shown to
// visitors anywhere, just an internal sort weight.
//
// The axis is matcha-craft reputation/quality -- roughly "how would this
// producer be regarded by a serious tea drinker in Japan" -- NOT general
// consumer name recognition. Those two things diverge sharply: a mass-
// market grocery house brand (Kirkland Signature, Trader Joe's, 365) is
// something almost every US shopper would recognize, but it's private-
// label commodity matcha with no craft reputation, so it does NOT rank
// near the top here. Conversely a centuries-old Uji tea house
// (Marukyu Koyamaen, Ippodo, Kanbayashi Shunsho...) most American shoppers
// have never heard of ranks highest, because that's genuine, respected
// matcha-producing pedigree. The one thing both this axis and plain
// "recognition" agree on is the bottom: a generic-sounding reseller/
// private-label-style brand with no craft reputation AND no name
// recognition either is what reads as a risky no-name knockoff.
//
// Scale: 1-10.
//  9-10: elite, historically prestigious Japanese tea house -- multi-
//        century lineage, real ceremonial/imperial-supplier pedigree.
//  7-8:  well-established, genuinely respected Japanese producer or
//        importer with real craft/direct-sourcing reputation, OR a large
//        Japanese tea manufacturer whose scale doesn't undercut its real
//        industry standing (e.g. Aiya supplies many smaller "boutique"
//        brands their matcha).
//  5-6:  legitimate specialty brand with genuine but narrower quality
//        reputation -- either a smaller Japanese producer, or a Western
//        brand with a real direct-trade/craft focus.
//  3-4:  mass-market brand (including grocery house brands -- recognizable,
//        real, but commodity, not craft-respected) or a smaller boutique
//        DTC brand with no strong distinguishing quality reputation either
//        way.
//  1-2:  generic-sounding reseller/private-label-style brand with no real
//        quality or heritage signal found during research, or (like Aoya)
//        a brand research couldn't even independently verify exists.
export const BRAND_RECOGNITION_SCORES: Record<string, number> = {
  "365": 3,
  "Aiya": 7,
  "Blue Bottle": 5,
  "Blue Willow Tea": 3,
  "Breakaway Matcha": 6,
  "CAP Beauty": 2,
  "Cha Cha Matcha": 3,
  "Chalait": 3,
  "Chamberlain Coffee": 2,
  "Chikiriya Tea House": 6,
  "Culinary Teas": 2,
  "David's Tea": 3,
  "Distinctly Organic": 2,
  "DoMatcha": 6,
  "Dona": 2,
  "Encha": 6,
  "Epic Matcha": 3,
  "First Harvest Tea": 2,
  "Fukujuen": 8,
  "Gion Tsujiri": 7,
  "Golde": 3,
  "Green Foods": 2,
  "Greenergy Matcha": 2,
  "Grin Mood": 2,
  "Harney & Sons": 5,
  "Heapwell": 2,
  "Hekisuien": 8,
  "Horii Shichimeien": 9,
  "Hoshino Seichaen": 7,
  "Ikkyu": 6,
  "Ippodo": 9,
  "Ito En": 7,
  "Itoh Kyuemon": 6,
  "Jade Leaf Matcha": 5,
  "Jing Tea": 5,
  "Kanbayashi Shunsho": 10,
  "Kenko Tea": 2,
  "Kettl": 9,
  "Kirkland Signature": 3,
  "Kiss Me Organics": 2,
  "Kusmi Tea": 4,
  "Kyoto Dew": 4,
  "Legion": 2,
  "Leopard": 2,
  "Maeda-en": 5,
  "Mantra Matcha": 3,
  "Marukyu Koyamaen": 10,
  "Matcha Konomi": 6,
  "Matcha Moon": 2,
  "Matcha Nude": 2,
  "Matcha Outlet": 2,
  "Matcha.com": 6,
  "MatchaBar": 3,
  "MatchaDNA": 2,
  "Matchaeologist": 6,
  "Matchaful": 4,
  "Midori Spring": 3,
  "Mighty Leaf": 4,
  "Mizuba Tea Co": 7,
  "Morihan": 7,
  "My Matcha Life": 2,
  "Nakamura Tokichi": 8,
  "Naoki Matcha": 6,
  "Navitas Organics": 3,
  "Nio Teas": 5,
  "Numi Organic Tea": 4,
  "Obubu Tea Farms": 6,
  "Ocha & Co.": 5,
  "Ooika": 7,
  "Palais des Thés": 5,
  "Paragon Tea Room": 2,
  "Pique Tea": 3,
  "Rishi Tea": 6,
  "Rocky's": 7,
  "Rya": 2,
  "Sazen Tea": 4,
  "Sencha Naturals": 3,
  "Shogyokuen": 9,
  "Steven Smith Teamaker": 5,
  "Takaokaya": 5,
  "TeaDealers": 5,
  "Teapigs": 4,
  "Tenzo Tea": 4,
  "Tezumi": 7,
  "The Republic of Tea": 4,
  "The Tao of Tea": 5,
  "The Tea Spot": 3,
  "Tokyo Tea Trading": 4,
  "Trader Joe's": 3,
  "Tradition": 2,
  "Tsujiki": 6,
  "Tsuki Matcha": 2,
  "Ujido": 6,
  "Ujinotsuyu": 5,
  "uVernal": 2,
  "Vahdam": 3,
  "Yamamasa Koyamaen": 9,
  "Yamamotoyama": 6,
  "Zenkyu": 5,
};

// Any brand added to the database after this list was written falls back
// to a neutral middle score rather than sorting last (unfairly burying a
// new, possibly perfectly legitimate brand) or first (falsely implying
// vetted quality it hasn't earned).
export const DEFAULT_RECOGNITION_SCORE = 5;

export function getBrandRecognitionScore(brandName: string): number {
  return BRAND_RECOGNITION_SCORES[brandName] ?? DEFAULT_RECOGNITION_SCORE;
}
