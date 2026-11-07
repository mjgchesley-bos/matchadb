# Translations (i18n)

The site is available in English (default, plain URLs like `/browse`) and Japanese, Korean, Simplified Chinese,
Spanish, French and German (`/ja/browse`, `/ko/...`, `/zh/...`, `/es/...`, `/fr/...`, `/de/...`).

## How it works
- All pages live under `src/app/[lang]/`. `next.config.ts` rewrites an unprefixed URL to `/en/...` (and redirects `/en/...` back),
  so English URLs never changed. Every language is prerendered at build time (`generateStaticParams` in `[lang]/layout.tsx`).
- Strings live in `src/i18n/dictionaries/{en,ja,ko,zh,es,fr,de}.ts`: flat dotted keys. `en.ts` is the source; its keys define the
  type `Key`. Any key missing from another language falls back to English, so an unfinished language never shows blanks.
- Server components: `const t = getT(lang)`; `t("nav.map.long")`, `t("list.showing.other", { shown, total })`.
- Client components: `const t = useT()` with keys that start with `c.` (only `c.` and `v.` keys are sent to the browser).
- Values that come from the database (grade, flavor, use, region): `tv("flavor", "Umami")` / `useTV()`; keys are `v.<group>.<value>`.
- Links: import `Link` from `@/i18n/Link` (it keeps the visitor's language). Plain `<a href="/...">` does not, so avoid it for internal links.
- A sentence with a link inside: `rich(t("key", { link: "{link}" }), { link: <a>…</a> })` (see `src/i18n/rich.tsx`).
- Plurals: two keys, `...one` and `...other`, chosen in code (`t(n === 1 ? "x.one" : "x.other")`).
- Page metadata: use `generateMetadata` with `pageAlternates(lang, "/path")` (canonical + hreflang). Sitemap entries for translated pages are in `src/app/sitemap.ts`.
- Dates, numbers and country names use `Intl` with `INTL_LANG[lang]` (see `fmtNum`, `countryName`).

## Adding a page's text
1. Add English keys to `en.ts`. 2. Add the same keys to each language file (the same `{placeholders}`). 3. Use `getT(lang)` in the page.

## Adding a language
Add the code to `LOCALES`, `LOCALE_NAMES`, `HTML_LANG`, `INTL_LANG`, `OG_LOCALE` in `config.ts`, create `dictionaries/<code>.ts`,
register it in `dictionaries/index.ts`, add it to the rewrite pattern in `next.config.ts`, to the `LANG` copy in `LanguageSuggest.tsx`,
and to the regular expressions in `LanguageMenu.tsx` / `config.ts` (`localePath`).

## Not translated yet
Guides, research library text, cultivar / region / compare / wholesale pages, product and brand pages, the account page and the
sourcing-map panel are still English (their navigation and cards are translated). Privacy and terms stay English on purpose.
