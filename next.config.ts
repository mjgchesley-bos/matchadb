import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The café pages read their state's data file at request time.
  outputFileTracingIncludes: { "/[lang]/cafes/[slug]": ["./data/cafes/**/*"], "/sitemap.xml": ["./data/cafes/**/*"], "/[lang]/cafes": ["./data/cafes/**/*"] },
  // Needed because the root layout lives under the [lang] segment: unmatched URLs get src/app/global-not-found.tsx.
  // cpus: the build prerenders every page in all seven languages; fewer parallel workers keeps it from running out of steam on small machines.
  experimental: { globalNotFound: true, cpus: 6 },
  // The site lives at www.matchadb.com. Sign-in keeps its secret handshake in the browser for ONE
  // address, so someone who starts on matchadb.com (no www) would come back from Google as a
  // stranger. Send every apex visit to www first.
  // The café map's data file changes only when the list is rebuilt.
  async headers() {
    return [{ source: "/data/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400" }] }];
  },
  // Languages: English keeps its plain URLs (/browse) and is served from the hidden /en/ folder; the other
  // languages are real prefixes (/ja/browse). Files in public/ and real route handlers (/api, /robots.txt, ...)
  // are matched before this rewrite, so it only ever sees page URLs.
  async rewrites() {
    return {
      // The topics pages live in research/by-topic internally (a folder called "topics" next to the dynamic
      // research/[id] route was matched wrongly in some languages); the public URLs stay /research/topics/...
      beforeFiles: [
        { source: "/research/topics/:path*", destination: "/en/research/by-topic/:path*" },
        { source: "/:lang(ja|ko|zh|es|fr|de)/research/topics/:path*", destination: "/:lang/research/by-topic/:path*" },
      ],
      afterFiles: [{ source: "/:path((?!(?:en|ja|ko|zh|es|fr|de)(?:/|$)).*)", destination: "/en/:path" }],
      fallback: [],
    };
  },
  async redirects() {
    return [
      { source: "/en", destination: "/", permanent: true },
      { source: "/en/:path*", destination: "/:path*", permanent: true },
      {
        source: "/:path*",
        has: [{ type: "host", value: "matchadb.com" }],
        destination: "https://www.matchadb.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
