# Batch 8 Logo Findings

1. **Palais des Thes** - saved `palais-des-thes.svg` - source: https://us.palaisdesthes.com/static/version1783754315/frontend/Palmag/default/en_US/images/logo.svg (header logo, alt="Palais des Thes"). Note: this SVG is solid white fill only (fill="white" on all paths) - it's the real mark but was designed for a dark header background, so it will be invisible over a white page background unless the site applies a dark backdrop or a CSS filter.

2. **Paragon Tea Room** - saved `paragon-tea-room.png` (480x480) - source: https://paragontearoom.com/cdn/shop/files/Logo_-_Transparent_Background_Copper_Line.png (header logo, alt="Paragon Tea Room").

3. **Pique Tea** - saved `pique-tea.png` (172x40 - this is the native/max resolution available; requesting larger widths returned the same file) - source: https://www.piquelife.com/cdn/shop/files/Brand-logo.png (header logo).

4. **Rishi Tea** - not found. The header on rishi-tea.com renders the brand name as styled text/CSS, not an image or inline SVG asset - checked homepage, a collections page, and the dedicated press page (which only hosts third-party publication logos like Forbes/Food & Wine, not Rishi's own mark). No favicon.ico or apple-touch-icon.png exists at the domain root either (both 404). Web search turned up no directly-hosted logo file on their own domain. Skipped rather than substitute a third-party or fan-made version.

5. **Rocky's** - saved `rocky-s.png` (800x131) - source: https://www.rockysmatcha.com/cdn/shop/files/Rm-Blue-Header.png (header logo).

6. **Rya** - saved `rya.svg` - source: https://ujichamatcha.com/cdn/shop/files/Logo-white.svg (site header logo, alt="Ujicha Matcha"). Note: "Rya" is a curated matcha line sold exclusively on ujichamatcha.com and has no separate brand mark of its own - confirmed by checking the /collections/rya page, which uses the same Ujicha Matcha header logo throughout. This is genuinely the correct/only logo for this listing, not a substitution.

7. **Sazen Tea** - saved `sazen-tea.ico`, but flagging as low quality - source: https://www.sazentea.com/favicon.ico. This is a real, official asset (16x16 favicon), but it's the only logo-type asset that exists on their domain - the site header itself is text-based, apple-touch-icon.png 404s, and no site.webmanifest/manifest.json with larger icons exists. At 16x16 it is quite small for clean identification use; recommend treating this one as a placeholder-quality result and revisiting if a better source turns up later (e.g. a press kit).

8. **Sencha Naturals** - saved `sencha-naturals.png` - source: https://senchanaturals.com/cdn/shop/files/LOGO-Est2001.png (header logo).

9. **Shogyokuen** - saved `shogyokuen.png` (520x144) - source: https://shogyokuen.co.jp/wp-content/themes/shogyokuen/images/cmn/logo.png. Note: the batch's given domain (kettl.co) is a US retailer that carries Shogyokuen's matcha (via tea master Hiroshi Kobayashi) but doesn't display a Shogyokuen-specific logo on its own site. Found and used the actual producer's official site instead (Shogyokuen Seicha Co., Ltd., shogyokuen.co.jp), which is the real brand's own logo.

10. **Steven Smith Teamaker** - saved `steven-smith-teamaker.svg` - source: https://www.smithtea.com/cdn/shop/files/Logo.svg (header logo, alt="Smith Teamaker").

## Summary
- Found and saved: 9 / 10 (Palais des Thes, Paragon Tea Room, Pique Tea, Rocky's, Rya, Sazen Tea, Sencha Naturals, Shogyokuen, Steven Smith Teamaker)
- Not found: 1 / 10 (Rishi Tea - no logo image asset exists on their official site; text-based header, no favicon)
- Flagged for quality follow-up: Sazen Tea (16x16 favicon only) and Palais des Thes (white-only SVG, needs dark background/CSS handling)
