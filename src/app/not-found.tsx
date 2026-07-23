import type { Metadata } from "next";
import Link from "next/link";

// A missing product/brand page shouldn't count against the site in search
// (noindex) but should still send visitors somewhere useful rather than a
// dead end.
export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-24">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-4">404</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink mb-3">
          We couldn&apos;t find that page
        </h1>
        <p className="text-ink-muted mb-8">
          The product or brand you&apos;re looking for may have been renamed, removed, or never
          existed at this address.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/browse"
            className="inline-flex items-center rounded-full bg-matcha text-paper px-6 py-2.5 text-sm font-medium tracking-wide transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            Search the database
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-line-strong text-ink px-6 py-2.5 text-sm font-medium tracking-wide transition-all hover:-translate-y-0.5 hover:border-matcha"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
