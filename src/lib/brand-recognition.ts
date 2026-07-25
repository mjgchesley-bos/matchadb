// No sales, traffic, or review-count data exists anywhere in this project
// to derive real brand popularity from (checked: secondary_sources'
// "review" rows are third-party taste-test rankings, not popularity/review-
// count signals; source_url hostnames mostly point at each brand's own
// site, not a real retail-distribution footprint) -- so, like
// POPULAR_BRANDS in db.ts, this is an editorial call, not a computed
// metric. Revisable; not a factual claim shown to visitors anywhere, just
// an internal sort weight.
//
// The goal per the site owner: don't let a shopper land on /browse and see
// an unfamiliar, generic-sounding reseller brand before either (a) a
// mainstream retail name they'd recognize, or (b) a real, reputable
// specialty/heritage tea house -- both of those are "safe," only a brand
// with neither signal reads as a risky no-name knockoff.
//
// Scale: 1-10.
//  9-10: extremely widely recognized mainstream retail/grocery name.
//  7-8:  strong mainstream DTC/retail presence, OR a famous, historic
//        specialty tea house whose name matcha drinkers would recognize
//        even if a general grocery shopper wouldn't.
//  5-6:  legitimate, real specialty/heritage brand with a genuine but
//        narrower reputation (tea-enthusiast circles, not mainstream).
//  3-4:  smaller boutique/DTC brand, real but no strong distinguishing
//        reputation either way.
//  1-2:  generic-sounding reseller/private-label-style brand with no
//        real quality or heritage signal found during research, or (like
//        Aoya) a brand research couldn't even independently verify exists.
export const BRAND_RECOGNITION_SCORES: Record<string, number> = {
  "365": 9,
  "Aiya": 9,
  "Aoya": 1,
  "Blue Bottle": 9,
  "Blue Willow Tea": 4,
  "Breakaway Matcha": 5,
  "CAP Beauty": 6,
  "Cha Cha Matcha": 6,
  "Chalait": 4,
  "Chamberlain Coffee": 8,
  "Chikiriya Tea House": 5,
  "Culinary Teas": 3,
  "David's Tea": 8,
  "Distinctly Organic": 2,
  "DoMatcha": 8,
  "Dona": 3,
  "Encha": 7,
  "Epic Matcha": 4,
  "First Harvest Tea": 2,
  "Fukujuen": 6,
  "Gion Tsujiri": 7,
  "Golde": 7,
  "Green Foods": 3,
  "Greenergy Matcha": 2,
  "Grin Mood": 2,
  "Harney & Sons": 8,
  "Heapwell": 2,
  "Hekisuien": 5,
  "Horii Shichimeien": 5,
  "Hoshino Seichaen": 5,
  "Ikkyu": 3,
  "Ippodo": 8,
  "Ito En": 8,
  "Itoh Kyuemon": 5,
  "Jade Leaf Matcha": 8,
  "Jing Tea": 5,
  "Kanbayashi Shunsho": 6,
  "Kenko Tea": 3,
  "Kettl": 6,
  "Kirkland Signature": 10,
  "Kiss Me Organics": 5,
  "Kusmi Tea": 6,
  "Kyoto Dew": 3,
  "Legion": 2,
  "Leopard": 2,
  "Maeda-en": 5,
  "Mantra Matcha": 4,
  "Marukyu Koyamaen": 7,
  "Matcha Konomi": 4,
  "Matcha Moon": 3,
  "Matcha Nude": 3,
  "Matcha Outlet": 2,
  "Matcha.com": 7,
  "MatchaBar": 6,
  "MatchaDNA": 3,
  "Matchaeologist": 5,
  "Matchaful": 5,
  "Midori Spring": 4,
  "Mighty Leaf": 7,
  "Mizuba Tea Co": 5,
  "Morihan": 5,
  "My Matcha Life": 3,
  "Nakamura Tokichi": 6,
  "Naoki Matcha": 5,
  "Navitas Organics": 7,
  "Nio Teas": 3,
  "Numi Organic Tea": 8,
  "Obubu Tea Farms": 5,
  "Ocha & Co.": 4,
  "Ooika": 3,
  "Palais des Thés": 6,
  "Paragon Tea Room": 3,
  "Pique Tea": 6,
  "Rishi Tea": 8,
  "Rocky's": 4,
  "Rya": 3,
  "Sazen Tea": 4,
  "Sencha Naturals": 4,
  "Shogyokuen": 5,
  "Steven Smith Teamaker": 6,
  "Takaokaya": 4,
  "TeaDealers": 3,
  "Teapigs": 7,
  "Tenzo Tea": 5,
  "Tezumi": 5,
  "The Republic of Tea": 8,
  "The Tao of Tea": 5,
  "The Tea Spot": 4,
  "Tokyo Tea Trading": 3,
  "Trader Joe's": 10,
  "Tradition": 2,
  "Tsujiki": 3,
  "Tsuki Matcha": 3,
  "Ujido": 5,
  "Ujinotsuyu": 4,
  "uVernal": 2,
  "Vahdam": 6,
  "Yamamasa Koyamaen": 5,
  "Yamamotoyama": 6,
  "Zenkyu": 4,
};

// Any brand added to the database after this list was written falls back
// to a neutral middle score rather than sorting last (unfairly burying a
// new, possibly perfectly legitimate brand) or first (falsely implying
// vetted recognition it hasn't earned).
export const DEFAULT_RECOGNITION_SCORE = 5;

export function getBrandRecognitionScore(brandName: string): number {
  return BRAND_RECOGNITION_SCORES[brandName] ?? DEFAULT_RECOGNITION_SCORE;
}
