# Batch 4 Logo Findings

1. **Ikkyu** -- saved `ikkyu.png` -- source: https://shop.ikkyu-tea.com/cdn/shop/files/logo_losange_letters2.png (header logo, from batch domain shop.ikkyu-tea.com)

2. **Ippodo** -- saved `ippodo.svg` -- source: inline header wordmark SVG on https://ippodotea.com (extracted from live DOM; original uses a CSS variable for fill, recolored from the site's dynamic white/black to solid black #000000 for legibility -- same authentic vector artwork, no shapes altered)

3. **Ito En** -- saved `ito-en.png` -- source: https://itoen.com/cdn/shop/files/logo.png (header logo)

4. **Itoh Kyuemon** -- saved `itoh-kyuemon.png` -- source: https://www.itohkyuemon.co.jp/site/assets/images/common/header/logo_kyoto.png. NOTE: the batch-supplied domain (ujichamatcha.com) turned out to be an unrelated multi-brand Uji tea retailer that does not mention Itoh Kyuemon anywhere on its site -- it sells Yamamasa Koyamaen, Marukyu Koyamaen, Hekisuien, and other brands, not Itoh Kyuemon. I located and used Itoh Kyuemon's actual official site (itohkyuemon.co.jp, 伊藤久右衛門) instead.

5. **Jade Leaf Matcha** -- saved `jade-leaf-matcha.svg` -- source: inline header logo SVG on https://www.jadeleafmatcha.com (extracted from live DOM, colors unchanged -- teal #00665E / green #00B28B, already brand-correct as authored)

6. **Jing Tea** -- saved `jing-tea.svg` -- source: inline header logo SVG (stacked "JING" wordmark with mountain glyph) on https://jingtea.com (extracted from live DOM; original fill was white for the dark hero background, recolored to #1a1a1a for legibility -- same authentic vector artwork, no shapes altered). Note: this is an unusually large/complex SVG (~155KB, 212 paths) as authored by the site -- kept as-is rather than simplified.

7. **Kanbayashi Shunsho** -- saved `kanbayashi-shunsho.png` -- source: https://www.shunsho.co.jp/img/common/logo.png (header logo, reads "創業450年 上林春松本店"). NOTE: the batch-supplied domain (sazentea.com) is Sazen Tea, a Kyoto-based multi-brand retailer that sells Kanbayashi Shunsho tea alongside Marukyu Koyamaen, Hekisuien, and others -- not Kanbayashi Shunsho's own site. I located and used Kanbayashi Shunsho's actual official site (shunsho.co.jp) instead.

8. **Kenko Tea** -- saved `kenko-tea.png` -- source: https://kenkomatcha.com/cdn/shop/files/kenko-white-bg_410x.png (header logo, from batch domain kenkomatcha.com)

9. **Kettl** -- saved `kettl.svg` -- source: inline header logo SVG on https://kettl.co (extracted from live DOM; original used currentColor for the "kettl" wordmark, recolored to #1a1a1a for legibility on a white background -- the three orange accent dots #DD6444 are unchanged/original)

10. **Kirkland Signature** -- saved `kirkland-signature.svg` -- source: could not find a dedicated Kirkland Signature logo asset on the batch-supplied domain (costcobusinessdelivery.com) or on costco.com (blocked by bot/Akamai protection, which I did not attempt to bypass). Used the Kirkland Signature logo file hosted on Wikimedia Commons (https://upload.wikimedia.org/wikipedia/commons/9/9f/Kirkland_Signature_logo.svg), which is documented there as authored by Costco Wholesale Corporation and originally sourced from Costco's own asset server (m.costco.com) for a 2013 Kirkland Signature brochure -- i.e. it is Costco's own official trademark file, not a third-party recreation. Stripped an unrelated hidden print-production metadata layer that was outside the visible canvas; the visible red/black/white "Kirkland Signature" scroll logo itself is untouched.

## Summary
10 of 10 brands found and saved. Two of the batch's supplied domains (Itoh Kyuemon -> ujichamatcha.com, and Kanbayashi Shunsho -> sazentea.com) turned out to be unrelated multi-brand retailers rather than the brand's own site; in both cases I identified and used the actual official brand domain instead. No logos were fabricated, generated, or substituted with placeholders -- every file is a real asset pulled from an official or brand-authored source.
