import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The site lives at www.matchadb.com. Sign-in keeps its secret handshake in the browser for ONE
  // address, so someone who starts on matchadb.com (no www) would come back from Google as a
  // stranger. Send every apex visit to www first.
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
