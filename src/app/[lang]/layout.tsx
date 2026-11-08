import type { Metadata } from "next";
import { Fraunces, Manrope, Geist_Mono } from "next/font/google";
import Link from "@/i18n/Link";
import Script from "next/script";
import { GoogleAnalyticsPageView } from "./google-analytics-pageview";
import { ConsentBanner, CookieSettingsButton } from "@/components/ConsentBanner";
import { AuthProvider } from "@/components/AuthProvider";
import { HeaderAccount } from "@/components/HeaderAccount";
import { HeaderMenu } from "@/components/HeaderMenu";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { I18nProvider } from "@/i18n/client";
import { LanguageMenu } from "@/i18n/LanguageMenu";
import { LanguageSuggest } from "@/i18n/LanguageSuggest";
import { LOCALES, LOCALE_NAMES, HTML_LANG, OG_LOCALE, isLocale, localePath, type Locale } from "@/i18n/config";
import { getT, clientMessages } from "@/i18n/server";
import { notFound } from "next/navigation";
import "../globals.css";

const GA_MEASUREMENT_ID = "G-EED2DFH6L6";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Every language is built ahead of time; a language code that isn't in the list is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l: Locale = isLocale(lang) ? lang : "en";
  const t = getT(l);
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t("meta.title.default"),
      template: `%s | ${SITE_NAME}`,
    },
    description: t("meta.description"),
    openGraph: {
      siteName: SITE_NAME,
      type: "website",
      locale: OG_LOCALE[l],
      images: [{ url: "/images/hero-matcha-garden.jpg", width: 1024, height: 559 }],
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang: rawLang } = await params;
  if (!isLocale(rawLang)) notFound();
  const lang: Locale = rawLang;
  const t = getT(lang);
  return (
    <html
      lang={HTML_LANG[lang]}
      className={`${fraunces.variable} ${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              analytics_storage: 'denied',
              wait_for_update: 500
            });
            try {
              if (localStorage.getItem('matchadb-consent') === 'granted') {
                gtag('consent', 'update', {
                  ad_storage: 'granted',
                  ad_user_data: 'granted',
                  ad_personalization: 'granted',
                  analytics_storage: 'granted'
                });
              }
            } catch (e) {}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
          `}
        </Script>
        <GoogleAnalyticsPageView />
        <I18nProvider lang={lang} messages={clientMessages(lang)}>
        <AuthProvider>
        <header className="sticky top-0 z-30 bg-matcha">
          <div className="w-full px-4 sm:px-6 py-4 flex flex-wrap items-center gap-x-4 lg:gap-x-8 gap-y-3">
            <Link href="/" className="flex items-baseline group">
              <span className="font-display text-[1.4rem] font-semibold tracking-tight text-paper">MatchaDB</span>
              <span className="h-1.5 w-1.5 rounded-full bg-paper ml-0.5 mb-0.5 transition-transform group-hover:scale-125" />
            </Link>
            {/* Sign in and the menu sit together in the far top-right corner at every screen size. */}
            <div className="order-2 ml-auto flex items-center gap-2 lg:order-3 lg:shrink-0">
              <LanguageMenu />
              <HeaderAccount />
              <HeaderMenu />
            </div>
            <nav className="order-3 flex w-full flex-wrap items-center gap-2 sm:gap-3 xl:gap-4 text-[0.9rem] lg:order-2 lg:w-auto lg:min-w-0 lg:flex-1 lg:justify-start">
              <Link
                href="/map"
                className="inline-flex items-center rounded-full bg-paper text-ink px-4 sm:px-5 xl:px-6 py-2 sm:py-2.5 text-sm font-medium tracking-wide transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="sm:hidden">{t("nav.map.short")}</span>
                <span className="hidden sm:inline">{t("nav.map.long")}</span>
              </Link>
              <Link
                href="/browse"
                className="inline-flex items-center rounded-full bg-paper text-ink px-4 sm:px-5 xl:px-6 py-2 sm:py-2.5 text-sm font-medium tracking-wide transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="sm:hidden">{t("nav.search.short")}</span>
                <span className="hidden sm:inline">{t("nav.search.long")}</span>
              </Link>
              <Link
                href="/stores"
                className="hidden sm:inline-flex items-center rounded-full bg-paper text-ink px-4 sm:px-5 xl:px-6 py-2 sm:py-2.5 text-sm font-medium tracking-wide transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="lg:hidden">{t("nav.stores.short")}</span>
                <span className="hidden lg:inline">{t("nav.stores.long")}</span>
              </Link>
              <Link
                href="/cafes"
                className="inline-flex items-center rounded-full bg-paper text-ink px-4 sm:px-5 xl:px-6 py-2 sm:py-2.5 text-sm font-medium tracking-wide transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="sm:hidden">{t("nav.cafes.short")}</span>
                <span className="hidden sm:inline">{t("nav.cafes.long")}</span>
              </Link>
            </nav>
          </div>
        </header>
        <LanguageSuggest />
        {children}
        <footer className="border-t border-line bg-paper-raised mt-auto">
          <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-3 text-xs text-ink-faint">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <span>{t("footer.tagline")}</span>
              <nav aria-label={t("footer.aria")} className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
                <Link href="/cafes" className="hover:text-ink-muted transition-colors">{t("footer.cafes")}</Link>
                <Link href="/stores" className="hover:text-ink-muted transition-colors">{t("footer.stores")}</Link>
                <Link href="/guides" className="hover:text-ink-muted transition-colors">{t("footer.guides")}</Link>
                <Link href="/wholesale" className="hover:text-ink-muted transition-colors">{t("footer.wholesale")}</Link>
                <Link href="/cultivars" className="hover:text-ink-muted transition-colors">{t("footer.cultivars")}</Link>
                <Link href="/compare" className="hover:text-ink-muted transition-colors">{t("footer.compare")}</Link>
                <Link href="/regions" className="hover:text-ink-muted transition-colors">{t("footer.regions")}</Link>
                <Link href="/research" className="hover:text-ink-muted transition-colors">{t("footer.research")}</Link>
                <Link href="/about" className="hover:text-ink-muted transition-colors">{t("footer.about")}</Link>
                <Link href="/contact" className="hover:text-ink-muted transition-colors">{t("footer.contact")}</Link>
                <Link href="/privacy" className="hover:text-ink-muted transition-colors">{t("footer.privacy")}</Link>
                <Link href="/terms" className="hover:text-ink-muted transition-colors">{t("footer.terms")}</Link>
                <CookieSettingsButton />
              </nav>
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1">
              <span>{t("footer.language")}:</span>
              {LOCALES.map((l) => (
                <a key={l} href={localePath(l, "/")} lang={l} hrefLang={HTML_LANG[l]} className={`hover:text-ink-muted transition-colors ${l === lang ? "font-semibold text-ink-muted" : ""}`} aria-current={l === lang ? "true" : undefined}>
                  {LOCALE_NAMES[l]}
                </a>
              ))}
            </div>
            <p className="text-center sm:text-left text-[0.7rem] text-ink-faint/80 border-t border-line pt-3">
              {t("footer.disclaimer")}
            </p>
          </div>
        </footer>
        <ConsentBanner />
        </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
