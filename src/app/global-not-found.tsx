import "./globals.css";
import type { Metadata } from "next";

// Shown for URLs that match no page at all. (A missing product or brand inside a language uses [lang]/not-found.tsx.)
export const metadata: Metadata = {
  title: "Page Not Found | MatchaDB",
  robots: { index: false, follow: true },
};

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col">
        <main className="flex-1 flex items-center justify-center px-6 py-24">
          <div className="max-w-md text-center">
            <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-4">404</p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink mb-3">We couldn&apos;t find that page</h1>
            <p className="text-ink-muted mb-8">The page you&apos;re looking for may have been renamed, removed, or never existed at this address.</p>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- this page has no router context */}
            <a href="/" className="inline-flex items-center rounded-full bg-matcha text-paper px-6 py-2.5 text-sm font-medium tracking-wide">
              MatchaDB
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
