# Findings — Batch 10

1. **Tradition** — not found. Domain resolves to Good Young Co., Ltd. (goodyoung.info), a Taiwanese tea wholesaler whose retail brand "Tradition" (T世家) is sold at `https://www.goodyoung.info/en/product-category/retail/tradition/`. That page only serves lazy-loaded placeholder SVGs (no real image URL recoverable), and the site returns HTTP 403 to direct fetches. The only real logo asset found on the domain is Good Young's own corporate mark (`Goodyoung-Logo2024.svg`), which is the parent wholesaler's identity, not a distinct "Tradition" brand mark — skipped rather than substituting a mismatched logo.

2. **Tsujiki** — saved as `tsujiki.png`. Source: `https://tsujiki.jp/wp-content/uploads/2018/03/tsujiki_logo.png` (official site of 辻喜製茶 / Tsuji Kiyoharu, Uji Shirakawa tea producer — the `domain` given in the batch, yunomi.life, is just a retailer that carries their tea and has no Tsujiki logo of its own).

3. **Tsuki Matcha** — saved as `tsuki-matcha.png`. Source: `https://tsukimatcha.com` header logo (`cdn/shop/files/8_126a0d23-a914-4194-9b95-cab95960ebcb.png`, alt="Tsuki Matcha").

4. **Ujido** — saved as `ujido.png`. Source: `https://ujido.com` header logo, full-resolution wordmark asset (`cdn/shop/files/Ujido_Wordmark_Descriptor_Brandmark_LeafGreen_no_Tag.png`).

5. **Ujinotsuyu** — saved as `ujinotsuyu.png`. Source: `https://www.ujinotsuyu.co.jp/images/ujinotsuyu/common/site_logo.png` (main site logo of 宇治の露製茶株式会社).

6. **uVernal** — not found. uVernal is a private-label matcha line under Perfotek (Royal Boutique USA Inc.), sold almost exclusively through Amazon/Walmart. Perfotek's own storefront (`perfotek.us`) is currently returning HTTP 402 Payment Required (site appears to be down/suspended), `perfotek.com` failed to load, and the Amazon brand store page (`amazon.com/stores/uVernal/...`) returned HTTP 503 on every attempt. No accessible official logo asset could be retrieved.

7. **Vahdam** — saved as `vahdam.png`. Source: `https://www.vahdam.com` header logo (`cdn/shop/files/logo-website.png`).

8. **Yamamasa Koyamaen** — saved as `yamamasa-koyamaen.svg`. Source: official company site `https://www.yamamasa-koyamaen.co.jp/assets/images/common/ci.svg` (the batch's given domain, sazentea.com, is only a retailer and has no Yamamasa Koyamaen logo on its product pages — found the real official site via search and used its logo instead).

9. **Yamamotoyama** — saved as `yamamotoyama.jpg`. Source: `https://yamamotoyama.com/cdn/shop/t/19/assets/logo.jpg` (full-resolution version of the header's `logo_small.jpg`).

10. **Zenkyu** — saved as `zenkyu.png`. Source: `https://zenkyumatcha.com` header logo, full-resolution (`cdn/shop/files/zenkyu_logo_1_3c6f9993-d6cb-4d2f-84ef-46a075678389.png`).

## Summary
8 of 10 logos found and saved. 2 not found (Tradition, uVernal) — both skipped rather than substituting a mismatched or generic logo, per instructions.
