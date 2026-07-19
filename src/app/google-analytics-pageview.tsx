"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// gtag('config', ...) only fires once, on the very first script load -- it
// can't see subsequent client-side route changes, since App Router
// navigation never triggers a full page reload for gtag.js to detect. This
// fires an explicit page_view on every pathname/search change (including the
// first), so every route -- /browse, a product page, a brand page -- is
// actually recorded. The initial automatic pageview is disabled in the gtag
// config call (send_page_view: false) so the first page isn't double-counted.
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || typeof window.gtag !== "function") return;
    const query = searchParams?.toString();
    window.gtag("event", "page_view", {
      page_path: query ? `${pathname}?${query}` : pathname,
    });
  }, [pathname, searchParams]);

  return null;
}

export function GoogleAnalyticsPageView() {
  return (
    <Suspense fallback={null}>
      <PageViewTracker />
    </Suspense>
  );
}
