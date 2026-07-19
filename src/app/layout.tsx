import type { Metadata } from "next";
import { Fraunces, Manrope, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "MatchaDB",
  description: "A research database and comparison tool for matcha products.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
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
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <header className="sticky top-0 z-30 bg-matcha">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-baseline gap-1.5 group">
              <span className="font-display text-[1.4rem] font-semibold tracking-tight text-paper">
                Matcha
              </span>
              <span className="font-display text-[1.4rem] font-semibold tracking-tight text-paper">
                DB
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-paper ml-0.5 mb-0.5 transition-transform group-hover:scale-125" />
            </Link>
            <nav className="flex items-center gap-8 text-[0.9rem]">
              <Link
                href="/browse"
                className="text-paper/80 hover:text-paper transition-colors"
              >
                Browse the catalog
              </Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="border-t border-line bg-paper-raised mt-auto">
          <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-faint">
            <span>MatchaDB &mdash; sourcing, pricing, and transparency data pulled directly from brand product pages.</span>
            <span className="font-mono">Research build</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
