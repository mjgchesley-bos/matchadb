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
register it in `dictionaries/index.ts`, add it to the rewrite pattern in `next.config.ts`, to the `COPY` table in `LanguageSuggest.tsx`,
and to the regular expressions in `LanguageMenu.tsx` / `config.ts` (`localePath`).

## Long-form text (guides, region/cultivar write-ups, research topics, ...)
Prose that is too long for the flat dictionaries lives in `src/i18n/content/{ja,ko,zh,es,fr,de}.ts` as `id -> translation`.
The English stays in the code that renders it: `const c = getC(lang); c("rc.uji.intro", content.intro)` returns the translation if one
exists, otherwise the English text (server components only: nothing in `content/` is sent to the browser). Templates may use
`{placeholders}`: `c("gd.matcha-for-lattes.faq.1.a", "…{median}…", { median })`. Id prefixes: `rc.` regions, `cvc.` cultivars,
`rt.` research topics, `gd.` guides, `wc.` the "what is ceremonial" explainer, `mp.` map text.

## Deliberately still English
Privacy and terms (a notice says so), text copied from brand pages (tasting notes, "Full details" fields, product and brand names),
study titles and abstracts, citation source labels, and the wholesale suppliers' own summaries and facts (they describe each
supplier's site, which is in English).
