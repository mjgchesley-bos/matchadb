"""Rebuilds the sourcing-region outlines and the small map pictures shown on product and region pages.

    python scripts/build-regions.py boundaries    # public/region-boundaries/*.geojson (also used by the /map page)
    python scripts/build-regions.py thumbnails    # public/region-thumbnails/*.png
    python scripts/build-regions.py all

Why this replaces build-region-boundaries.mjs and build-region-thumbnails.mjs: those simplified every outline twice
without keeping shapes valid (so Kagoshima turned into two triangles and Kyoto's wards crossed each other), and the
picture builder then squeezed the outline into a map URL, which forced even coarser shapes. Here the shapes are merged
properly (city wards become one outline), tiny islands are dropped, corners are rounded, and the outline is drawn onto
a plain background map by this script, so it is not limited by URL length.

Sources (public, not fabricated): municipality boundaries from niiyz/JapanCityGeoJson (MLIT National Land Numerical
Information N03), prefecture boundaries from dataofjapan/land, country boundaries from datasets/geo-countries.
Zhejiang and Jeju are kept from the existing files (already valid). Farm parcel outlines are never drawn: no public
registry publishes them.

Needs: pip install shapely pillow; NEXT_PUBLIC_MAPBOX_TOKEN in .env.local (the same public token the /map page uses).
"""
import io, json, math, os, sys, urllib.request
from shapely.geometry import shape, mapping, Polygon, MultiPolygon
from shapely.ops import unary_union
from shapely.validation import make_valid
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
BOUNDS_DIR = os.path.join(ROOT, "public", "region-boundaries")
THUMBS_DIR = os.path.join(ROOT, "public", "region-thumbnails")
CACHE = os.path.join(os.environ.get("TEMP", "/tmp"), "matchadb-region-src")
os.makedirs(CACHE, exist_ok=True)
os.makedirs(BOUNDS_DIR, exist_ok=True)
os.makedirs(THUMBS_DIR, exist_ok=True)

NIIYZ = "https://raw.githubusercontent.com/niiyz/JapanCityGeoJson/master/geojson"
# region -> JIS municipality codes (several codes = the wards of one city, merged into one outline)
MUNICIPALITIES = {
    "Uji": ["26/26204"], "Shirakawa": ["26/26204"],  # Shirakawa is a part of Uji, not its own municipality
    "Nishio": ["23/23213"], "Wazuka": ["26/26365"], "Nara": ["29/29201"], "Yame": ["40/40210"],
    "Miyazaki": ["45/45201"], "Kagoshima": ["46/46201"], "Sonogi": ["42/42321"],
    "Kyoto": [f"26/{26100 + i}" for i in range(1, 12)],
    "Shizuoka": [f"22/{22100 + i}" for i in (1, 2, 3)],
    "farm-hattori-kikugawa": ["22/22224"],
}

# mirrors REGION_COORDINATES in src/lib/regions.ts
REGIONS = {
    "Uji": (34.8845, 135.7997, "town"), "Kyoto": (35.0116, 135.7681, "town"), "Kagoshima": (31.5966, 130.5571, "town"),
    "Shizuoka": (34.9756, 138.3827, "town"), "Nishio": (34.8564, 137.0466, "town"), "Yame": (33.2038, 130.5586, "town"),
    "Wazuka": (34.7967, 135.9328, "town"), "Shirakawa": (34.8725, 135.8167, "town"), "Nara": (34.6851, 135.8048, "town"),
    "Aichi": (35.1802, 136.9066, "town"), "Kyushu": (32.7503, 130.75, "town"), "Sonogi": (33.0369, 129.9172, "town"),
    "Miyazaki": (31.9111, 131.4239, "town"), "Zhejiang": (30.2937, 120.1614, "province"), "Jeju": (33.5097, 126.5219, "province"),
    "China": (30.2741, 120.1551, "country"), "Korea": (35.0667, 127.75, "country"), "Taiwan": (23.912, 120.686, "country"),
}
MARKER_ZOOM = {"town": 9, "province": 5.5, "country": 3.5}


def fetch(url, name):
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        req = urllib.request.Request(url, headers={"User-Agent": "matchadb-build/1.0"})
        with open(path, "wb") as f:
            f.write(urllib.request.urlopen(req, timeout=240).read())
    return json.load(open(path, encoding="utf-8"))


def geom_of(data):
    g = data["features"][0]["geometry"] if "features" in data else data["geometry"]
    return make_valid(shape(g))


def polygons(g):
    if g.geom_type == "Polygon":
        return [g]
    return [p for x in getattr(g, "geoms", []) for p in polygons(x)]


def clean(g, keep_share=0.004):
    """One valid, smooth outline: merge pieces, drop specks, round corners, simplify without crossing."""
    g = unary_union([make_valid(g).buffer(0)])
    polys = polygons(g)
    total = sum(p.area for p in polys)
    polys = [p for p in polys if p.area >= total * keep_share]  # islands under 0.4% of the area are dropped
    # holes (enclaves) under 0.5% of the area are filled
    polys = [Polygon(p.exterior, [h for h in p.interiors if Polygon(h).area >= total * 0.005]) for p in polys]
    g = unary_union(polys)
    minx, miny, maxx, maxy = g.bounds
    diag = math.hypot(maxx - minx, maxy - miny)
    r = diag * 0.006
    g = g.buffer(r, join_style=1).buffer(-2 * r, join_style=1).buffer(r, join_style=1)  # round both kinds of corner
    g = g.simplify(diag * 0.0015, preserve_topology=True)
    return make_valid(g)


def round_coords(c, n=5):
    return [round(c[0], n), round(c[1], n)] if isinstance(c[0], (int, float)) else [round_coords(x, n) for x in c]


def write_boundary(key, g):
    m = mapping(g)
    feature = {"type": "Feature", "properties": {"name": key}, "geometry": {"type": m["type"], "coordinates": round_coords(m["coordinates"])}}
    p = os.path.join(BOUNDS_DIR, f"{key}.geojson")
    with open(p, "w", encoding="utf-8") as f:
        json.dump(feature, f, separators=(",", ":"))
    print(f"  {key}: {g.geom_type}, {len(polygons(g))} piece(s), {os.path.getsize(p) / 1024:.1f} KB, valid={g.is_valid}")


def build_boundaries():
    for key, codes in MUNICIPALITIES.items():
        parts = [geom_of(fetch(f"{NIIYZ}/{c}.json", c.replace("/", "_") + ".json")) for c in codes]
        write_boundary(key, clean(unary_union(parts)))
    japan = fetch("https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson", "japan.geojson")
    aichi = next(f for f in japan["features"] if f["properties"].get("id") == 23)
    write_boundary("Aichi", clean(make_valid(shape(aichi["geometry"]))))
    countries = fetch("https://raw.githubusercontent.com/datasets/geo-countries/main/data/countries.geojson", "countries.geojson")
    tw = next(f for f in countries["features"] if f["properties"].get("name") in ("Taiwan", "Taiwan, Province of China") or f["properties"].get("ADMIN") == "Taiwan")
    write_boundary("Taiwan", clean(make_valid(shape(tw["geometry"])), keep_share=0.01))
    for key in ("Zhejiang", "Jeju", "farm-isagawa-tenryu"):  # existing files were valid; re-run through the same smoothing
        p = os.path.join(BOUNDS_DIR, f"{key}.geojson")
        write_boundary(key, clean(make_valid(shape(json.load(open(p, encoding="utf-8"))["geometry"])), keep_share=0.01))


# ---- thumbnails ----
W, H, SCALE, SS = 480, 300, 2, 3  # logical size, @2x output, 3x supersampling for smooth edges
GREEN, GREEN_DARK = (60, 122, 42), (38, 84, 28)


def token():
    for line in open(os.path.join(ROOT, ".env.local"), encoding="utf-8"):
        if line.startswith("NEXT_PUBLIC_MAPBOX_TOKEN="):
            return line.split("=", 1)[1].strip().strip('"')
    raise SystemExit("NEXT_PUBLIC_MAPBOX_TOKEN not found in .env.local")


def merc(lat):
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def render(key, tok):
    lat, lng, prec = REGIONS[key]
    bpath = os.path.join(BOUNDS_DIR, f"{key}.geojson")
    g = shape(json.load(open(bpath, encoding="utf-8"))["geometry"]) if os.path.exists(bpath) else None
    if g is not None:
        minx, miny, maxx, maxy = g.bounds
        fx = (maxx - minx) / 360
        fy = (merc(maxy) - merc(miny)) / (2 * math.pi)
        z = min(math.log2(W * 0.78 / (512 * fx)), math.log2(H * 0.74 / (512 * fy)), 11.5)
        clng = (minx + maxx) / 2
        cm = (merc(miny) + merc(maxy)) / 2
        clat = math.degrees(math.atan(math.sinh(cm)))
    else:
        z, clng, clat = MARKER_ZOOM[prec], lng, lat
    url = f"https://api.mapbox.com/styles/v1/mapbox/light-v11/static/{clng:.5f},{clat:.5f},{z:.3f},0/{W}x{H}@2x?access_token={tok}"
    base = Image.open(io.BytesIO(urllib.request.urlopen(url, timeout=90).read())).convert("RGBA")
    out_w, out_h = base.size
    world = 512 * 2 ** z * SCALE  # world width in output pixels

    def px(lo, la):
        return (out_w / 2 + (lo - clng) / 360 * world, out_h / 2 - (merc(la) - merc(clat)) / (2 * math.pi) * world)

    layer = Image.new("RGBA", (out_w * SS, out_h * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    s = SS  # drawing scale on top of the @2x pixels

    def pts(ring):
        return [(x * s, y * s) for x, y in (px(lo, la) for lo, la in ring.coords)]

    if g is not None:
        for poly in polygons(g):
            outer = pts(poly.exterior)
            d.polygon(outer, fill=GREEN + (46,))
            for hole in poly.interiors:
                d.polygon(pts(hole), fill=(0, 0, 0, 0))
        for poly in polygons(g):
            for ring in [poly.exterior, *poly.interiors]:
                line = pts(ring)
                d.line(line + [line[0]], fill=(255, 255, 255, 200), width=int(7 * SCALE * s), joint="curve")  # soft white casing
        for poly in polygons(g):
            for ring in [poly.exterior, *poly.interiors]:
                line = pts(ring)
                d.line(line + [line[0]], fill=GREEN_DARK + (255,), width=int(2.6 * SCALE * s), joint="curve")
    mx, my = px(lng, lat)
    if g is None:  # no outline for this region: a soft halo shows it is an area, not a point
        for rad, a in ((40, 28), (24, 44)):
            r = rad * SCALE * s
            d.ellipse([mx * s - r, my * s - r, mx * s + r, my * s + r], fill=GREEN + (a,), outline=GREEN + (120,), width=int(1.5 * SCALE * s))
    for rad, col in ((7.5, (255, 255, 255, 255)), (5.0, GREEN_DARK + (255,))):
        r = rad * SCALE * s
        d.ellipse([mx * s - r, my * s - r, mx * s + r, my * s + r], fill=col)
    layer = layer.resize((out_w, out_h), Image.LANCZOS)
    img = Image.alpha_composite(base, layer).convert("RGB")
    p = os.path.join(THUMBS_DIR, f"{key}.png")
    img.save(p, "PNG", optimize=True)
    print(f"  {key}: {'outline' if g is not None else 'marker only'}, zoom {z:.1f}, {os.path.getsize(p) / 1024:.0f} KB")


def build_thumbnails():
    tok = token()
    for key in REGIONS:
        render(key, tok)


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    if what in ("boundaries", "all"):
        print("boundaries:")
        build_boundaries()
    if what in ("thumbnails", "all"):
        print("thumbnails:")
        build_thumbnails()
