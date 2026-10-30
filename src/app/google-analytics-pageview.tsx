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

// Where a visitor goes after leaving MatchaDB is the closest thing the site has to a
// conversion, so outbound clicks are recorded as events: amazon_click (an Amazon page),
// directions_click (store directions) and outbound_click (any other external link, e.g. a
// brand's shop or a store website). One delegated listener covers every link on every page,
// including ones added later. Events carry only the destination host and path (no query
// string), the page type and the link text, and follow the same consent settings as page views.
const INTERNAL_HOSTS = new Set(["matchadb.com", "www.matchadb.com"]);

function classify(url: URL): "amazon_click" | "directions_click" | "outbound_click" {
  const host = url.hostname.replace(/^www\./, "");
  if (/(^|\.)amazon\.[a-z.]+$/.test(host) || host === "amzn.to" || host === "a.co") return "amazon_click";
  if (host === "google.com" && url.pathname.startsWith("/maps/dir")) return "directions_click";
  return "outbound_click";
}

function OutboundClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button > 1 || typeof window.gtag !== "function") return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (!/^https?:$/.test(url.protocol) || INTERNAL_HOSTS.has(url.hostname) || url.hostname === window.location.hostname) return;
      window.gtag("event", classify(url), {
        link_domain: url.hostname.replace(/^www\./, ""),
        link_url: url.hostname + url.pathname.slice(0, 100),
        link_text: (a.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60),
        page_type: window.location.pathname.split("/")[1] || "home",
        page_path: window.location.pathname,
        transport_type: "beacon",
      });
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, []);
  return null;
}

export function GoogleAnalyticsPageView() {
  return (
    <>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      <OutboundClickTracker />
    </>
  );
}
