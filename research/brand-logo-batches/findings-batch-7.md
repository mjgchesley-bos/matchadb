# Batch 7 — Brand Logo Findings

1. **Morihan** — saved as `morihan.png` — source: https://gigaplus.makeshop.jp/morihan1836/assets/logo_main.png (header logo, alt "森半tea＆coffee", from https://tea-and-coffee.shop)

2. **My Matcha Life** — saved as `my-matcha-life.jpg` — source: https://shop.mymatchalife.com/cdn/shop/files/logo.jpg?v=1711991187&width=600 (header logo from https://shop.mymatchalife.com)

3. **Nakamura Tokichi** — saved as `nakamura-tokichi.svg` — source: https://global.tokichi.jp/cdn/shop/files/logo_webheader.svg?v=1772156835&width=1200 (header logo, alt "NAKAMURA TOKICHI HONTEN ONLINE STORE", from https://global.tokichi.jp)

4. **Naoki Matcha** — saved as `naoki-matcha.png` — source: https://naokimatcha.com/cdn/shop/files/shpfy_naoki_logo.png?v=1706430908&width=611 (header logo from https://naokimatcha.com)

5. **Navitas Organics** — saved as `navitas-organics.png` — source: https://navitasorganics.com/cdn/shop/files/Primary_Logo_2x_4afaaf6a-06cd-4acd-b9db-c6119202fdfe.png (no plain <img class="logo"> tag found in static HTML — header is JS-rendered — but this "Primary_Logo" asset is served from the brand's own Shopify CDN and is used site-wide as the og:image/social-share logo, confirming it is their real primary logo file, from https://navitasorganics.com)

6. **Nio Teas** — saved as `nio-teas.png` — source: https://nioteas.com/cdn/shop/files/nio_teas_logo.png?v=1746017718 (header logo, alt "Nio Teas", from https://nioteas.com)

7. **Numi Organic Tea** — saved as `numi-organic-tea.svg` — source: https://numitea.com/cdn/shop/files/numi-horizontal-logo-black-web.svg?v=1709146344&width=320 (header logo SVG, alt "Numi Tea Logo", from https://numitea.com)

8. **Obubu Tea Farms** — saved as `obubu-tea-farms.jpg` — source: https://obubutea.com/wp-content/uploads/2015/06/cropped-kyoto-obubu-tea-farms-logo-white-background-293x97.jpg (header logo, alt "Kyoto Obubu Tea Farms", from https://obubutea.com)

9. **Ocha & Co.** — saved as `ocha-and-co.png` — source: https://www.ochaandco.com/cdn/shop/files/Ocha_Co_Color_Logo_Transparent_300x_c6440a1e-1946-4b4f-84bd-608a4d5a4f90.png?v=1753887803&width=300 (color transparent logo from https://www.ochaandco.com; site also has an SVG variant "Logo_SVG_Border_Name.svg" but it is white-fill only, so the color PNG was used instead for visibility on light backgrounds)

10. **Ooika** — saved as `ooika.webp` — source: https://images.squarespace-cdn.com/content/v1/5ebb596b6bb4de0f008e7352/667cc1dd-173c-4c43-9173-ac966be94a01/Ooika-Mill-Mark-BG.png?format=1500w (header/footer "mill mark" logo, alt "Ooika (覆い香)", from https://ooika.co — Squarespace CDN served this as WEBP despite the .png-looking URL, so it was saved with the correct .webp extension)

## Summary
10 of 10 brands found and saved. No skips this batch.

Note: all files were verified after download by inspecting binary headers (PNG/JPEG/SVG/WEBP magic bytes) to confirm genuine image assets rather than HTML error pages. Direct curl download was used instead of AI-summarized WebFetch extraction for SVGs, since the summarizer was truncating/paraphrasing complex multi-path SVGs (e.g. Nakamura Tokichi's 42-path logo, Numi's masked path) rather than returning exact byte-for-byte content.
