import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The café pages read their state's data file at request time.
  outputFileTracingIncludes: { "/cafes/[slug]": ["./data/cafes/**/*"], "/sitemap.xml": ["./data/cafes/**/*"], "/cafes": ["./data/cafes/**/*"] },
  // The site lives at www.matchadb.com. Sign-in keeps its secret handshake in the browser for ONE
  // address, so someone who starts on matchadb.com (no www) would come back from Google as a
  // stranger. Send every apex visit to www first.
  // The café map's data file changes only when the list is rebuilt.
  async headers() {
    return [{ source: "/data/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400" }] }];
  },
  async redirects() {
    return [
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
