# Batch 5 — Brand Logo Sourcing Findings

Result: 10/10 found, 0 skipped. No fabricated, generic, or substituted logos used.

1. **Kiss Me Organics** → `kiss-me-organics.png` — us.kissmeorganics.com no longer resolves; kissmeorganics.com is now a parked domain. Recovered from Wayback Machine: https://web.archive.org/web/20220525062043/https://us.kissmeorganics.com/wp-content/themes/storefront-child/images/logo.png
2. **Kusmi Tea** → `kusmi-tea.svg` — https://www.kusmitea.com/cdn/shop/files/logo_black.svg (live header logo)
3. **Kyoto Dew** → `kyoto-dew.png` — https://static.wixstatic.com/media/75a135_02465434c14f486ab9967b40046a0be5~mv2.png (brand icon on kyotodewmatcha.net)
4. **Legion** → `legion.png` — https://legionathletics.com/wp-content/themes/legion-2017/images/2017-images/2020-legion-logos/legion-logo-2020.png (CSS background-image logo, not a plain `<img>` tag)
5. **Leopard** → `leopard.png` — domain was null in batch; web search found leopardmatcha.com but it's also dead/parked. Recovered from Wayback Machine 2018 snapshot: https://web.archive.org/web/20180804230821/http://leopardmatcha.com/wp-content/uploads/2017/09/logo-horizontal-website-negro.png
6. **Maeda-en** → `maeda-en.png` — https://maeda-en.com/cdn/shop/files/maeda-en-xl_500x.png (storefront is password-protected but the Shopify CDN asset itself is still publicly reachable; verified via Wayback snapshot showing it as the live header logo)
7. **Mantra Matcha** → `mantra-matcha.png` — https://mantramatcha.com/cdn/shop/files/MantraMatchaLogoGreen_1.png (live header logo)
8. **Marukyu Koyamaen** → `marukyu-koyamaen.jpg` — https://www.marukyu-koyamaen.co.jp/img-2019/base/international-logo.jpg (site returns HTTP 403 on some requests but the page and image both loaded)
9. **Matcha Konomi** → `matcha-konomi.png` — https://matchakonomi.com/cdn/shop/files/Untitled-2.png (live header logo)
10. **Matcha Moon** → `matcha-moon.png` — https://matchamoon.com/cdn/shop/files/MATCHAMOON_LOGO.png (live, primary brand logo)

Two brands (Kiss Me Organics, Leopard) required Wayback Machine recovery since their live domains are dead/parked -- in both cases the recovered image was verified as the brand's genuine historical logo (viewed before saving) rather than a placeholder. Maeda-en has a password-gated storefront but its CDN-hosted logo file is still directly fetchable and matches what was shown live as recently as May 2026 per Wayback.
